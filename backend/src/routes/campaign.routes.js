import { Router } from 'express';
import crypto from 'crypto';
import { pool } from '../db/pool.js';
import { fail, asArray } from '../utils/response.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const uid = () => crypto.randomUUID();
const genCode = (prefix) => `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

// Screen 33: Astrologer creates a question campaign
router.post('/', requireAuth('astrologer'), async (req, res) => {
  const { campaignName, description, price, totalSlots, generalQuestionLimit, individualQuestionLimit, submissionMode, answerMode, deadlineHours, categories, languages, startAt, endAt } = req.body;
  if (!campaignName) return fail(res, 'Campaign name is required.');
  if (price === undefined || price < 0) return fail(res, 'Price must be >= 0.');
  const total = Number(totalSlots);
  const gLimit = Number(generalQuestionLimit);
  const iLimit = Number(individualQuestionLimit);
  if (!Number.isInteger(total) || total < 1 || total > 500)
    return fail(res, 'Total Slots must be a whole number between 1 and 500.');
  if (!Number.isInteger(gLimit) || !Number.isInteger(iLimit) || gLimit < 0 || iLimit < 0)
    return fail(res, 'Question limits must be non-negative whole numbers.');
  if (gLimit + iLimit !== total)
    return fail(res, 'General and Individual Question Limits must equal Total Slots.');
  if (!submissionMode) return fail(res, 'Submission mode is required.');
  if (!answerMode) return fail(res, 'Answer mode is required.');
  const cats = asArray(categories);
  const langs = asArray(languages);
  if (!cats.length) return fail(res, 'At least one category is required.');
  if (!langs.length) return fail(res, 'At least one language is required.');
  try {
    const campaignId = uid();
    const code = genCode('CMP');
    await pool.query(
      `INSERT INTO question_campaigns (id,astrologer_id,campaign_name,campaign_code,description,price,total_slots,available_slots,general_question_limit,individual_question_limit,submission_mode,answer_mode,deadline_hours,status,start_at,end_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'draft',$14,$15)`,
      [campaignId, req.auth.sub, campaignName, code, description || null, price || 0, total, total, gLimit, iLimit, submissionMode, answerMode, parseInt(deadlineHours) || 48, startAt || null, endAt || null]
    );
    for (const cat of cats) await pool.query('INSERT INTO question_campaign_categories (campaign_id,category) VALUES ($1,$2)', [campaignId, cat]);
    for (const lang of langs) await pool.query('INSERT INTO question_campaign_languages (campaign_id,language) VALUES ($1,$2)', [campaignId, lang]);
    res.status(201).json({ success: true, message: 'Campaign created successfully', data: { campaignId, campaignCode: code, status: 'draft' } });
  } catch (err) { fail(res, 'Failed to create campaign.', 500); }
});

// Screen 24/33: List astrologer's own campaigns
router.get('/', requireAuth('astrologer'), async (req, res) => {
  try {
    const rows = await pool.query(
      "SELECT * FROM question_campaigns WHERE astrologer_id=$1 ORDER BY created_at DESC", [req.auth.sub]);
    const campaigns = [];
    for (const r of rows.rows) {
      const [cats, langs] = await Promise.all([
        pool.query('SELECT category FROM question_campaign_categories WHERE campaign_id=$1', [r.id]),
        pool.query('SELECT language FROM question_campaign_languages WHERE campaign_id=$1', [r.id])
      ]);
      campaigns.push({
        id: r.id, campaignName: r.campaign_name, campaignCode: r.campaign_code, description: r.description,
        price: parseFloat(r.price), currency: r.currency, totalSlots: r.total_slots, soldSlots: r.sold_slots,
        availableSlots: r.available_slots, submissionMode: r.submission_mode, answerMode: r.answer_mode,
        deadlineHours: r.deadline_hours, status: r.status, startAt: r.start_at, endAt: r.end_at,
        categories: cats.rows.map(x => x.category), languages: langs.rows.map(x => x.language),
        createdAt: r.created_at
      });
    }
    res.json({ success: true, data: campaigns });
  } catch (err) { fail(res, 'Failed to fetch campaigns.', 500); }
});

// Screen 33: Get single campaign for edit/detail
router.get('/:campaignId', requireAuth('astrologer'), async (req, res) => {
  try {
    const rRes = await pool.query('SELECT * FROM question_campaigns WHERE id=$1 AND astrologer_id=$2', [req.params.campaignId, req.auth.sub]);
    if (!rRes.rows.length) return fail(res, 'Campaign not found.', 404);
    const r = rRes.rows[0];
    const [cats, langs] = await Promise.all([
      pool.query('SELECT category FROM question_campaign_categories WHERE campaign_id=$1', [r.id]),
      pool.query('SELECT language FROM question_campaign_languages WHERE campaign_id=$1', [r.id])
    ]);
    res.json({ success: true, data: {
      id: r.id, campaignName: r.campaign_name, campaignCode: r.campaign_code, description: r.description,
      price: parseFloat(r.price), currency: r.currency, totalSlots: r.total_slots, soldSlots: r.sold_slots,
      availableSlots: r.available_slots, generalQuestionLimit: r.general_question_limit,
      individualQuestionLimit: r.individual_question_limit, submissionMode: r.submission_mode,
      answerMode: r.answer_mode, deadlineHours: r.deadline_hours, status: r.status,
      startAt: r.start_at, endAt: r.end_at, categories: cats.rows.map(x => x.category),
      languages: langs.rows.map(x => x.language), createdAt: r.created_at
    }});
  } catch (err) { fail(res, 'Failed to fetch campaign.', 500); }
});

// Screen 24: Activate campaign
router.patch('/:campaignId/activate', requireAuth('astrologer'), async (req, res) => {
  try {
    const rRes = await pool.query('SELECT * FROM question_campaigns WHERE id=$1 AND astrologer_id=$2', [req.params.campaignId, req.auth.sub]);
    if (!rRes.rows.length) return fail(res, 'Campaign not found.', 404);
    const r = rRes.rows[0];
    if (r.status !== 'draft' && r.status !== 'paused') return fail(res, 'Campaign can only be activated from draft or paused status.');
    if (r.total_slots <= 0) return fail(res, 'Cannot activate campaign with 0 slots.');
    if (r.price <= 0) return fail(res, 'Cannot activate campaign with 0 price.');
    await pool.query("UPDATE question_campaigns SET status='active',available_slots=total_slots-sold_slots,updated_at=NOW() WHERE id=$1", [r.id]);
    res.json({ success: true, message: 'Campaign activated.', data: { campaignId: r.id, status: 'active' } });
  } catch (err) { fail(res, 'Failed to activate campaign.', 500); }
});

// Screen 24: Pause campaign
router.patch('/:campaignId/pause', requireAuth('astrologer'), async (req, res) => {
  try {
    const rRes = await pool.query("SELECT * FROM question_campaigns WHERE id=$1 AND astrologer_id=$2 AND status='active'", [req.params.campaignId, req.auth.sub]);
    if (!rRes.rows.length) return fail(res, 'Active campaign not found.', 404);
    await pool.query("UPDATE question_campaigns SET status='paused',updated_at=NOW() WHERE id=$1", [req.params.campaignId]);
    res.json({ success: true, message: 'Campaign paused.' });
  } catch (err) { fail(res, 'Failed to pause campaign.', 500); }
});

// Screen 24: Stop campaign
router.patch('/:campaignId/stop', requireAuth('astrologer'), async (req, res) => {
  try {
    const rRes = await pool.query('SELECT * FROM question_campaigns WHERE id=$1 AND astrologer_id=$2', [req.params.campaignId, req.auth.sub]);
    if (!rRes.rows.length) return fail(res, 'Campaign not found.', 404);
    await pool.query("UPDATE question_campaigns SET status='stopped',updated_at=NOW() WHERE id=$1", [req.params.campaignId]);
    res.json({ success: true, message: 'Campaign stopped.' });
  } catch (err) { fail(res, 'Failed to stop campaign.', 500); }
});

// Screen 33: Edit campaign (only draft status)
router.put('/:campaignId', requireAuth('astrologer'), async (req, res) => {
  const { campaignName, description, price, totalSlots, generalQuestionLimit, individualQuestionLimit, submissionMode, answerMode, deadlineHours, categories, languages, startAt, endAt } = req.body;
  try {
    const rRes = await pool.query('SELECT * FROM question_campaigns WHERE id=$1 AND astrologer_id=$2', [req.params.campaignId, req.auth.sub]);
    if (!rRes.rows.length) return fail(res, 'Campaign not found.', 404);
    const r = rRes.rows[0];
    if (r.status !== 'draft') return fail(res, 'Only draft campaigns can be edited.');
    const nextTotal = Number(totalSlots ?? r.total_slots);
    const nextGeneralLimit = Number(generalQuestionLimit ?? r.general_question_limit);
    const nextIndividualLimit = Number(individualQuestionLimit ?? r.individual_question_limit);
    if (!Number.isInteger(nextTotal) || nextTotal < 1 || nextTotal > 500)
      return fail(res, 'Total Slots must be a whole number between 1 and 500.');
    if (!Number.isInteger(nextGeneralLimit) || !Number.isInteger(nextIndividualLimit) || nextGeneralLimit < 0 || nextIndividualLimit < 0)
      return fail(res, 'Question limits must be non-negative whole numbers.');
    if (nextGeneralLimit + nextIndividualLimit !== nextTotal)
      return fail(res, 'General and Individual Question Limits must equal Total Slots.');
    await pool.query(
      `UPDATE question_campaigns SET campaign_name=$1,description=$2,price=$3,total_slots=$4,general_question_limit=$5,individual_question_limit=$6,submission_mode=$7,answer_mode=$8,deadline_hours=$9,start_at=$10,end_at=$11,updated_at=NOW() WHERE id=$12`,
      [campaignName || r.campaign_name, description ?? r.description, price ?? r.price, nextTotal, nextGeneralLimit, nextIndividualLimit, submissionMode || r.submission_mode, answerMode || r.answer_mode, deadlineHours ?? r.deadline_hours, startAt || r.start_at, endAt || r.end_at, r.id]
    );
    if (categories) {
      await pool.query('DELETE FROM question_campaign_categories WHERE campaign_id=$1', [r.id]);
      for (const cat of asArray(categories)) await pool.query('INSERT INTO question_campaign_categories (campaign_id,category) VALUES ($1,$2)', [r.id, cat]);
    }
    if (languages) {
      await pool.query('DELETE FROM question_campaign_languages WHERE campaign_id=$1', [r.id]);
      for (const lang of asArray(languages)) await pool.query('INSERT INTO question_campaign_languages (campaign_id,language) VALUES ($1,$2)', [r.id, lang]);
    }
    res.json({ success: true, message: 'Campaign updated.' });
  } catch (err) { fail(res, 'Failed to update campaign.', 500); }
});

// User-side: Get astrologer's active campaigns (for profile page)
router.get('/astrologer/:astrologerId/active', async (req, res) => {
  try {
    const rows = await pool.query(
      "SELECT * FROM question_campaigns WHERE astrologer_id=$1 AND status='active' AND (end_at IS NULL OR end_at > NOW()) ORDER BY created_at DESC",
      [req.params.astrologerId]);
    const campaigns = [];
    for (const r of rows.rows) {
      const [cats, langs] = await Promise.all([
        pool.query('SELECT category FROM question_campaign_categories WHERE campaign_id=$1', [r.id]),
        pool.query('SELECT language FROM question_campaign_languages WHERE campaign_id=$1', [r.id])
      ]);
      campaigns.push({
        id: r.id, campaignName: r.campaign_name, price: parseFloat(r.price), submissionMode: r.submission_mode,
        answerMode: r.answer_mode, deadlineHours: r.deadline_hours, availableSlots: r.available_slots,
        categories: cats.rows.map(x => x.category), languages: langs.rows.map(x => x.language)
      });
    }
    res.json({ success: true, data: campaigns });
  } catch (err) { fail(res, 'Failed to fetch campaigns.', 500); }
});

export default router;
