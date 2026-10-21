import { Router } from 'express';
import crypto from 'crypto';
import { pool } from '../db/pool.js';
import { fail } from '../utils/response.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const uid = () => crypto.randomUUID();

// Astrologer: Create live session
router.post('/live-sessions', requireAuth('astrologer'), async (req, res) => {
  const { title, description, topic, language, audienceType, entryType, entryPrice, questionMode, questionPrice, maxQuestionSlots, scheduledStartAt, scheduledEndAt } = req.body;
  if (!title || !topic || !language || !scheduledStartAt) return fail(res, 'Title, topic, language, and scheduled start time are required.');
  if (!audienceType || !entryType) return fail(res, 'Audience type and entry type are required.');
  if (entryType === 'paid' && (!entryPrice || entryPrice <= 0)) return fail(res, 'Entry price is required for paid live.');
  if (questionMode === 'paid_question_slots' && (!questionPrice || questionPrice <= 0)) return fail(res, 'Question price is required for paid question slots.');
  if (new Date(scheduledStartAt) <= new Date()) return fail(res, 'Scheduled start time must be in the future.');
  try {
    const id = uid();
    const roomId = `room_${id.slice(0, 8)}`;
    const status = 'scheduled';
    await pool.query(
      `INSERT INTO live_sessions (id,astrologer_id,title,description,topic,language,audience_type,entry_type,entry_price,question_mode,question_price,max_question_slots,scheduled_start_at,scheduled_end_at,status,stream_room_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
      [id, req.auth.sub, title, description || null, topic, language, audienceType || 'public', entryType || 'free', entryPrice || 0, questionMode || 'no_questions', questionPrice || 0, maxQuestionSlots || 0, scheduledStartAt, scheduledEndAt || null, status, roomId]
    );
    await pool.query(
      "INSERT INTO live_session_events (live_session_id,actor_type,actor_id,event_type,metadata) VALUES ($1,'astrologer',$2,'live_created',$3)",
      [id, req.auth.sub, JSON.stringify({ title, topic })]);
    res.status(201).json({ success: true, message: 'Live session created.', data: { liveSessionId: id, status, streamRoomId: roomId } });
  } catch (err) { fail(res, 'Failed to create live session.', 500); }
});

// Astrologer: List own live sessions
router.get('/live-sessions', requireAuth('astrologer'), async (req, res) => {
  const { status } = req.query;
  try {
    let q = 'SELECT * FROM live_sessions WHERE astrologer_id=$1';
    const params = [req.auth.sub];
    if (status) { q += ' AND status=$2'; params.push(status); }
    q += ' ORDER BY scheduled_start_at DESC LIMIT 50';
    const rows = await pool.query(q, params);
    res.json({ success: true, data: rows.rows.map(r => ({
      id: r.id, title: r.title, description: r.description, topic: r.topic, language: r.language,
      audienceType: r.audience_type, entryType: r.entry_type, entryPrice: parseFloat(r.entry_price),
      questionMode: r.question_mode, questionPrice: parseFloat(r.question_price),
      maxQuestionSlots: r.max_question_slots, soldQuestionSlots: r.sold_question_slots,
      scheduledStartAt: r.scheduled_start_at, scheduledEndAt: r.scheduled_end_at,
      actualStartAt: r.actual_start_at, actualEndAt: r.actual_end_at,
      status: r.status, streamRoomId: r.stream_room_id, viewerCount: r.viewer_count,
      createdAt: r.created_at
    }))});
  } catch (err) { fail(res, 'Failed to fetch sessions.', 500); }
});

// Astrologer: Update live session
router.put('/live-sessions/:sessionId', requireAuth('astrologer'), async (req, res) => {
  const { title, description, topic, language, audienceType, entryType, entryPrice, questionMode, questionPrice, maxQuestionSlots, scheduledStartAt, scheduledEndAt } = req.body;
  try {
    const existing = await pool.query("SELECT * FROM live_sessions WHERE id=$1 AND astrologer_id=$2 AND status IN ('draft','scheduled')", [req.params.sessionId, req.auth.sub]);
    if (!existing.rows.length) return fail(res, 'Session not found or cannot be edited.', 404);
    await pool.query(
      `UPDATE live_sessions SET title=COALESCE($1,title),description=COALESCE($2,description),topic=COALESCE($3,topic),language=COALESCE($4,language),
       audience_type=COALESCE($5,audience_type),entry_type=COALESCE($6,entry_type),entry_price=COALESCE($7,entry_price),
       question_mode=COALESCE($8,question_mode),question_price=COALESCE($9,question_price),max_question_slots=COALESCE($10,max_question_slots),
       scheduled_start_at=COALESCE($11,scheduled_start_at),scheduled_end_at=COALESCE($12,scheduled_end_at),updated_at=NOW() WHERE id=$13`,
      [title, description, topic, language, audienceType, entryType, entryPrice, questionMode, questionPrice, maxQuestionSlots, scheduledStartAt, scheduledEndAt, req.params.sessionId]);
    res.json({ success: true, message: 'Session updated.' });
  } catch (err) { fail(res, 'Failed to update session.', 500); }
});

// Astrologer: Cancel live session
router.post('/live-sessions/:sessionId/cancel', requireAuth('astrologer'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query("SELECT * FROM live_sessions WHERE id=$1 AND astrologer_id=$2 AND status IN ('draft','scheduled')", [req.params.sessionId, req.auth.sub]);
    if (!existing.rows.length) { await client.query('ROLLBACK'); return fail(res, 'Session not found or cannot be cancelled.', 404); }
    const session = existing.rows[0];
    await client.query("UPDATE live_sessions SET status='cancelled',updated_at=NOW() WHERE id=$1", [session.id]);

    // Refund any paid users for entry
    const paidAccess = await client.query(
      "SELECT id,user_id FROM live_session_access WHERE live_session_id=$1 AND access_type='paid' AND access_status='active'", [session.id]);
    for (const a of paidAccess.rows) {
      const wallet = await client.query("SELECT id FROM wallet_accounts WHERE owner_type='user' AND owner_id=$1", [a.user_id]);
      if (wallet.rows.length) {
        await client.query("UPDATE wallet_accounts SET available_balance=available_balance+$1,updated_at=NOW() WHERE id=$2", [session.entry_price, wallet.rows[0].id]);
        await client.query(
          "INSERT INTO wallet_transactions (wallet_id,owner_type,owner_id,transaction_type,service_type,amount,status,description) VALUES ($1,'user',$2,'refund','paid_live_entry',$3,'completed',$4)",
          [wallet.rows[0].id, a.user_id, session.entry_price, `Refund: ${session.title} cancelled`]);
      }
      await client.query("UPDATE live_session_access SET access_status='refunded' WHERE id=$1", [a.id]);
    }

    // Refund unpaid live questions
    const unpaidQs = await client.query(
      "SELECT id FROM live_questions WHERE live_session_id=$1 AND status IN ('submitted','queued','payment_pending')", [session.id]);
    for (const q of unpaidQs.rows) {
      await client.query("UPDATE live_questions SET status='refunded' WHERE id=$1", [q.id]);
    }

    await client.query("INSERT INTO live_session_events (live_session_id,actor_type,actor_id,event_type,metadata) VALUES ($1,'astrologer',$2,'live_cancelled',$3)",
      [session.id, req.auth.sub, JSON.stringify({ reason: 'Cancelled by astrologer' })]);
    await client.query('COMMIT');
    res.json({ success: true, message: 'Session cancelled. Paid users will be refunded.' });
  } catch (err) { await client.query('ROLLBACK'); fail(res, 'Failed to cancel session.', 500); }
  finally { client.release(); }
});

// Astrologer: Start live session
router.post('/live-sessions/:sessionId/start', requireAuth('astrologer'), async (req, res) => {
  try {
    const r = await pool.query(
      "UPDATE live_sessions SET status='live',actual_start_at=NOW(),updated_at=NOW() WHERE id=$1 AND astrologer_id=$2 AND status='scheduled' RETURNING id,stream_room_id",
      [req.params.sessionId, req.auth.sub]);
    if (!r.rows.length) return fail(res, 'Session not found or cannot be started.', 404);
    await pool.query("INSERT INTO live_session_events (live_session_id,actor_type,actor_id,event_type) VALUES ($1,'astrologer',$2,'live_started')",
      [r.rows[0].id, req.auth.sub]);
    // Update astrologer live_now flag
    await pool.query("UPDATE astrologer_service_status SET live_now=true,updated_at=NOW() WHERE astrologer_id=$1", [req.auth.sub]);
    res.json({ success: true, message: 'Live session started.', data: { liveSessionId: r.rows[0].id, status: 'live', streamRoomId: r.rows[0].stream_room_id } });
  } catch (err) { fail(res, 'Failed to start session.', 500); }
});

// Astrologer: End live session
router.post('/live-sessions/:sessionId/end', requireAuth('astrologer'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const r = await client.query(
      "UPDATE live_sessions SET status='ended',actual_end_at=NOW(),updated_at=NOW() WHERE id=$1 AND astrologer_id=$2 AND status='live' RETURNING id,question_mode",
      [req.params.sessionId, req.auth.sub]);
    if (!r.rows.length) { await client.query('ROLLBACK'); return fail(res, 'Session not found or not live.', 404); }
    const session = r.rows[0];

    // Mark unanswered paid questions for refund
    if (session.question_mode === 'paid_question_slots') {
      const unanswered = await client.query(
        "UPDATE live_questions SET status='refunded',updated_at=NOW() WHERE live_session_id=$1 AND status IN ('submitted','queued','answering') RETURNING id,payment_id",
        [session.id]);
      for (const q of unanswered.rows) {
        if (q.payment_id) {
          const payRes = await client.query("SELECT user_id,amount FROM payments WHERE id=$1 AND escrow_status='held'", [q.payment_id]);
          if (payRes.rows.length) {
            const p = payRes.rows[0];
            const wallet = await client.query("SELECT id FROM wallet_accounts WHERE owner_type='user' AND owner_id=$1", [p.user_id]);
            if (wallet.rows.length) {
              await client.query("UPDATE wallet_accounts SET available_balance=available_balance+$1,hold_balance=hold_balance-$1,updated_at=NOW() WHERE id=$2", [p.amount, wallet.rows[0].id]);
              await client.query("INSERT INTO wallet_transactions (wallet_id,owner_type,owner_id,transaction_type,service_type,amount,status,description) VALUES ($1,'user',$2,'refund','paid_live_question',$3,'completed',$4)",
                [wallet.rows[0].id, p.user_id, p.amount, 'Refund: Live question not answered']);
            }
            await client.query("UPDATE payments SET payment_status='refunded',escrow_status='refunded',updated_at=NOW() WHERE id=$1", [q.payment_id]);
          }
        }
      }
    }

    await client.query("UPDATE astrologer_service_status SET live_now=false,updated_at=NOW() WHERE astrologer_id=$1", [req.auth.sub]);
    await client.query("INSERT INTO live_session_events (live_session_id,actor_type,actor_id,event_type) VALUES ($1,'astrologer',$2,'live_ended')",
      [session.id, req.auth.sub]);
    await client.query('COMMIT');
    res.json({ success: true, message: 'Live session ended.' });
  } catch (err) { await client.query('ROLLBACK'); fail(res, 'Failed to end session.', 500); }
  finally { client.release(); }
});

// Astrologer: Get question queue for live session
router.get('/live-sessions/:sessionId/questions', requireAuth('astrologer'), async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT lq.*, u.full_name as user_name FROM live_questions lq
       JOIN users u ON u.id = lq.user_id
       WHERE lq.live_session_id=$1 AND lq.astrologer_id=$2
       ORDER BY lq.queue_position NULLS LAST, lq.created_at`,
      [req.params.sessionId, req.auth.sub]);
    res.json({ success: true, data: r.rows.map(q => ({
      id: q.id, userId: q.user_id, userName: q.user_name, questionType: q.question_type,
      category: q.category, questionText: q.question_text, queuePosition: q.queue_position,
      status: q.status, answeredAt: q.answered_at, createdAt: q.created_at
    }))});
  } catch (err) { fail(res, 'Failed to fetch questions.', 500); }
});

