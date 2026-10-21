import { Router } from 'express';
import crypto from 'crypto';
import { pool } from '../db/pool.js';
import { fail } from '../utils/response.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const uid = () => crypto.randomUUID();

const VALID_REASONS = [
  'incomplete_answer', 'incorrect_information', 'off_topic', 'too_brief',
  'rude_inappropriate', 'duplicate_answer', 'wrong_predictions', 'other'
];
const VALID_RESOLUTIONS = ['re_answer', 'refund', 'partial_refund', 'no_action'];
const VALID_ADMIN_RESOLUTIONS = ['resolved', 'refunded', 'rejected', 'closed'];
const VALID_STATUSES = [
  'open', 'astrologer_reviewing', 'astrologer_responded', 'user_reply',
  'escalated', 'admin_reviewing', 'resolved', 'refunded', 'rejected', 'closed'
];

async function getDisputeDetail(disputeId) {
  const result = await pool.query(
    `SELECT qd.*,
            q.question_code, q.title as question_title, q.question_text, q.language,
            u.full_name as user_name, u.email as user_email, u.mobile as user_mobile,
            a.display_name as astrologer_name, a.email as astrologer_email,
            qp.amount as purchase_amount, qp.purchase_status
     FROM question_disputes qd
     JOIN questions q ON q.id = qd.question_id
     JOIN users u ON u.id = qd.user_id
     JOIN astrologers a ON a.id = qd.astrologer_id
     LEFT JOIN question_purchases qp ON qp.id = qd.purchase_id
     WHERE qd.id=$1`,
    [disputeId]
  );
  return result.rows[0] || null;
}

async function getDisputeMessages(disputeId) {
  const result = await pool.query(
    `SELECT dm.*,
            CASE dm.sender_type
              WHEN 'user' THEN (SELECT full_name FROM users WHERE id=dm.sender_id)
              WHEN 'astrologer' THEN (SELECT display_name FROM astrologers WHERE id=dm.sender_id)
              WHEN 'admin' THEN 'Platform Admin'
              ELSE 'System'
            END as sender_name
     FROM dispute_messages dm
     WHERE dm.dispute_id=$1 ORDER BY dm.created_at ASC`,
    [disputeId]
  );
  return result.rows;
}

// ═══════════════════════════════════════════════════════════════════════════
// USER ROUTES
// ═══════════════════════════════════════════════════════════════════════════

// Raise a dispute
router.post('/', requireAuth('user'), async (req, res) => {
  const { questionId, reason, description, expectedResolution } = req.body;
  if (!questionId) return fail(res, 'Question ID is required.');
  if (!reason) return fail(res, 'Reason is required.');
  if (!VALID_REASONS.includes(reason) && reason.length > 150)
    return fail(res, 'Reason must be a valid predefined option or under 150 characters.');
  try {
    const qRes = await pool.query('SELECT * FROM questions WHERE id=$1 AND user_id=$2', [questionId, req.auth.sub]);
    if (!qRes.rows.length) return fail(res, 'Question not found.', 404);
    const q = qRes.rows[0];

    const existing = await pool.query(
      "SELECT 1 FROM question_disputes WHERE question_id=$1 AND status NOT IN ('resolved','rejected','refunded','closed')",
      [questionId]
    );
    if (existing.rows.length) return fail(res, 'An open dispute already exists for this question.');

    const disputeId = uid();
    await pool.query(
      `INSERT INTO question_disputes (id,user_id,astrologer_id,question_id,purchase_id,reason,description,expected_resolution,status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'open')`,
      [disputeId, req.auth.sub, q.astrologer_id, q.id, q.purchase_id, reason, description || null, expectedResolution || null]
    );

    await pool.query("UPDATE questions SET status='disputed',updated_at=NOW() WHERE id=$1", [q.id]);
    await pool.query("UPDATE question_purchases SET purchase_status='disputed',updated_at=NOW() WHERE question_id=$1", [q.id]);
    await pool.query(
      "UPDATE escrow_records SET status='on_hold_due_to_dispute',updated_at=NOW() WHERE service_type='question_purchase' AND service_id=$1 AND status='held'",
      [q.purchase_id]
    );

    await pool.query(
      `INSERT INTO dispute_messages (dispute_id,sender_type,sender_id,message) VALUES ($1,'user',$2,$3)`,
      [disputeId, req.auth.sub, `Dispute raised: ${reason}${description ? '. ' + description : ''}`]
    );

    res.status(201).json({ success: true, message: 'Dispute raised successfully.', data: { disputeId, status: 'open' } });
  } catch (err) {
    console.error('Raise dispute error:', err);
    fail(res, 'Failed to raise dispute.', 500);
  }
});

