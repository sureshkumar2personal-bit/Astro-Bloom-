import { Router } from 'express';
import { pool } from '../db/pool.js';
import { fail } from '../utils/response.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Astrologer: Audience dashboard
router.get('/astrologer/audience/dashboard', requireAuth('astrologer'), async (req, res) => {
  try {
    const [followers, subscribers, planDist, newThisMonth, pendingPerks] = await Promise.all([
      pool.query("SELECT COUNT(*) as total FROM user_follows WHERE astrologer_id=$1 AND status='active'", [req.auth.sub]),
      pool.query("SELECT COUNT(*) as total FROM user_subscriptions WHERE astrologer_id=$1 AND status='active'", [req.auth.sub]),
      pool.query(
        `SELECT sp.plan_code, COUNT(*) as count FROM user_subscriptions us
         JOIN subscription_plans sp ON sp.id = us.plan_id
         WHERE us.astrologer_id=$1 AND us.status='active'
         GROUP BY sp.plan_code`, [req.auth.sub]),
      pool.query(
        `SELECT COUNT(*) as followers FROM user_follows WHERE astrologer_id=$1 AND status='active' AND followed_at >= date_trunc('month', NOW())
         UNION ALL
         SELECT COUNT(*) as subscribers FROM user_subscriptions WHERE astrologer_id=$1 AND status='active' AND created_at >= date_trunc('month', NOW())`, [req.auth.sub]),
      pool.query(
        `SELECT COUNT(*) as pending FROM user_perks up
         WHERE up.astrologer_id=$1 AND up.status='available'
         AND up.perk_type='monthly_prediction' AND up.valid_until > NOW()
         AND NOT EXISTS (SELECT 1 FROM user_perks up2 WHERE up2.user_id = up.user_id AND up2.astrologer_id=$1 AND up2.perk_type='monthly_prediction' AND up2.used_count > 0 AND up2.valid_until > NOW())`,
        [req.auth.sub])
    ]);
    const dist = {};
    for (const r of planDist.rows) dist[r.plan_code] = parseInt(r.count);
    const newCounts = newThisMonth.rows;
    res.json({ success: true, data: {
      totalFollowers: parseInt(followers.rows[0].total),
      totalSubscribers: parseInt(subscribers.rows[0].total),
      newFollowersThisMonth: parseInt(newCounts[0]?.followers || 0),
      newSubscribersThisMonth: parseInt(newCounts[1]?.subscribers || 0),
      planDistribution: dist,
      pendingPerks: parseInt(pendingPerks.rows[0].pending)
    }});
  } catch (err) { fail(res, 'Failed to load dashboard.', 500); }
});

// Astrologer: List audience users (followers + subscribers)
router.get('/astrologer/audience/users', requireAuth('astrologer'), async (req, res) => {
  const { type, plan, status } = req.query;
  try {
    let users = [];

    if (type !== 'subscribers') {
      const followQ = await pool.query(
        `SELECT u.id, u.full_name, 'follower' as relationship_type, NULL as plan_name, f.status, f.followed_at as created_at
         FROM user_follows f JOIN users u ON u.id = f.user_id
         WHERE f.astrologer_id=$1 AND f.status != 'unfollowed'
         ORDER BY f.followed_at DESC LIMIT 50`, [req.auth.sub]);
      users = [...users, ...followQ.rows];
    }

    if (type !== 'followers') {
      let subWhere = "us.astrologer_id=$1";
      const subParams = [req.auth.sub];
      let idx = 2;
      if (status) { subWhere += ` AND us.status=$${idx}`; subParams.push(status); idx++; }
      if (plan) { subWhere += ` AND sp.plan_code=$${idx}`; subParams.push(plan); idx++; }
      const subQ = await pool.query(
        `SELECT u.id, u.full_name, 'subscriber' as relationship_type, sp.plan_name, us.status, us.expires_at as renewal_date, us.created_at
         FROM user_subscriptions us
         JOIN users u ON u.id = us.user_id
         JOIN subscription_plans sp ON sp.id = us.plan_id
         WHERE ${subWhere}
         ORDER BY us.created_at DESC LIMIT 50`, subParams);
      users = [...users, ...subQ.rows];
    }

    // Attach benefits used for subscribers
    for (const u of users) {
      if (u.relationship_type === 'subscriber') {
        const perks = await pool.query(
          "SELECT perk_type,total_count,used_count FROM user_perks WHERE user_id=$1 AND astrologer_id=$2 AND perk_type='free_question' AND valid_until > NOW()",
          [u.id, req.auth.sub]);
        const perk = perks.rows[0];
        u.benefitsUsed = perk ? `${perk.used_count}/${perk.total_count}` : '—';
      }
    }

    res.json({ success: true, data: users.map(u => ({
      userId: u.id, displayName: u.full_name, relationshipType: u.relationship_type,
      planName: u.plan_name, status: u.status, renewalDate: u.renewal_date,
      benefitsUsed: u.benefitsUsed || '—', createdAt: u.created_at
    }))});
  } catch (err) { fail(res, 'Failed to fetch audience.', 500); }
});