// Astrologer: Mark question as answering
router.post('/live-questions/:questionId/answering', requireAuth('astrologer'), async (req, res) => {
  try {
    const r = await pool.query(
      "UPDATE live_questions SET status='answering',updated_at=NOW() WHERE id=$1 AND astrologer_id=$2 AND status IN ('queued','submitted') RETURNING id,live_session_id",
      [req.params.questionId, req.auth.sub]);
    if (!r.rows.length) return fail(res, 'Question not found or cannot be marked.', 404);
    await pool.query("INSERT INTO live_session_events (live_session_id,actor_type,actor_id,event_type,metadata) VALUES ($1,'astrologer',$2,'question_answering',$3)",
      [r.rows[0].live_session_id, req.auth.sub, JSON.stringify({ questionId: r.rows[0].id })]);
    res.json({ success: true, message: 'Question marked as answering.' });
  } catch (err) { fail(res, 'Failed to update question.', 500); }
});

// Astrologer: Mark question as answered (releases escrow)
router.post('/live-questions/:questionId/answered', requireAuth('astrologer'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const r = await client.query(
      "UPDATE live_questions SET status='answered',answered_at=NOW(),updated_at=NOW() WHERE id=$1 AND astrologer_id=$2 AND status='answering' RETURNING id,live_session_id,payment_id",
      [req.params.questionId, req.auth.sub]);
    if (!r.rows.length) { await client.query('ROLLBACK'); return fail(res, 'Question not found or not in answering state.', 404); }
    const q = r.rows[0];

    // Release escrow
    if (q.payment_id) {
      const payRes = await client.query("SELECT user_id,amount,astrologer_id FROM payments WHERE id=$1 AND escrow_status='held'", [q.payment_id]);
      if (payRes.rows.length) {
        const p = payRes.rows[0];
        const commission = Math.round(parseFloat(p.amount) * 0.20 * 100) / 100;
        const astroEarning = parseFloat(p.amount) - commission;

        // Credit astrologer wallet
        const astroWallet = await client.query("SELECT id FROM wallet_accounts WHERE owner_type='astrologer' AND owner_id=$1", [p.astrologer_id]);
        if (astroWallet.rows.length) {
          await client.query("UPDATE wallet_accounts SET available_balance=available_balance+$1,updated_at=NOW() WHERE id=$2", [astroEarning, astroWallet.rows[0].id]);
          await client.query("INSERT INTO wallet_transactions (wallet_id,owner_type,owner_id,transaction_type,service_type,amount,status,description) VALUES ($1,'astrologer',$2,'live_question_earning','paid_live_question',$3,'completed',$4)",
            [astroWallet.rows[0].id, p.astrologer_id, astroEarning, `Live question earning`]);
        }

        // Update escrow
        const escrow = await client.query("SELECT id FROM escrow_records WHERE service_type='paid_live_question' AND service_id=$1", [q.payment_id]);
        if (escrow.rows.length) {
          await client.query("UPDATE escrow_records SET status='released',released_at=NOW(),updated_at=NOW() WHERE id=$1", [escrow.rows[0].id]);
        }
        await client.query("UPDATE payments SET payment_status='completed',escrow_status='released',updated_at=NOW() WHERE id=$1", [q.payment_id]);
      }
    }

    await client.query("INSERT INTO live_session_events (live_session_id,actor_type,actor_id,event_type,metadata) VALUES ($1,'astrologer',$2,'question_answered',$3)",
      [q.live_session_id, req.auth.sub, JSON.stringify({ questionId: q.id })]);
    await client.query('COMMIT');
    res.json({ success: true, message: 'Question answered. Payment released.' });
  } catch (err) { await client.query('ROLLBACK'); fail(res, 'Failed to mark answered.', 500); }
  finally { client.release(); }
});

