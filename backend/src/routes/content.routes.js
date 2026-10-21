import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { fail } from '../utils/response.js';

const router = Router();

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 120);
}

const VALID_CONTENT_TYPES = [
  'public_prediction', 'follower_update', 'subscriber_perk', 'monthly_prediction',
  'festival_content', 'transit_content', 'live_announcement', 'atonement_notification',
  'educational_content', 'selected_user_message'
];
const VALID_AUDIENCE = ['public', 'followers', 'all_subscribers', 'silver_subscribers', 'gold_subscribers', 'platinum_subscribers', 'selected_users'];
const VALID_PLAN_TYPES = ['silver', 'gold', 'platinum'];

// ─── Astrologer: Create Content ──────────────────────────────────────────
router.post('/astrologer/contents', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'astrologer') return res.status(403).json(fail('Astrologer access required'));
    const { title, shortDescription, body, contentType, astrologyCategory, language, audienceType, planType, publishType, scheduledAt } = req.body;
    if (!title || !body || !contentType || !audienceType) return res.status(400).json(fail('title, body, contentType, audienceType are required'));
    if (!VALID_CONTENT_TYPES.includes(contentType)) return res.status(400).json(fail('Invalid content type'));
    if (!VALID_AUDIENCE.includes(audienceType)) return res.status(400).json(fail('Invalid audience type'));
    if (['silver_subscribers', 'gold_subscribers', 'platinum_subscribers'].includes(audienceType) && !planType) return res.status(400).json(fail('planType required for plan-specific audience'));

    let status = 'draft';
    let scheduledAtVal = null;
    if (publishType === 'publish_now') status = 'published';
    else if (publishType === 'schedule' && scheduledAt) { status = 'scheduled'; scheduledAtVal = scheduledAt; }

    const slug = slugify(title) + '-' + Date.now().toString(36);
    const r = await pool.query(
      `INSERT INTO contents (creator_type,creator_id,title,slug,short_description,body,content_type,astrology_category,language,audience_type,plan_type,status,scheduled_at,published_at)
       VALUES ('astrologer',$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id,status`,
      [req.user.id, title, slug, shortDescription || null, body, contentType, astrologyCategory || null, language || 'Tamil', audienceType, planType || null, status, scheduledAtVal, status === 'published' ? new Date() : null]
    );

    if (audienceType === 'selected_users' && req.body.selectedUserIds?.length) {
      for (const uid of req.body.selectedUserIds) {
        await pool.query('INSERT INTO content_selected_users (content_id,user_id) VALUES ($1,$2)', [r.rows[0].id, uid]);
      }
    }

    res.json({ success: true, message: 'Content created', data: { contentId: r.rows[0].id, status: r.rows[0].status } });
  } catch (e) { res.status(400).json(fail(res, e.message)); }
});

// ─── Astrologer: Update Content ──────────────────────────────────────────
router.put('/astrologer/contents/:contentId', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'astrologer') return res.status(403).json(fail('Astrologer access required'));
    const { contentId } = req.params;
    const existing = await pool.query('SELECT * FROM contents WHERE id=$1 AND creator_id=$2', [contentId, req.user.id]);
    if (!existing.rows.length) return res.status(404).json(fail('Content not found'));
    if (!['draft', 'rejected'].includes(existing.rows[0].status)) return res.status(400).json(fail('Only draft/rejected content can be edited'));

    const { title, shortDescription, body, contentType, astrologyCategory, language, audienceType, planType } = req.body;
    await pool.query(
      `UPDATE contents SET title=COALESCE($1,title), short_description=COALESCE($2,short_description), body=COALESCE($3,body),
       content_type=COALESCE($4,content_type), astrology_category=COALESCE($5,astrology_category), language=COALESCE($6,language),
       audience_type=COALESCE($7,audience_type), plan_type=COALESCE($8,plan_type), updated_at=NOW() WHERE id=$9`,
      [title, shortDescription, body, contentType, astrologyCategory, language, audienceType, planType, contentId]
    );
    res.json({ success: true, message: 'Content updated' });
  } catch (e) { res.status(400).json(fail(res, e.message)); }
});