// Astrologer: Get user CRM detail
router.get('/astrologer/audience/users/:userId', requireAuth('astrologer'), async (req, res) => {
  const { userId } = req.params;
  try {
    const [user, subs, perks, questions] = await Promise.all([
      pool.query('SELECT id,full_name,email,mobile FROM users WHERE id=$1', [userId]),
      pool.query(
        `SELECT us.*, sp.plan_name, sp.plan_code FROM user_subscriptions us
         JOIN subscription_plans sp ON sp.id = us.plan_id
         WHERE us.user_id=$1 AND us.astrologer_id=$2 ORDER BY us.created_at DESC`, [userId, req.auth.sub]),
      pool.query(
        `SELECT * FROM user_perks WHERE user_id=$1 AND astrologer_id=$2 ORDER BY valid_until DESC`, [userId, req.auth.sub]),
      pool.query(
        `SELECT id,question_code,title,status,category,created_at FROM questions
         WHERE user_id=$1 AND astrologer_id=$2 ORDER BY created_at DESC LIMIT 10`, [userId, req.auth.sub])
    ]);
    if (!user.rows.length) return fail(res, 'User not found.', 404);
    const u = user.rows[0];
    const totalSpent = subs.rows.reduce((s, sub) => {
      const plan = { silver: 199, gold: 499, platinum: 999 };
      return s + (plan[sub.plan_code] || 0);
    }, 0);
    res.json({ success: true, data: {
      userId: u.id, fullName: u.full_name, email: u.email, mobile: u.mobile,
      totalSpent, interests: [],
      subscriptions: subs.rows.map(s => ({ id: s.id, planName: s.plan_name, planCode: s.plan_code, status: s.status, expiresAt: s.expires_at })),
      perks: perks.rows.map(p => ({ id: p.id, perkType: p.perk_type, title: p.title, totalCount: p.total_count, usedCount: p.used_count, status: p.status })),
      questions: questions.rows.map(q => ({ id: q.id, questionCode: q.question_code, title: q.title, status: q.status, category: q.category, createdAt: q.created_at }))
    }});
  } catch (err) { fail(res, 'Failed to load CRM.', 500); }
});

// Astrologer: Create content/perk
router.post('/astrologer/perks/content', requireAuth('astrologer'), async (req, res) => {
  const { title, contentType, body, audienceType, planCode, publishAt } = req.body;
  if (!title || !contentType || !audienceType) return fail(res, 'Title, content type, and audience are required.');
  try {
    const id = (await import('crypto')).randomUUID();
    await pool.query(
      `INSERT INTO astrologer_content_perks (id,astrologer_id,title,content_type,body,audience_type,plan_code,status,publish_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'draft',$8)`,
      [id, req.auth.sub, title, contentType, body || null, audienceType, planCode || null, publishAt || null]);
    res.status(201).json({ success: true, message: 'Content created.', data: { contentId: id, status: 'draft' } });
  } catch (err) { fail(res, 'Failed to create content.', 500); }
});

// Astrologer: Publish content
router.patch('/astrologer/perks/content/:contentId/publish', requireAuth('astrologer'), async (req, res) => {
  try {
    const res2 = await pool.query(
      "UPDATE astrologer_content_perks SET status='published',published_at=NOW(),updated_at=NOW() WHERE id=$1 AND astrologer_id=$2 AND status='draft' RETURNING id",
      [req.params.contentId, req.auth.sub]);
    if (!res2.rows.length) return fail(res, 'Draft content not found.', 404);
    res.json({ success: true, message: 'Content published.' });
  } catch (err) { fail(res, 'Failed to publish.', 500); }
});

// Astrologer: List content
router.get('/astrologer/perks/content', requireAuth('astrologer'), async (req, res) => {
  try {
    const rows = await pool.query(
      'SELECT * FROM astrologer_content_perks WHERE astrologer_id=$1 ORDER BY created_at DESC LIMIT 50', [req.auth.sub]);
    res.json({ success: true, data: rows.rows.map(r => ({
      id: r.id, title: r.title, contentType: r.content_type, body: r.body,
      audienceType: r.audience_type, planCode: r.plan_code, status: r.status,
      publishAt: r.publish_at, publishedAt: r.published_at, createdAt: r.created_at
    }))});
  } catch (err) { fail(res, 'Failed to fetch content.', 500); }
});

export default router;
