import { Router } from 'express';
import crypto from 'crypto';
import { pool } from '../db/pool.js';
import { fail } from '../utils/response.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const uid = () => crypto.randomUUID();

const VALID_CALL_TYPES = ['audio', 'video'];
const VALID_STATUSES = [
  'requested', 'pending_payment', 'paid', 'accepted', 'rejected',
  'in_progress', 'completed', 'cancelled_by_user', 'cancelled_by_astrologer', 'expired', 'no_show'
];

function calcPriority(isSubscriber) {
  return isSubscriber ? 100 : 0;
}

// ═══════════════════════════════════════════════════════════════════════════
// USER ROUTES
// ═══════════════════════════════════════════════════════════════════════════

// Request an emergency call
router.post('/user/emergency', requireAuth('user'), async (req, res) => {
  const { astrologerId, callType, urgencyNote } = req.body;
  if (!astrologerId) return fail(res, 'Astrologer ID is required.');
  const ct = VALID_CALL_TYPES.includes(callType) ? callType : 'audio';
  try {
    const astroCheck = await pool.query(
      "SELECT id,display_name FROM astrologers WHERE id=$1 AND account_status='active'",
      [astrologerId]
    );
    if (!astroCheck.rows.length) return fail(res, 'Astrologer not found or inactive.', 404);

    const serviceCheck = await pool.query(
      'SELECT emergency_available FROM astrologer_service_status WHERE astrologer_id=$1',
      [astrologerId]
    );
    if (!serviceCheck.rows.length || !serviceCheck.rows[0].emergency_available)
      return fail(res, 'This astrologer is not accepting emergency calls right now.');

    const activeReq = await pool.query(
      "SELECT id FROM emergency_requests WHERE user_id=$1 AND status IN ('requested','pending_payment','paid','accepted','in_progress')",
      [req.auth.sub]
    );
    if (activeReq.rows.length)
      return fail(res, 'You already have an active emergency request. Please wait for it to complete.');

    const subCheck = await pool.query(
      "SELECT id FROM user_subscriptions WHERE user_id=$1 AND astrologer_id=$2 AND status='active' AND expires_at > NOW()",
      [req.auth.sub, astrologerId]
    );
    const isSubscriber = subCheck.rows.length > 0;

    const rateResult = await pool.query(
      `SELECT emergency_audio_rate, emergency_video_rate FROM astrologer_rates WHERE astrologer_id=$1`,
      [astrologerId]
    );
    const rate = rateResult.rows[0];
    let price = 0;
    if (rate) {
      price = ct === 'video' ? parseFloat(rate.emergency_video_rate || 0) : parseFloat(rate.emergency_audio_rate || 0);
    }
    if (price === 0) {
      const svcResult = await pool.query(
        'SELECT starting_call_price FROM astrologer_service_status WHERE astrologer_id=$1',
        [astrologerId]
      );
      price = parseFloat(svcResult.rows[0]?.starting_call_price || 500);
      if (ct === 'video') price = Math.round(price * 1.5);
    }

    const requestId = uid();
    await pool.query(
      `INSERT INTO emergency_requests (id,user_id,astrologer_id,call_type,status,is_subscriber,priority_score,urgency_note,price_charged,payment_status)
       VALUES ($1,$2,$3,$4,'requested',$5,$6,$7,$8,'pending')`,
      [requestId, req.auth.sub, astrologerId, ct, isSubscriber, calcPriority(isSubscriber), urgencyNote || null, price]
    );

    res.status(201).json({
      success: true, message: 'Emergency call request created.',
      data: { requestId, callType: ct, price, isSubscriber, priority: isSubscriber ? 'Subscriber Priority' : 'Standard' }
    });
  } catch (err) {
    console.error('Create emergency request error:', err);
    fail(res, 'Failed to create emergency request.', 500);
  }
});