// ─── Astrologer: Publish Content ─────────────────────────────────────────
router.post('/astrologer/contents/:contentId/publish', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'astrologer') return res.status(403).json(fail('Astrologer access required'));
    const { contentId } = req.params;
    const existing = await pool.query('SELECT * FROM contents WHERE id=$1 AND creator_id=$2', [contentId, req.user.id]);
    if (!existing.rows.length) return res.status(404).json(fail('Content not found'));

    const { publishNow, scheduledAt, notifyUsers } = req.body;
    let status = 'published';
    let scheduledAtVal = null;
    if (!publishNow && scheduledAt) { status = 'scheduled'; scheduledAtVal = scheduledAt; }

    await pool.query('UPDATE contents SET status=$1, scheduled_at=$2, published_at=CASE WHEN $1=\'published\' THEN NOW() ELSE published_at END, updated_at=NOW() WHERE id=$3', [status, scheduledAtVal, contentId]);

    if (notifyUsers && status === 'published') {
      await createNotificationsForContent(contentId, existing.rows[0]);
    }

    res.json({ success: true, message: status === 'published' ? 'Content published' : 'Content scheduled', data: { contentId, status } });
  } catch (e) { res.status(400).json(fail(res, e.message)); }
});

// ─── Astrologer: Unpublish ───────────────────────────────────────────────
router.post('/astrologer/contents/:contentId/unpublish', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'astrologer') return res.status(403).json(fail('Astrologer access required'));
    const { contentId } = req.params;
    await pool.query('UPDATE contents SET status=\'unpublished\', updated_at=NOW() WHERE id=$1 AND creator_id=$2', [contentId, req.user.id]);
    res.json({ success: true, message: 'Content unpublished' });
  } catch (e) { res.status(400).json(fail(res, e.message)); }
});

// ─── Astrologer: Delete Content ──────────────────────────────────────────
router.delete('/astrologer/contents/:contentId', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'astrologer') return res.status(403).json(fail('Astrologer access required'));
    const { contentId } = req.params;
    await pool.query('UPDATE contents SET status=\'deleted\', updated_at=NOW() WHERE id=$1 AND creator_id=$2', [contentId, req.user.id]);
    res.json({ success: true, message: 'Content deleted' });
  } catch (e) { res.status(400).json(fail(res, e.message)); }
});

// ─── Astrologer: List Own Contents ───────────────────────────────────────
router.get('/astrologer/contents', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'astrologer') return res.status(403).json(fail('Astrologer access required'));
    const { status, contentType, audienceType, page = 1, limit = 20 } = req.query;
    const where = ['creator_id=$1', 'status != \'deleted\''];
    const params = [req.user.id];
    let idx = 2;
    if (status) { where.push(`status=$${idx}`); params.push(status); idx++; }
    if (contentType) { where.push(`content_type=$${idx}`); params.push(contentType); idx++; }
    if (audienceType) { where.push(`audience_type=$${idx}`); params.push(audienceType); idx++; }

    const offset = (Number(page) - 1) * Number(limit);
    const countR = await pool.query(`SELECT COUNT(*) FROM contents WHERE ${where.join(' AND ')}`, params);
    const r = await pool.query(`SELECT * FROM contents WHERE ${where.join(' AND ')} ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`, [...params, Number(limit), offset]);

    res.json({ success: true, data: { items: r.rows, total: Number(countR.rows[0].count), page: Number(page), limit: Number(limit) } });
  } catch (e) { res.status(400).json(fail(res, e.message)); }
});

// ─── User: Dashboard Content ─────────────────────────────────────────────
router.get('/user/contents/dashboard', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const banners = await pool.query(
      `SELECT c.*, u.full_name as creator_name FROM contents c LEFT JOIN users u ON c.creator_id=u.id
       WHERE c.status='published' AND c.audience_type='public' AND c.content_type IN ('transit_content','festival_content')
       ORDER BY c.published_at DESC LIMIT 5`
    );
    const freePredictions = await pool.query(
      `SELECT c.*, u.full_name as creator_name FROM contents c LEFT JOIN users u ON c.creator_id=u.id
       WHERE c.status='published' AND c.audience_type='public'
       ORDER BY c.published_at DESC LIMIT 10`
    );
    res.json({ success: true, data: { banners: banners.rows, freePredictions: freePredictions.rows } });
  } catch (e) { res.status(400).json(fail(res, e.message)); }
});

