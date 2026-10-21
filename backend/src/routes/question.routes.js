import { Router } from 'express';
import crypto from 'crypto';
import { pool } from '../db/pool.js';
import { fail } from '../utils/response.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const uid = () => crypto.randomUUID();
const genCode = (prefix) => `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

const TIMELINE_STAGES = ['Purchased', 'Question Submitted', 'Received by Astrologer', 'Under Review', 'Answered'];

function buildTimeline(status) {
  const order = ['question_pending', 'submitted', 'received_by_astrologer', 'under_review', 'answered', 'completed'];
  const idx = order.indexOf(status);
  return TIMELINE_STAGES.map((label, i) => ({ label, completed: i <= Math.min(idx, order.length - 1) }));
}

// Screen 6: Submit question
router.post('/', requireAuth('user'), async (req, res) => {
  const { purchaseId, questionType, category, language, title, questionText, relatedProfileId } = req.body;
  if (!purchaseId) return fail(res, 'Purchase ID is required.');
  if (!questionType) return fail(res, 'Question type is required.');
  if (!category) return fail(res, 'Category is required.');
  if (!language) return fail(res, 'Language is required.');
  if (!questionText && !req.body.voiceFileUrl) return fail(res, 'Question text or voice file is required.');
  try {
    const pRes = await pool.query('SELECT * FROM question_purchases WHERE id=$1 AND user_id=$2', [purchaseId, req.auth.sub]);
    if (!pRes.rows.length) return fail(res, 'Purchase not found.', 404);
    const purchase = pRes.rows[0];
    if (purchase.purchase_status !== 'question_pending') return fail(res, 'This purchase is not in pending question status.');
    if (purchase.question_submitted) return fail(res, 'A question has already been submitted for this purchase.');

    // Validate category/language against campaign
    const [catRes, langRes] = await Promise.all([
      pool.query('SELECT 1 FROM question_campaign_categories WHERE campaign_id=$1 AND category=$2', [purchase.campaign_id, category]),
      pool.query('SELECT 1 FROM question_campaign_languages WHERE campaign_id=$1 AND language=$2', [purchase.campaign_id, language])
    ]);
    if (!catRes.rows.length) return fail(res, 'Selected category is not allowed for this campaign.');
    if (!langRes.rows.length) return fail(res, 'Selected language is not allowed for this campaign.');

    // Get campaign for deadline
    const campRes = await pool.query('SELECT deadline_hours, answer_mode FROM question_campaigns WHERE id=$1', [purchase.campaign_id]);
    const camp = campRes.rows[0];

    const questionId = uid();
    const questionCode = genCode('Q');
    await pool.query(
      `INSERT INTO questions (id,user_id,astrologer_id,campaign_id,purchase_id,question_code,question_type,category,language,title,question_text,status,due_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'submitted',NOW() + INTERVAL '1 hour' * $12)`,
      [questionId, req.auth.sub, purchase.astrologer_id, purchase.campaign_id, purchaseId, questionCode, questionType, category, language, title || null, questionText || null, camp.deadline_hours || 48]);

    await pool.query("UPDATE question_purchases SET question_submitted=true,question_id=$1,purchase_status='question_submitted',updated_at=NOW() WHERE id=$2", [questionId, purchaseId]);

    // If live answer mode, add to live queue
    if (camp.answer_mode === 'live') {
      const sessionId = uid();
      await pool.query(
        `INSERT INTO live_question_queue (live_session_id,question_id,user_id,astrologer_id,queue_position,status)
         VALUES ($1,$2,$3,$4,1,'waiting')`,
        [sessionId, questionId, req.auth.sub, purchase.astrologer_id]);
    }

    res.status(201).json({ success: true, message: 'Question submitted successfully', data: {
      questionId, questionCode, status: 'submitted',
      dueAt: new Date(Date.now() + (camp.deadline_hours || 48) * 3600000).toISOString()
    }});
  } catch (err) { fail(res, 'Failed to submit question.', 500); }
});

// Screen 4: User tracks question
router.get('/:questionId/tracking', requireAuth('user'), async (req, res) => {
  try {
    const qRes = await pool.query(
      `SELECT q.*, qc.campaign_name, qc.answer_mode, a.display_name as astrologer_name
       FROM questions q
       JOIN question_campaigns qc ON qc.id = q.campaign_id
       JOIN astrologers a ON a.id = q.astrologer_id
       WHERE q.id=$1 AND q.user_id=$2`, [req.params.questionId, req.auth.sub]);
    if (!qRes.rows.length) return fail(res, 'Question not found.', 404);
    const q = qRes.rows[0];

    const answerRes = await pool.query('SELECT * FROM question_answers WHERE question_id=$1 ORDER BY submitted_at DESC LIMIT 1', [q.id]);
    let answer = null;
    if (answerRes.rows.length) {
      const a = answerRes.rows[0];
      answer = { answerMode: a.answer_mode, answerText: a.answer_text, voiceAnswerUrl: a.voice_answer_url, submittedAt: a.submitted_at };
    }

    res.json({ success: true, data: {
      questionId: q.id, questionCode: q.question_code, questionType: q.question_type,
      category: q.category, language: q.language, title: q.title, questionText: q.question_text,
      status: q.status, campaignName: q.campaign_name, answerMode: q.answer_mode,
      astrologerName: q.astrologer_name, dueAt: q.due_at, submittedAt: q.submitted_at,
      timeline: buildTimeline(q.status), answer
    }});
  } catch (err) { fail(res, 'Failed to fetch tracking.', 500); }
});

// User: list my questions
router.get('/', requireAuth('user'), async (req, res) => {
  try {
    const rows = await pool.query(
      `SELECT q.id,q.question_code,q.question_type,q.category,q.title,q.status,q.submitted_at,q.due_at,
              a.display_name as astrologer_name, qc.campaign_name
       FROM questions q
       JOIN astrologers a ON a.id = q.astrologer_id
       JOIN question_campaigns qc ON qc.id = q.campaign_id
       WHERE q.user_id=$1 ORDER BY q.created_at DESC LIMIT 50`, [req.auth.sub]);
    res.json({ success: true, data: rows.rows.map(r => ({
      id: r.id, questionCode: r.question_code, questionType: r.question_type, category: r.category,
      title: r.title, status: r.status, astrologerName: r.astrologer_name, campaignName: r.campaign_name,
      submittedAt: r.submitted_at, dueAt: r.due_at
    }))});
  } catch (err) { fail(res, 'Failed to fetch questions.', 500); }
});

// Screen 25: Astrologer gets question queue
router.get('/astrologer/queue', requireAuth('astrologer'), async (req, res) => {
  const { status } = req.query;
  let where = 'q.astrologer_id=$1';
  const params = [req.auth.sub];
  if (status) { where += ` AND q.status=$2`; params.push(status); }
  try {
    const rows = await pool.query(
      `SELECT q.*, u.full_name as user_name, qc.campaign_name, qc.answer_mode
       FROM questions q
       JOIN users u ON u.id = q.user_id
       JOIN question_campaigns qc ON qc.id = q.campaign_id
       WHERE ${where} ORDER BY q.created_at DESC LIMIT 50`, params);
    res.json({ success: true, data: rows.rows.map(r => ({
      id: r.id, questionCode: r.question_code, questionType: r.question_type, category: r.category,
      language: r.language, title: r.title, questionText: r.question_text, status: r.status,
      userName: r.user_name, campaignName: r.campaign_name, answerMode: r.answer_mode,
      submittedAt: r.submitted_at, dueAt: r.due_at
    }))});
  } catch (err) { fail(res, 'Failed to fetch queue.', 500); }
});

// Screen 25: Astrologer opens question (start review)
router.patch('/astrologer/:questionId/start-review', requireAuth('astrologer'), async (req, res) => {
  try {
    const qRes = await pool.query("SELECT * FROM questions WHERE id=$1 AND astrologer_id=$2 AND status='submitted'", [req.params.questionId, req.auth.sub]);
    if (!qRes.rows.length) return fail(res, 'Question not found or not in submitted status.', 404);
    await pool.query("UPDATE questions SET status='under_review',updated_at=NOW() WHERE id=$1", [req.params.questionId]);
    res.json({ success: true, message: 'Question opened for review.' });
  } catch (err) { fail(res, 'Failed to start review.', 500); }
});

// Screen 25: Astrologer submits answer
router.post('/astrologer/:questionId/answer', requireAuth('astrologer'), async (req, res) => {
  const { answerMode, answerText, voiceAnswerUrl } = req.body;
  if (!answerMode) return fail(res, 'Answer mode is required.');
  try {
    const qRes = await pool.query('SELECT * FROM questions WHERE id=$1 AND astrologer_id=$2', [req.params.questionId, req.auth.sub]);
    if (!qRes.rows.length) return fail(res, 'Question not found.', 404);
    const q = qRes.rows[0];
    if (['completed', 'cancelled', 'refunded'].includes(q.status)) return fail(res, 'Cannot answer this question.');

    if (answerMode === 'text' && !answerText) return fail(res, 'Text answer requires answer text.');
    if (answerMode === 'voice' && !voiceAnswerUrl) return fail(res, 'Voice answer requires voice file URL.');

    const answerId = uid();
    await pool.query(
      `INSERT INTO question_answers (id,question_id,astrologer_id,answer_mode,answer_text,voice_answer_url)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [answerId, q.id, req.auth.sub, answerMode, answerText || null, voiceAnswerUrl || null]);

    await pool.query("UPDATE questions SET status='answered',updated_at=NOW() WHERE id=$1", [q.id]);
    await pool.query("UPDATE question_purchases SET purchase_status='answered',updated_at=NOW() WHERE question_id=$1", [q.id]);

    res.json({ success: true, message: 'Answer submitted successfully', data: {
      questionId: q.id, answerId, status: 'answered'
    }});
  } catch (err) { fail(res, 'Failed to submit answer.', 500); }
});

export default router;