// Pay for emergency call
router.post('/user/emergency/:requestId/pay', requireAuth('user'), async (req, res) => {
  try {
    const eres = await pool.query(
      "SELECT * FROM emergency_requests WHERE id=$1 AND user_id=$2 AND status='requested' AND payment_status='pending'",
      [req.params.requestId, req.auth.sub]
    );
    if (!eres.rows.length) return fail(res, 'Emergency request not found or not payable.', 404);
    const er = eres.rows[0];

    const walletResult = await pool.query(
      "SELECT id,available_balance FROM wallet_accounts WHERE owner_type='user' AND owner_id=$1",
      [req.auth.sub]
    );
    const wallet = walletResult.rows[0];
    if (!wallet || parseFloat(wallet.available_balance) < parseFloat(er.price_charged))
      return fail(res, 'Insufficient wallet balance. Please top up.', 400);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('UPDATE wallet_accounts SET available_balance=available_balance-$1 WHERE id=$2', [er.price_charged, wallet.id]);
      await client.query(
        `INSERT INTO wallet_transactions (wallet_id,owner_type,owner_id,transaction_type,service_type,service_id,amount,status,description)
         VALUES ($1,'user',$2,'debit','emergency_call',$3,$4,'completed','Emergency call payment')`,
        [wallet.id, req.auth.sub, er.id, er.price_charged]
      );
      await client.query(
        "UPDATE emergency_requests SET status='pending_payment',payment_status='paid',payment_id=gen_random_uuid(),updated_at=NOW() WHERE id=$1",
        [er.id]
      );
      await client.query('COMMIT');
      res.json({ success: true, message: 'Payment successful. Waiting for astrologer to accept.' });
    } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
  } catch (err) {
    console.error('Emergency pay error:', err);
    fail(res, 'Failed to process payment.', 500);
  }
});

// List my emergency requests
router.get('/user/emergency', requireAuth('user'), async (req, res) => {
  const { status } = req.query;
  try {
    let query = `SELECT er.*, a.display_name as astrologer_name, a.city as astrologer_city
                 FROM emergency_requests er
                 JOIN astrologers a ON a.id = er.astrologer_id
                 WHERE er.user_id=$1`;
    const params = [req.auth.sub];
    let idx = 2;
    if (status) { query += ` AND er.status=$${idx++}`; params.push(status); }
    query += ` ORDER BY er.created_at DESC`;
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows.map(r => ({
      id: r.id, astrologerId: r.astrologer_id, astrologerName: r.astrologer_name,
      astrologerCity: r.astrologer_city, callType: r.call_type, status: r.status,
      isSubscriber: r.is_subscriber, priorityScore: r.priority_score, urgencyNote: r.urgency_note,
      priceCharged: r.price_charged, paymentStatus: r.payment_status,
      astrologerResponse: r.astrologer_response, rejectionReason: r.rejection_reason,
      acceptedAt: r.accepted_at, startedAt: r.started_at, endedAt: r.ended_at,
      createdAt: r.created_at
    }))});
  } catch (err) {
    console.error('List user emergency error:', err);
    fail(res, 'Failed to fetch emergency requests.', 500);
  }
});