// ─── User: Free Information ──────────────────────────────────────────────
router.get('/user/contents/free-information', async (req, res) => {
  try {
    const { category, page = 1, limit = 15 } = req.query;
    const where = ['c.status=\'published\'', 'c.audience_type=\'public\''];
    const params = [];
    let idx = 1;
    if (category) { where.push(`c.astrology_category=$${idx}`); params.push(category); idx++; }
    const offset = (Number(page) - 1) * Number(limit);
    const r = await pool.query(
      `SELECT c.*, u.full_name as creator_name FROM contents c LEFT JOIN users u ON c.creator_id=u.id
       WHERE ${where.join(' AND ')} ORDER BY c.published_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, Number(limit), offset]
    );
    res.json({ success: true, data: r.rows });
  } catch (e) { res.status(400).json(fail(res, e.message)); }
});

// ─── User: My Perks ─────────────────────────────────────────────────────
router.get('/user/contents/perks', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const r = await pool.query(
      `SELECT c.*, u.full_name as creator_name FROM contents c LEFT JOIN users u ON c.creator_id=u.id
       WHERE c.status='published' AND c.audience_type IN ('all_subscribers','silver_subscribers','gold_subscribers','platinum_subscribers')
       AND (c.audience_type='all_subscribers'
         OR EXISTS (SELECT 1 FROM user_subscriptions us WHERE us.user_id=$1 AND us.status='active'
           AND (c.audience_type='silver_subscribers' OR c.audience_type='gold_subscribers' OR c.audience_type='platinum_subscribers')))
       ORDER BY c.published_at DESC LIMIT 20`,
      [userId]
    );
    res.json({ success: true, data: r.rows });
  } catch (e) { res.status(400).json(fail(res, e.message)); }
});

// ─── User: Content Detail ────────────────────────────────────────────────
router.get('/user/contents/:contentId', requireAuth, async (req, res) => {
  try {
    const { contentId } = req.params;
    const userId = req.user.id;
    const r = await pool.query(
      `SELECT c.*, u.full_name as creator_name FROM contents c LEFT JOIN users u ON c.creator_id=u.id WHERE c.id=$1 AND c.status='published'`,
      [contentId]
    );
    if (!r.rows.length) return res.status(404).json(fail('Content not found'));
    const content = r.rows[0];
    const eligible = await checkEligibility(userId, content);
    if (!eligible) return res.status(403).json(fail('Subscription required to view this content'));
    res.json({ success: true, data: content });
  } catch (e) { res.status(400).json(fail(res, e.message)); }
});

// ─── User: Mark Viewed ───────────────────────────────────────────────────
router.post('/user/contents/:contentId/view', requireAuth, async (req, res) => {
  try {
    const { contentId } = req.params;
    const userId = req.user.id;
    const existing = await pool.query('SELECT id FROM content_views WHERE content_id=$1 AND user_id=$2', [contentId, userId]);
    if (!existing.rows.length) {
      await pool.query('INSERT INTO content_views (content_id,user_id) VALUES ($1,$2)', [contentId, userId]);
      await pool.query('UPDATE contents SET view_count=view_count+1 WHERE id=$1', [contentId]);
    }
    res.json({ success: true, message: 'View recorded' });
  } catch (e) { res.status(400).json(fail(res, e.message)); }
});

// ─── User: Content Notifications ─────────────────────────────────────────
router.get('/user/content-notifications', requireAuth, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT cn.*, c.title as content_title, c.content_type, u.full_name as creator_name
       FROM content_notifications cn JOIN contents c ON cn.content_id=c.id LEFT JOIN users u ON c.creator_id=u.id
       WHERE cn.user_id=$1 ORDER BY cn.created_at DESC LIMIT 30`,
      [req.user.id]
    );
    res.json({ success: true, data: r.rows });
  } catch (e) { res.status(400).json(fail(res, e.message)); }
});