// Astrologer: Skip question
router.post('/live-questions/:questionId/skip', requireAuth('astrologer'), async (req, res) => {
  const { reason } = req.body;
  try {
    const r = await pool.query(
      "UPDATE live_questions SET status='skipped',skipped_reason=$1,updated_at=NOW() WHERE id=$2 AND astrologer_id=$3 AND status IN ('queued','submitted','answering') RETURNING id,live_session_id,payment_id",
      [reason || 'Skipped by astrologer', req.params.questionId, req.auth.sub]);
    if (!r.rows.length) return fail(res, 'Question not found.', 404);
    const q = r.rows[0];

    // Refund skipped paid question
    if (q.payment_id) {
      const payRes = await pool.query("SELECT user_id,amount FROM payments WHERE id=$1 AND escrow_status='held'", [q.payment_id]);
      if (payRes.rows.length) {
        const p = payRes.rows[0];
        const wallet = await pool.query("SELECT id FROM wallet_accounts WHERE owner_type='user' AND owner_id=$1", [p.user_id]);
        if (wallet.rows.length) {
          await pool.query("UPDATE wallet_accounts SET available_balance=available_balance+$1,hold_balance=hold_balance-$1,updated_at=NOW() WHERE id=$2", [p.amount, wallet.rows[0].id]);
          await pool.query("INSERT INTO wallet_transactions (wallet_id,owner_type,owner_id,transaction_type,service_type,amount,status,description) VALUES ($1,'user',$2,'refund','paid_live_question',$3,'completed',$4)",
            [wallet.rows[0].id, p.user_id, p.amount, 'Refund: Live question skipped']);
        }
        await pool.query("UPDATE payments SET payment_status='refunded',escrow_status='refunded',updated_at=NOW() WHERE id=$1", [q.payment_id]);
      }
    }

    await pool.query("INSERT INTO live_session_events (live_session_id,actor_type,actor_id,event_type,metadata) VALUES ($1,'astrologer',$2,'question_skipped',$3)",
      [q.live_session_id, req.auth.sub, JSON.stringify({ questionId: q.id, reason })]);
    res.json({ success: true, message: 'Question skipped.' });
  } catch (err) { fail(res, 'Failed to skip question.', 500); }
});

export default router;