// Cancel emergency request (user)
router.patch('/user/emergency/:requestId/cancel', requireAuth('user'), async (req, res) => {
  const { reason } = req.body;
  try {
    const eres = await pool.query(
      "SELECT * FROM emergency_requests WHERE id=$1 AND user_id=$2 AND status IN ('requested','pending_payment')",
      [req.params.requestId, req.auth.sub]
    );
    if (!eres.rows.length) return fail(res, 'Request not found or cannot be cancelled.', 404);
    const er = eres.rows[0];

    if (er.payment_status === 'paid' && parseFloat(er.price_charged) > 0) {
      const walletResult = await pool.query("SELECT id FROM wallet_accounts WHERE owner_type='user' AND owner_id=$1", [req.auth.sub]);
      if (walletResult.rows.length) {
        await pool.query('UPDATE wallet_accounts SET available_balance=available_balance+$1 WHERE id=$2', [er.price_charged, walletResult.rows[0].id]);
        await pool.query(
          `INSERT INTO wallet_transactions (wallet_id,owner_type,owner_id,transaction_type,service_type,service_id,amount,status,description)
           VALUES ($1,'user',$2,'credit','emergency_refund',$3,$4,'completed','Emergency call cancellation refund')`,
          [walletResult.rows[0].id, req.auth.sub, er.id, er.price_charged]
        );
      }
    }
    await pool.query(
      "UPDATE emergency_requests SET status='cancelled_by_user',cancelled_at=NOW(),cancelled_by='user',cancellation_reason=$1,updated_at=NOW() WHERE id=$2",
      [reason || 'User cancelled', er.id]
    );
    res.json({ success: true, message: 'Emergency request cancelled.' });
  } catch (err) {
    console.error('Cancel emergency error:', err);
    fail(res, 'Failed to cancel request.', 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ASTROLOGER ROUTES
// ═══════════════════════════════════════════════════════════════════════════

// Toggle emergency availability
router.patch('/astrologer/emergency/toggle', requireAuth('astrologer'), async (req, res) => {
  const { available } = req.body;
  try {
    await pool.query(
      'UPDATE astrologer_service_status SET emergency_available=$1,updated_at=NOW() WHERE astrologer_id=$2',
      [!!available, req.auth.sub]
    );
    res.json({ success: true, data: { emergencyAvailable: !!available }, message: `Emergency calls ${available ? 'enabled' : 'disabled'}.` });
  } catch (err) {
    fail(res, 'Failed to toggle emergency availability.', 500);
  }
});

// List emergency requests for astrologer
router.get('/astrologer/emergency', requireAuth('astrologer'), async (req, res) => {
  const { status } = req.query;
  try {
    let query = `SELECT er.*, u.full_name as user_name, u.mobile as user_mobile,
                        (SELECT EXISTS(SELECT 1 FROM user_subscriptions WHERE user_id=er.user_id AND astrologer_id=er.astrologer_id AND status='active' AND expires_at > NOW())) as is_current_subscriber
                 FROM emergency_requests er
                 JOIN users u ON u.id = er.user_id
                 WHERE er.astrologer_id=$1`;
    const params = [req.auth.sub];
    let idx = 2;
    if (status) { query += ` AND er.status=$${idx++}`; params.push(status); }
    query += ` ORDER BY er.priority_score DESC, er.created_at ASC`;
    const result = await pool.query(query, params);

    const summaryResult = await pool.query(
      "SELECT status, COUNT(*)::int as count FROM emergency_requests WHERE astrologer_id=$1 GROUP BY status",
      [req.auth.sub]
    );
    const summary = {};
    summaryResult.rows.forEach(r => { summary[r.status] = r.count; });

    const svcResult = await pool.query(
      'SELECT emergency_available FROM astrologer_service_status WHERE astrologer_id=$1',
      [req.auth.sub]
    );

    res.json({ success: true, data: {
      requests: result.rows.map(r => ({
        id: r.id, userId: r.user_id, userName: r.user_name, userMobile: r.user_mobile,
        callType: r.call_type, status: r.status, isSubscriber: r.is_current_subscriber,
        priorityScore: r.priority_score, urgencyNote: r.urgency_note,
        priceCharged: r.price_charged, paymentStatus: r.payment_status,
        astrologerResponse: r.astrologer_response, rejectionReason: r.rejection_reason,
        acceptedAt: r.accepted_at, startedAt: r.started_at, endedAt: r.ended_at,
        createdAt: r.created_at
      })),
      summary,
      emergencyAvailable: svcResult.rows[0]?.emergency_available || false
    }});
  } catch (err) {
    console.error('List astrologer emergency error:', err);
    fail(res, 'Failed to fetch emergency requests.', 500);
  }
});

// Astrologer accepts emergency request
router.patch('/astrologer/emergency/:requestId/accept', requireAuth('astrologer'), async (req, res) => {
  try {
    const eres = await pool.query(
      "SELECT * FROM emergency_requests WHERE id=$1 AND astrologer_id=$2 AND status IN ('pending_payment','paid')",
      [req.params.requestId, req.auth.sub]
    );
    if (!eres.rows.length) return fail(res, 'Request not found or not acceptabable.', 404);
    const er = eres.rows[0];

    const roomId = `emer-${crypto.randomUUID().slice(0, 8)}`;
    await pool.query(
      "UPDATE emergency_requests SET status='accepted',accepted_at=NOW(),updated_at=NOW() WHERE id=$1",
      [er.id]
    );
    const csResult = await pool.query(
      `INSERT INTO call_sessions (user_id,astrologer_id,emergency_request_id,call_type,status,provider_channel_id)
       VALUES ($1,$2,$3,$4,'created',$5) RETURNING id`,
      [er.user_id, er.astrologer_id, er.id, er.call_type, roomId]
    );

    res.json({ success: true, message: 'Emergency call accepted.', data: { callSessionId: csResult.rows[0].id, callRoomId: roomId } });
  } catch (err) {
    console.error('Accept emergency error:', err);
    fail(res, 'Failed to accept request.', 500);
  }
});

// Astrologer rejects emergency request
router.patch('/astrologer/emergency/:requestId/reject', requireAuth('astrologer'), async (req, res) => {
  const { reason } = req.body;
  try {
    const eres = await pool.query(
      "SELECT * FROM emergency_requests WHERE id=$1 AND astrologer_id=$2 AND status IN ('pending_payment','paid')",
      [req.params.requestId, req.auth.sub]
    );
    if (!eres.rows.length) return fail(res, 'Request not found or not rejectable.', 404);
    const er = eres.rows[0];

    if (er.payment_status === 'paid' && parseFloat(er.price_charged) > 0) {
      const walletResult = await pool.query("SELECT id FROM wallet_accounts WHERE owner_type='user' AND owner_id=$1", [er.user_id]);
      if (walletResult.rows.length) {
        await pool.query('UPDATE wallet_accounts SET available_balance=available_balance+$1 WHERE id=$2', [er.price_charged, walletResult.rows[0].id]);
        await pool.query(
          `INSERT INTO wallet_transactions (wallet_id,owner_type,owner_id,transaction_type,service_type,service_id,amount,status,description)
           VALUES ($1,'user',$2,'credit','emergency_refund',$3,$4,'completed','Emergency call rejected - refund')`,
          [walletResult.rows[0].id, er.user_id, er.id, er.price_charged]
        );
      }
    }
    await pool.query(
      "UPDATE emergency_requests SET status='rejected',rejection_reason=$1,updated_at=NOW() WHERE id=$2",
      [reason || 'Astrologer unavailable', er.id]
    );
    res.json({ success: true, message: 'Request rejected. User has been refunded.' });
  } catch (err) {
    console.error('Reject emergency error:', err);
    fail(res, 'Failed to reject request.', 500);
  }
});

// Start emergency call
router.patch('/astrologer/emergency/:requestId/start', requireAuth('astrologer'), async (req, res) => {
  try {
    const eres = await pool.query(
      "SELECT * FROM emergency_requests WHERE id=$1 AND astrologer_id=$2 AND status='accepted'",
      [req.params.requestId, req.auth.sub]
    );
    if (!eres.rows.length) return fail(res, 'Request not found or not ready to start.', 404);
    const er = eres.rows[0];

    await pool.query(
      "UPDATE emergency_requests SET status='in_progress',started_at=NOW(),updated_at=NOW() WHERE id=$1",
      [er.id]
    );
    await pool.query(
      "UPDATE call_sessions SET status='in_progress',started_at=NOW() WHERE emergency_request_id=$1 AND status='created'",
      [er.id]
    );
    res.json({ success: true, message: 'Emergency call started.' });
  } catch (err) {
    fail(res, 'Failed to start call.', 500);
  }
});

// End emergency call
router.patch('/astrologer/emergency/:requestId/end', requireAuth('astrologer'), async (req, res) => {
  try {
    const eres = await pool.query(
      "SELECT * FROM emergency_requests WHERE id=$1 AND astrologer_id=$2 AND status='in_progress'",
      [req.params.requestId, req.auth.sub]
    );
    if (!eres.rows.length) return fail(res, 'Request not found or not in progress.', 404);
    const er = eres.rows[0];

    await pool.query(
      "UPDATE emergency_requests SET status='completed',ended_at=NOW(),updated_at=NOW() WHERE id=$1",
      [er.id]
    );
    const csUpdate = await pool.query(
      "UPDATE call_sessions SET status='completed',ended_at=NOW(),duration_seconds=EXTRACT(EPOCH FROM (NOW()-started_at))::int WHERE emergency_request_id=$1 AND status='in_progress' RETURNING id,duration_seconds",
      [er.id]
    );

    if (er.payment_status === 'paid' && parseFloat(er.price_charged) > 0) {
      const commission = Math.round(parseFloat(er.price_charged) * 0.20 * 100) / 100;
      const astroEarning = parseFloat(er.price_charged) - commission;
      const astroWallet = await pool.query("SELECT id FROM wallet_accounts WHERE owner_type='astrologer' AND owner_id=$1", [er.astrologer_id]);
      if (astroWallet.rows.length) {
        await pool.query('UPDATE wallet_accounts SET available_balance=available_balance+$1 WHERE id=$2', [astroEarning, astroWallet.rows[0].id]);
        await pool.query(
          `INSERT INTO wallet_transactions (wallet_id,owner_type,owner_id,transaction_type,service_type,service_id,amount,status,description)
           VALUES ($1,'astrologer',$2,'credit','emergency_call_earning',$3,$4,'completed','Emergency call earning')`,
          [astroWallet.rows[0].id, er.astrologer_id, er.id, astroEarning]
        );
      }
    }

    res.json({ success: true, message: 'Call ended.', data: { durationSeconds: csUpdate.rows[0]?.duration_seconds || 0 } });
  } catch (err) {
    console.error('End emergency error:', err);
    fail(res, 'Failed to end call.', 500);
  }
});

// Update astrologer rates
router.put('/astrologer/rates', requireAuth('astrologer'), async (req, res) => {
  const { chatRatePerMinute, audioRatePerMinute, videoRatePerMinute, emergencyAudioRate, emergencyVideoRate, livePaidQuestionRate } = req.body;
  try {
    await pool.query(
      `INSERT INTO astrologer_rates (astrologer_id,chat_rate_per_minute,audio_rate_per_minute,video_rate_per_minute,emergency_audio_rate,emergency_video_rate,live_paid_question_rate)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (astrologer_id) DO UPDATE SET
         chat_rate_per_minute=COALESCE($2,astrologer_rates.chat_rate_per_minute),
         audio_rate_per_minute=COALESCE($3,astrologer_rates.audio_rate_per_minute),
         video_rate_per_minute=COALESCE($4,astrologer_rates.video_rate_per_minute),
         emergency_audio_rate=COALESCE($5,astrologer_rates.emergency_audio_rate),
         emergency_video_rate=COALESCE($6,astrologer_rates.emergency_video_rate),
         live_paid_question_rate=COALESCE($7,astrologer_rates.live_paid_question_rate),
         updated_at=NOW()`,
      [req.auth.sub, chatRatePerMinute, audioRatePerMinute, videoRatePerMinute, emergencyAudioRate, emergencyVideoRate, livePaidQuestionRate]
    );
    res.json({ success: true, message: 'Rates updated.' });
  } catch (err) {
    fail(res, 'Failed to update rates.', 500);
  }
});

// Get astrologer rates
router.get('/astrologer/rates', requireAuth('astrologer'), async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM astrologer_rates WHERE astrologer_id=$1', [req.auth.sub]);
    res.json({ success: true, data: result.rows[0] || null });
  } catch (err) {
    fail(res, 'Failed to fetch rates.', 500);
  }
});

export default router;