// List my disputes
router.get('/', requireAuth('user'), async (req, res) => {
  const { status, limit } = req.query;
  try {
    let query = `SELECT qd.id, qd.reason, qd.description, qd.expected_resolution, qd.status,
                        qd.resolution, qd.refund_amount, qd.escalated_at, qd.created_at, qd.updated_at,
                        q.question_code, q.title as question_title,
                        a.display_name as astrologer_name
                 FROM question_disputes qd
                 JOIN questions q ON q.id = qd.question_id
                 JOIN astrologers a ON a.id = qd.astrologer_id
                 WHERE qd.user_id=$1`;
    const params = [req.auth.sub];
    let idx = 2;
    if (status) { query += ` AND qd.status=$${idx++}`; params.push(status); }
    query += ` ORDER BY qd.created_at DESC`;
    const maxLimit = Math.min(parseInt(limit) || 50, 100);
    query += ` LIMIT $${idx++}`;
    params.push(maxLimit);
    const result = await pool.query(query, params);

    const summaryResult = await pool.query(
      `SELECT status, COUNT(*)::int as count FROM question_disputes WHERE user_id=$1 GROUP BY status`,
      [req.auth.sub]
    );
    const summary = {};
    summaryResult.rows.forEach(r => { summary[r.status] = r.count; });

    res.json({ success: true, data: { disputes: result.rows, summary } });
  } catch (err) {
    console.error('List user disputes error:', err);
    fail(res, 'Failed to fetch disputes.', 500);
  }
});

// Dispute detail (user)
router.get('/:disputeId', requireAuth('user'), async (req, res) => {
  try {
    const dispute = await getDisputeDetail(req.params.disputeId);
    if (!dispute || dispute.user_id !== req.auth.sub)
      return fail(res, 'Dispute not found.', 404);
    const messages = await getDisputeMessages(req.params.disputeId);
    res.json({ success: true, data: { dispute, messages } });
  } catch (err) {
    console.error('Dispute detail error:', err);
    fail(res, 'Failed to fetch dispute details.', 500);
  }
});

