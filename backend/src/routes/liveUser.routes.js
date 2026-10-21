import { Router } from 'express';
import crypto from 'crypto';
import { pool } from '../db/pool.js';
import { fail } from '../utils/response.js';
import { requireAuth } from '../middleware/auth.js';
import { ensureWallet } from './wallet.routes.js';

const router = Router();
const uid = () => crypto.randomUUID();

// User: List live sessions (browse/lobby)
router.get('/live-sessions', requireAuth('user'), async (req, res) => {
  const { status, topic, language } = req.query;
  try {
    let q = `SELECT ls.*, a.display_name as astrologer_name, a.profile_photo_url
             FROM live_sessions ls JOIN astrologers a ON a.id = ls.astrologer_id
             WHERE ls.status IN ('scheduled','live') AND a.account_status='active' AND a.is_profile_public=true`;
    const params = [];
    let idx = 1;
    if (status) { q += ` AND ls.status=$${idx}`; params.push(status); idx++; }
    if (topic) { q += ` AND ls.topic ILIKE $${idx}`; params.push(`%${topic}%`); idx++; }
    if (language) { q += ` AND ls.language ILIKE $${idx}`; params.push(`%${language}%`); idx++; }
    q += ' ORDER BY ls.scheduled_start_at DESC LIMIT 50';
    const rows = await pool.query(q, params);
    res.json({ success: true, data: rows.rows.map(r => ({
      id: r.id, astrologerId: r.astrologer_id, astrologerName: r.astrologer_name,
      title: r.title, description: r.description, topic: r.topic, language: r.language,
      audienceType: r.audience_type, entryType: r.entry_type, entryPrice: parseFloat(r.entry_price),
      questionMode: r.question_mode, questionPrice: parseFloat(r.question_price),
      maxQuestionSlots: r.max_question_slots, soldQuestionSlots: r.sold_question_slots,
      scheduledStartAt: r.scheduled_start_at, status: r.status, viewerCount: r.viewer_count
    }))});
  } catch (err) { fail(res, 'Failed to fetch live sessions.', 500); }
});