// ─── Astrologer: Content Analytics ───────────────────────────────────────
router.get('/astrologer/contents/:contentId/analytics', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'astrologer') return res.status(403).json(fail('Astrologer access required'));
    const { contentId } = req.params;
    const content = await pool.query('SELECT * FROM contents WHERE id=$1 AND creator_id=$2', [contentId, req.user.id]);
    if (!content.rows.length) return res.status(404).json(fail('Content not found'));
    const views = await pool.query('SELECT COUNT(*) FROM content_views WHERE content_id=$1', [contentId]);
    const notifications = await pool.query(
      `SELECT delivery_status, COUNT(*) as count FROM content_notifications WHERE content_id=$1 GROUP BY delivery_status`,
      [contentId]
    );
    res.json({ success: true, data: { content: content.rows[0], totalViews: Number(views.rows[0].count), notifications: notifications.rows } });
  } catch (e) { res.status(400).json(fail(res, e.message)); }
});

async function checkEligibility(userId, content) {
  if (content.audience_type === 'public') return true;
  if (content.audience_type === 'followers') {
    const f = await pool.query('SELECT 1 FROM user_follows WHERE user_id=$1 AND astrologer_id=$2 AND status=\'active\'', [userId, content.creator_id]);
    return f.rows.length > 0;
  }
  if (content.audience_type === 'all_subscribers') {
    const s = await pool.query('SELECT 1 FROM user_subscriptions WHERE user_id=$1 AND astrologer_id=$2 AND status=\'active\'', [userId, content.creator_id]);
    return s.rows.length > 0;
  }
  if (['silver_subscribers', 'gold_subscribers', 'platinum_subscribers'].includes(content.audience_type)) {
    const plan = content.audience_type.replace('_subscribers', '');
    const s = await pool.query('SELECT 1 FROM user_subscriptions WHERE user_id=$1 AND astrologer_id=$2 AND status=\'active\' AND plan_type=$3', [userId, content.creator_id, plan]);
    return s.rows.length > 0;
  }
  if (content.audience_type === 'selected_users') {
    const s = await pool.query('SELECT 1 FROM content_selected_users WHERE content_id=$1 AND user_id=$2', [content.id, userId]);
    return s.rows.length > 0;
  }
  return false;
}

async function createNotificationsForContent(contentId, content) {
  let users = [];
  if (content.audience_type === 'public') {
    const r = await pool.query('SELECT id FROM users WHERE id != $1 LIMIT 500', [content.creator_id]);
    users = r.rows;
  } else if (content.audience_type === 'followers') {
    const r = await pool.query('SELECT user_id as id FROM user_follows WHERE astrologer_id=$1 AND status=\'active\'', [content.creator_id]);
    users = r.rows;
  } else if (content.audience_type === 'all_subscribers') {
    const r = await pool.query('SELECT user_id as id FROM user_subscriptions WHERE astrologer_id=$1 AND status=\'active\'', [content.creator_id]);
    users = r.rows;
  } else if (['silver_subscribers', 'gold_subscribers', 'platinum_subscribers'].includes(content.audience_type)) {
    const plan = content.audience_type.replace('_subscribers', '');
    const r = await pool.query('SELECT user_id as id FROM user_subscriptions WHERE astrologer_id=$1 AND status=\'active\' AND plan_type=$2', [content.creator_id, plan]);
    users = r.rows;
  } else if (content.audience_type === 'selected_users') {
    const r = await pool.query('SELECT user_id as id FROM content_selected_users WHERE content_id=$1', [contentId]);
    users = r.rows;
  }
  for (const u of users) {
    await pool.query('INSERT INTO content_notifications (content_id,user_id,delivery_status,delivered_at) VALUES ($1,$2,\'delivered\',NOW())', [contentId, u.id]);
  }
}

export default router;