// Send message in dispute thread (user)
router.post('/:disputeId/messages', requireAuth('user'), async (req, res) => {
  const { message } = req.body;
  if (!message || !message.trim()) return fail(res, 'Message is required.');
  try {
    const dispute = await getDisputeDetail(req.params.disputeId);
    if (!dispute || dispute.user_id !== req.auth.sub)
      return fail(res, 'Dispute not found.', 404);
    if (['resolved', 'rejected', 'refunded', 'closed'].includes(dispute.status))
      return fail(res, 'This dispute is already closed.');

    const msgId = uid();
    await pool.query(
      `INSERT INTO dispute_messages (id,dispute_id,sender_type,sender_id,message) VALUES ($1,$2,'user',$3,$4)`,
      [msgId, req.params.disputeId, req.auth.sub, message.trim()]
    );
    if (dispute.status === 'astrologer_responded' || dispute.status === 'open') {
      await pool.query("UPDATE question_disputes SET status='user_reply',updated_at=NOW() WHERE id=$1", [req.params.disputeId]);
    }
    res.status(201).json({ success: true, message: 'Message sent.', data: { messageId: msgId } });
  } catch (err) {
    console.error('User message error:', err);
    fail(res, 'Failed to send message.', 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ASTROLOGER ROUTES
// ═══════════════════════════════════════════════════════════════════════════

// List disputes for astrologer
router.get('/astrologer', requireAuth('astrologer'), async (req, res) => {
  const { status, limit } = req.query;
  try {
    let query = `SELECT qd.id, qd.reason, qd.description, qd.expected_resolution, qd.status,
                        qd.resolution, qd.astrologer_response, qd.escalated_at, qd.created_at, qd.updated_at,
                        q.question_code, q.title as question_title,
                        u.full_name as user_name
                 FROM question_disputes qd
                 JOIN questions q ON q.id = qd.question_id
                 JOIN users u ON u.id = qd.user_id
                 WHERE qd.astrologer_id=$1`;
    const params = [req.auth.sub];
    let idx = 2;
    if (status) { query += ` AND qd.status=$${idx++}`; params.push(status); }
    query += ` ORDER BY qd.created_at DESC`;
    const maxLimit = Math.min(parseInt(limit) || 50, 100);
    query += ` LIMIT $${idx++}`;
    params.push(maxLimit);
    const result = await pool.query(query, params);

    const summaryResult = await pool.query(
      `SELECT status, COUNT(*)::int as count FROM question_disputes WHERE astrologer_id=$1 GROUP BY status`,
      [req.auth.sub]
    );
    const summary = {};
    summaryResult.rows.forEach(r => { summary[r.status] = r.count; });

    res.json({ success: true, data: { disputes: result.rows, summary } });
  } catch (err) {
    console.error('List astrologer disputes error:', err);
    fail(res, 'Failed to fetch disputes.', 500);
  }
});

// Dispute detail (astrologer)
router.get('/astrologer/:disputeId', requireAuth('astrologer'), async (req, res) => {
  try {
    const dispute = await getDisputeDetail(req.params.disputeId);
    if (!dispute || dispute.astrologer_id !== req.auth.sub)
      return fail(res, 'Dispute not found.', 404);
    const messages = await getDisputeMessages(req.params.disputeId);
    res.json({ success: true, data: { dispute, messages } });
  } catch (err) {
    console.error('Astrologer dispute detail error:', err);
    fail(res, 'Failed to fetch dispute details.', 500);
  }
});

// Astrologer responds to dispute
router.patch('/astrologer/:disputeId/respond', requireAuth('astrologer'), async (req, res) => {
  const { response } = req.body;
  if (!response || !response.trim()) return fail(res, 'Response text is required.');
  try {
    const dRes = await pool.query(
      "SELECT * FROM question_disputes WHERE id=$1 AND astrologer_id=$2 AND status IN ('open','astrologer_reviewing','user_reply','escalated')",
      [req.params.disputeId, req.auth.sub]
    );
    if (!dRes.rows.length) return fail(res, 'Dispute not found or not respondable.', 404);

    await pool.query(
      "UPDATE question_disputes SET astrologer_response=$1, astrologer_responded_at=NOW(), status='astrologer_responded', updated_at=NOW() WHERE id=$2",
      [response.trim(), req.params.disputeId]
    );
    await pool.query(
      `INSERT INTO dispute_messages (dispute_id,sender_type,sender_id,message) VALUES ($1,'astrologer',$2,$3)`,
      [req.params.disputeId, req.auth.sub, response.trim()]
    );
    res.json({ success: true, message: 'Response submitted.' });
  } catch (err) {
    console.error('Astrologer respond error:', err);
    fail(res, 'Failed to submit response.', 500);
  }
});

// Mark dispute as reviewing (astrologer)
router.patch('/astrologer/:disputeId/reviewing', requireAuth('astrologer'), async (req, res) => {
  try {
    const dRes = await pool.query(
      "SELECT * FROM question_disputes WHERE id=$1 AND astrologer_id=$2 AND status='open'",
      [req.params.disputeId, req.auth.sub]
    );
    if (!dRes.rows.length) return fail(res, 'Dispute not found or already in review.', 404);
    await pool.query("UPDATE question_disputes SET status='astrologer_reviewing',updated_at=NOW() WHERE id=$1", [req.params.disputeId]);
    res.json({ success: true, message: 'Dispute marked as reviewing.' });
  } catch (err) {
    fail(res, 'Failed to update status.', 500);
  }
});

// Send message in dispute thread (astrologer)
router.post('/astrologer/:disputeId/messages', requireAuth('astrologer'), async (req, res) => {
  const { message } = req.body;
  if (!message || !message.trim()) return fail(res, 'Message is required.');
  try {
    const dispute = await getDisputeDetail(req.params.disputeId);
    if (!dispute || dispute.astrologer_id !== req.auth.sub)
      return fail(res, 'Dispute not found.', 404);
    if (['resolved', 'rejected', 'refunded', 'closed'].includes(dispute.status))
      return fail(res, 'This dispute is already closed.');

    const msgId = uid();
    await pool.query(
      `INSERT INTO dispute_messages (id,dispute_id,sender_type,sender_id,message) VALUES ($1,$2,'astrologer',$3,$4)`,
      [msgId, req.params.disputeId, req.auth.sub, message.trim()]
    );
    res.status(201).json({ success: true, message: 'Message sent.', data: { messageId: msgId } });
  } catch (err) {
    console.error('Astrologer message error:', err);
    fail(res, 'Failed to send message.', 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN ROUTES
// ═══════════════════════════════════════════════════════════════════════════

// Admin: list all disputes
export default router;