// User: Get live session details
router.get('/live-sessions/:sessionId', requireAuth('user'), async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT ls.*, a.display_name as astrologer_name, a.profile_photo_url, a.experience_years, a.average_rating
       FROM live_sessions ls JOIN astrologers a ON a.id = ls.astrologer_id WHERE ls.id=$1`,
      [req.params.sessionId]);
    if (!r.rows.length) return fail(res, 'Session not found.', 404);
    const s = r.rows[0];

    // Check user access
    const access = await pool.query(
      "SELECT access_type,access_status FROM live_session_access WHERE live_session_id=$1 AND user_id=$2",
      [s.id, req.auth.sub]);
    const userAccess = access.rows[0] || null;

    // Check follow/subscribe status
    const [followRes, subRes] = await Promise.all([
      pool.query("SELECT status FROM user_follows WHERE user_id=$1 AND astrologer_id=$2", [req.auth.sub, s.astrologer_id]),
      pool.query("SELECT status FROM user_subscriptions WHERE user_id=$1 AND astrologer_id=$2 AND status='active'", [req.auth.sub, s.astrologer_id])
    ]);

    res.json({ success: true, data: {
      id: s.id, astrologerId: s.astrologer_id, astrologerName: s.astrologer_name,
      title: s.title, description: s.description, topic: s.topic, language: s.language,
      audienceType: s.audience_type, entryType: s.entry_type, entryPrice: parseFloat(s.entry_price),
      questionMode: s.question_mode, questionPrice: parseFloat(s.question_price),
      maxQuestionSlots: s.max_question_slots, soldQuestionSlots: s.sold_question_slots,
      scheduledStartAt: s.scheduled_start_at, actualStartAt: s.actual_start_at,
      status: s.status, streamRoomId: s.stream_room_id, viewerCount: s.viewer_count,
      isFollowing: followRes.rows.length > 0 && followRes.rows[0].status === 'active',
      isSubscribed: subRes.rows.length > 0,
      userAccess: userAccess ? { accessType: userAccess.access_type, accessStatus: userAccess.access_status } : null
    }});
  } catch (err) { fail(res, 'Failed to fetch session.', 500); }
});

// User: Check live access
router.get('/live-sessions/:sessionId/access-check', requireAuth('user'), async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM live_sessions WHERE id=$1', [req.params.sessionId]);
    if (!r.rows.length) return fail(res, 'Session not found.', 404);
    const s = r.rows[0];

    if (s.status === 'draft' || s.status === 'cancelled') return res.json({ success: true, data: { canJoin: false, reason: 'Session is not available.', requiredAction: null } });
    if (s.status === 'ended') return res.json({ success: true, data: { canJoin: false, reason: 'This live session has ended.', requiredAction: null } });

    // Check existing access
    const access = await pool.query(
      "SELECT access_type,access_status FROM live_session_access WHERE live_session_id=$1 AND user_id=$2",
      [s.id, req.auth.sub]);
    if (access.rows.length && access.rows[0].access_status === 'active') {
      return res.json({ success: true, data: { canJoin: true, reason: 'Already granted access.', requiredAction: null, accessType: access.rows[0].access_type } });
    }

    // Public free
    if (s.entry_type === 'free' && s.audience_type === 'public') {
      return res.json({ success: true, data: { canJoin: true, reason: 'Free public live.', requiredAction: null } });
    }

    // Follower required
    if (s.audience_type === 'followers_only' || s.entry_type === 'follower_required') {
      const follow = await pool.query("SELECT status FROM user_follows WHERE user_id=$1 AND astrologer_id=$2 AND status='active'", [req.auth.sub, s.astrologer_id]);
      if (!follow.rows.length) return res.json({ success: true, data: { canJoin: false, reason: 'You must follow this astrologer.', requiredAction: 'follow', redirectTo: `/user/astrologers/${s.astrologer_id}` } });
      return res.json({ success: true, data: { canJoin: true, reason: 'Follower access granted.', requiredAction: null } });
    }

    // Subscriber required
    if (s.audience_type === 'subscribers_only' || s.entry_type === 'subscription_required') {
      const sub = await pool.query("SELECT status FROM user_subscriptions WHERE user_id=$1 AND astrologer_id=$2 AND status='active'", [req.auth.sub, s.astrologer_id]);
      if (!sub.rows.length) return res.json({ success: true, data: { canJoin: false, reason: 'You must subscribe to this astrologer.', requiredAction: 'subscribe', redirectTo: `/user/subscriptions/${s.astrologer_id}/subscribe` } });
      return res.json({ success: true, data: { canJoin: true, reason: 'Subscriber access granted.', requiredAction: null } });
    }

    // Paid
    if (s.entry_type === 'paid') {
      const paid = await pool.query(
        "SELECT access_type FROM live_session_access WHERE live_session_id=$1 AND user_id=$2 AND access_type='paid' AND access_status='active'",
        [s.id, req.auth.sub]);
      if (paid.rows.length) return res.json({ success: true, data: { canJoin: true, reason: 'Paid access confirmed.', requiredAction: null } });
      return res.json({ success: true, data: { canJoin: false, reason: `Payment required: ₹${s.entry_price}`, requiredAction: 'pay_entry', amount: parseFloat(s.entry_price) } });
    }

    return res.json({ success: true, data: { canJoin: true, reason: 'Access granted.', requiredAction: null } });
  } catch (err) { fail(res, 'Failed to check access.', 500); }
});

// User: Pay for paid live entry
router.post('/live-sessions/:sessionId/pay-entry', requireAuth('user'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const r = await client.query('SELECT * FROM live_sessions WHERE id=$1', [req.params.sessionId]);
    if (!r.rows.length) { await client.query('ROLLBACK'); return fail(res, 'Session not found.', 404); }
    const s = r.rows[0];
    if (s.entry_type !== 'paid') { await client.query('ROLLBACK'); return fail(res, 'This session is not a paid live.'); }
    if (s.status !== 'scheduled' && s.status !== 'live') { await client.query('ROLLBACK'); return fail(res, 'Session is not available.'); }

    // Check existing access
    const existing = await client.query(
      "SELECT id FROM live_session_access WHERE live_session_id=$1 AND user_id=$2 AND access_type='paid' AND access_status='active'",
      [s.id, req.auth.sub]);
    if (existing.rows.length) { await client.query('ROLLBACK'); return res.json({ success: true, message: 'Already paid.' }); }

    const wallet = await ensureWallet(client, req.auth.sub, 'user');
    if (parseFloat(wallet.available_balance) < parseFloat(s.entry_price)) {
      await client.query('ROLLBACK');
      return fail(res, 'Insufficient wallet balance.');
    }

    const price = parseFloat(s.entry_price);
    // Deduct from wallet
    await client.query('UPDATE wallet_accounts SET available_balance=available_balance-$1,hold_balance=hold_balance+$1,updated_at=NOW() WHERE id=$2', [price, wallet.id]);
    await client.query(
      "INSERT INTO wallet_transactions (wallet_id,owner_type,owner_id,transaction_type,service_type,amount,status,description) VALUES ($1,'user',$2,'payment','paid_live_entry',$3,'completed',$4)",
      [wallet.id, req.auth.sub, price, `Paid live entry: ${s.title}`]);

    // Create payment record
    const paymentId = uid();
    await client.query(
      "INSERT INTO payments (id,user_id,astrologer_id,service_type,service_id,amount,payment_status,escrow_status) VALUES ($1,$2,$3,'paid_live_entry',$4,$5,'completed','not_required')",
      [paymentId, req.auth.sub, s.astrologer_id, s.id, price]);

    // Grant access
    await client.query(
      "INSERT INTO live_session_access (live_session_id,user_id,access_type,payment_id,access_status) VALUES ($1,$2,'paid',$3,'active') ON CONFLICT (live_session_id,user_id) DO UPDATE SET access_status='active',payment_id=$3",
      [s.id, req.auth.sub, paymentId]);

    await client.query("INSERT INTO live_session_events (live_session_id,actor_type,actor_id,event_type,metadata) VALUES ($1,'user',$2,'payment_success',$3)",
      [s.id, req.auth.sub, JSON.stringify({ paymentId, amount: price })]);
    await client.query('COMMIT');
    res.json({ success: true, message: 'Payment successful. Access granted.', data: { paymentId, accessType: 'paid' } });
  } catch (err) { await client.query('ROLLBACK'); fail(res, 'Payment failed.', 500); }
  finally { client.release(); }
});

// User: Join live session
router.post('/live-sessions/:sessionId/join', requireAuth('user'), async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM live_sessions WHERE id=$1', [req.params.sessionId]);
    if (!r.rows.length) return fail(res, 'Session not found.', 404);
    const s = r.rows[0];
    if (s.status === 'ended' || s.status === 'cancelled') return fail(res, 'Session is not available.');

    // Check access
    const access = await pool.query(
      "SELECT id,access_type FROM live_session_access WHERE live_session_id=$1 AND user_id=$2 AND access_status='active'",
      [s.id, req.auth.sub]);

    // Auto-grant for free public
    if (!access.rows.length && s.entry_type === 'free' && s.audience_type === 'public') {
      await pool.query(
        "INSERT INTO live_session_access (live_session_id,user_id,access_type,access_status,joined_at) VALUES ($1,$2,'free','active',NOW()) ON CONFLICT (live_session_id,user_id) DO UPDATE SET joined_at=NOW()",
        [s.id, req.auth.sub]);
    } else if (!access.rows.length) {
      return fail(res, 'Access not granted. Please check access requirements.');
    }

    // Update join time
    await pool.query("UPDATE live_session_access SET joined_at=NOW() WHERE live_session_id=$1 AND user_id=$2", [s.id, req.auth.sub]);
    // Increment viewer count
    await pool.query("UPDATE live_sessions SET viewer_count=viewer_count+1,updated_at=NOW() WHERE id=$1", [s.id]);
    await pool.query("INSERT INTO live_session_events (live_session_id,actor_type,actor_id,event_type) VALUES ($1,'user',$2,'user_joined')",
      [s.id, req.auth.sub]);

    res.json({ success: true, message: 'Joined live session.', data: { liveSessionId: s.id, streamRoomId: s.stream_room_id, status: s.status } });
  } catch (err) { fail(res, 'Failed to join.', 500); }
});

// User: Purchase live question slot
router.post('/live-sessions/:sessionId/questions/purchase', requireAuth('user'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const r = await client.query('SELECT * FROM live_sessions WHERE id=$1', [req.params.sessionId]);
    if (!r.rows.length) { await client.query('ROLLBACK'); return fail(res, 'Session not found.', 404); }
    const s = r.rows[0];
    if (s.question_mode !== 'paid_question_slots') { await client.query('ROLLBACK'); return fail(res, 'Paid questions not enabled for this session.'); }
    if (s.sold_question_slots >= s.max_question_slots) { await client.query('ROLLBACK'); return fail(res, 'No question slots available.'); }

    // Check if user already purchased
    const existing = await client.query(
      "SELECT id FROM live_questions WHERE live_session_id=$1 AND user_id=$2 AND status NOT IN ('refunded','cancelled')",
      [s.id, req.auth.sub]);
    if (existing.rows.length) { await client.query('ROLLBACK'); return fail(res, 'You already have a question slot.'); }

    const wallet = await ensureWallet(client, req.auth.sub, 'user');
    const price = parseFloat(s.question_price);
    if (parseFloat(wallet.available_balance) < price) {
      await client.query('ROLLBACK');
      return fail(res, 'Insufficient wallet balance.');
    }

    // Deduct wallet
    await client.query('UPDATE wallet_accounts SET available_balance=available_balance-$1,hold_balance=hold_balance+$1,updated_at=NOW() WHERE id=$2', [price, wallet.id]);
    await client.query(
      "INSERT INTO wallet_transactions (wallet_id,owner_type,owner_id,transaction_type,service_type,amount,status,description) VALUES ($1,'user',$2,'payment','paid_live_question',$3,'completed',$4)",
      [wallet.id, req.auth.sub, price, `Live question slot: ${s.title}`]);

    // Create payment with escrow
    const paymentId = uid();
    const commission = Math.round(price * 0.20 * 100) / 100;
    await client.query(
      "INSERT INTO payments (id,user_id,astrologer_id,service_type,service_id,amount,payment_status,escrow_status) VALUES ($1,$2,$3,'paid_live_question',$4,$5,'completed','held')",
      [paymentId, req.auth.sub, s.astrologer_id, s.id, price]);
    await client.query(
      "INSERT INTO escrow_records (user_id,astrologer_id,service_type,service_id,gross_amount,platform_commission,astrologer_amount,status) VALUES ($1,$2,'paid_live_question',$3,$4,$5,$6,'held')",
      [req.auth.sub, s.astrologer_id, paymentId, price, commission, price - commission]);

    // Reserve slot
    await client.query('UPDATE live_sessions SET sold_question_slots=sold_question_slots+1,updated_at=NOW() WHERE id=$1', [s.id]);

    // Create live question record
    const qId = uid();
    await client.query(
      "INSERT INTO live_questions (id,live_session_id,user_id,astrologer_id,payment_id,status) VALUES ($1,$2,$3,$4,$5,'paid')",
      [qId, s.id, req.auth.sub, s.astrologer_id, paymentId]);

    await client.query("INSERT INTO live_session_events (live_session_id,actor_type,actor_id,event_type,metadata) VALUES ($1,'user',$2,'question_purchased',$3)",
      [s.id, req.auth.sub, JSON.stringify({ questionId: qId, paymentId, amount: price })]);
    await client.query('COMMIT');
    res.json({ success: true, message: 'Live question slot purchased.', data: { questionId: qId, paymentId, purchaseStatus: 'paid', escrowStatus: 'held', slotsRemaining: s.max_question_slots - s.sold_question_slots - 1 } });
  } catch (err) { await client.query('ROLLBACK'); fail(res, 'Purchase failed.', 500); }
  finally { client.release(); }
});

// User: Submit live question
router.post('/live-sessions/:sessionId/questions', requireAuth('user'), async (req, res) => {
  const { questionType, category, questionText } = req.body;
  if (!category || !questionText) return fail(res, 'Category and question text are required.');
  try {
    const r = await pool.query('SELECT * FROM live_sessions WHERE id=$1', [req.params.sessionId]);
    if (!r.rows.length) return fail(res, 'Session not found.', 404);
    const s = r.rows[0];

    // Check access
    const access = await pool.query(
      "SELECT id FROM live_session_access WHERE live_session_id=$1 AND user_id=$2 AND access_status='active'",
      [s.id, req.auth.sub]);
    if (!access.rows.length) return fail(res, 'You must join the live session first.');

    // Check question slot if paid
    if (s.question_mode === 'paid_question_slots') {
      const q = await pool.query(
        "SELECT id FROM live_questions WHERE live_session_id=$1 AND user_id=$2 AND status IN ('paid','submitted')",
        [s.id, req.auth.sub]);
      if (!q.rows.length) return fail(res, 'Purchase a question slot first.');
    }

    // Find or create question record
    let questionId;
    const existing = await pool.query(
      "SELECT id FROM live_questions WHERE live_session_id=$1 AND user_id=$2 AND status IN ('paid','submitted')",
      [s.id, req.auth.sub]);
    if (existing.rows.length) {
      questionId = existing.rows[0].id;
      await pool.query(
        "UPDATE live_questions SET question_type=$1,category=$2,question_text=$3,status='submitted',updated_at=NOW() WHERE id=$4",
        [questionType || 'general', category, questionText, questionId]);
    } else if (s.question_mode === 'free_questions') {
      questionId = uid();
      await pool.query(
        "INSERT INTO live_questions (id,live_session_id,user_id,astrologer_id,question_type,category,question_text,status) VALUES ($1,$2,$3,$4,$5,$6,$7,'submitted')",
        [questionId, s.id, req.auth.sub, s.astrologer_id, questionType || 'general', category, questionText]);
    } else {
      return fail(res, 'No question slot available.');
    }

    // Assign queue position
    const count = await pool.query("SELECT COUNT(*) as cnt FROM live_questions WHERE live_session_id=$1 AND status IN ('submitted','queued','answering')", [s.id]);
    const pos = parseInt(count.rows[0].cnt);
    await pool.query("UPDATE live_questions SET queue_position=$1,status='queued',updated_at=NOW() WHERE id=$2 AND status='submitted'", [pos, questionId]);

    await pool.query("INSERT INTO live_session_events (live_session_id,actor_type,actor_id,event_type,metadata) VALUES ($1,'user',$2,'question_submitted',$3)",
      [s.id, req.auth.sub, JSON.stringify({ questionId, queuePosition: pos })]);
    res.json({ success: true, message: 'Question submitted.', data: { questionId, status: 'queued', queuePosition: pos } });
  } catch (err) { fail(res, 'Failed to submit question.', 500); }
});

// User: Get my live question status
router.get('/live-sessions/:sessionId/my-question', requireAuth('user'), async (req, res) => {
  try {
    const r = await pool.query(
      "SELECT * FROM live_questions WHERE live_session_id=$1 AND user_id=$2 ORDER BY created_at DESC LIMIT 1",
      [req.params.sessionId, req.auth.sub]);
    if (!r.rows.length) return res.json({ success: true, data: null });
    const q = r.rows[0];
    res.json({ success: true, data: {
      id: q.id, questionType: q.question_type, category: q.category, questionText: q.question_text,
      queuePosition: q.queue_position, status: q.status, answeredAt: q.answered_at, createdAt: q.created_at
    }});
  } catch (err) { fail(res, 'Failed to fetch question.', 500); }
});

// User: Get chat messages for live session
router.get('/live-sessions/:sessionId/chat', requireAuth('user'), async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT lcm.*, CASE WHEN lcm.sender_type='astrologer' THEN a.display_name ELSE u.full_name END as sender_name
       FROM live_chat_messages lcm
       LEFT JOIN astrologers a ON a.id = lcm.sender_id AND lcm.sender_type='astrologer'
       LEFT JOIN users u ON u.id = lcm.sender_id AND lcm.sender_type='user'
       WHERE lcm.live_session_id=$1 AND lcm.status='visible'
       ORDER BY lcm.created_at DESC LIMIT 100`,
      [req.params.sessionId]);
    res.json({ success: true, data: r.rows.reverse().map(m => ({
      id: m.id, senderType: m.sender_type, senderId: m.sender_id, senderName: m.sender_name,
      message: m.message, createdAt: m.created_at
    }))});
  } catch (err) { fail(res, 'Failed to fetch chat.', 500); }
});

// User: Send chat message
router.post('/live-sessions/:sessionId/chat', requireAuth('user'), async (req, res) => {
  const { message } = req.body;
  if (!message || !message.trim()) return fail(res, 'Message is required.');
  try {
    // Check access
    const access = await pool.query(
      "SELECT id FROM live_session_access WHERE live_session_id=$1 AND user_id=$2 AND access_status='active'",
      [req.params.sessionId, req.auth.sub]);
    if (!access.rows.length) return fail(res, 'Join the live session first.');

    const id = uid();
    await pool.query(
      "INSERT INTO live_chat_messages (id,live_session_id,sender_type,sender_id,message) VALUES ($1,$2,'user',$3,$4)",
      [id, req.params.sessionId, req.auth.sub, message.trim()]);
    res.status(201).json({ success: true, data: { messageId: id } });
  } catch (err) { fail(res, 'Failed to send message.', 500); }
});

export default router;
