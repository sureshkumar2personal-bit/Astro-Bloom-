import { Router } from 'express';
import { pool } from '../db/pool.js';
import { fail } from '../utils/response.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/analytics/event', async (req, res) => {
  const { actorType, actorId, eventType, entityType, entityId, metadata } = req.body;
  if (!eventType) return fail(res, 'Event type is required.');
  await pool.query(
    'INSERT INTO analytics_events (actor_type,actor_id,event_type,entity_type,entity_id,metadata) VALUES ($1,$2,$3,$4,$5,$6)',
    [actorType || null, actorId || null, eventType, entityType || null, entityId || null, JSON.stringify(metadata || {})]
  );
  res.json({ success: true });
});

router.get('/astrologer/analytics', requireAuth('astrologer'), async (req, res) => {
  const profileViews = await pool.query(
    "SELECT COUNT(*)::int as count FROM analytics_events WHERE entity_type='astrologer_profile' AND entity_id=$1",
    [req.auth.sub]
  );
  const questionsAnswered = await pool.query(
    "SELECT COUNT(*)::int as count FROM question_answers WHERE astrologer_id=$1 AND status='submitted'",
    [req.auth.sub]
  );
  const totalEarnings = await pool.query(
    "SELECT COALESCE(SUM(astrologer_amount),0)::numeric as total FROM escrow_records WHERE astrologer_id=$1 AND status='released'",
    [req.auth.sub]
  );
  const subscriberCount = await pool.query(
    "SELECT COUNT(*)::int as count FROM user_subscriptions WHERE astrologer_id=$1 AND status='active'",
    [req.auth.sub]
  );
  const followerCount = await pool.query(
    "SELECT COUNT(*)::int as count FROM user_follows WHERE astrologer_id=$1 AND status='active'",
    [req.auth.sub]
  );
  const liveSessionCount = await pool.query(
    "SELECT COUNT(*)::int as count FROM live_sessions WHERE astrologer_id=$1",
    [req.auth.sub]
  );
  const avgRating = await pool.query(
    'SELECT COALESCE(AVG(rating),0)::numeric as avg, COUNT(*)::int as count FROM astrologer_reviews WHERE astrologer_id=$1',
    [req.auth.sub]
  );
  const recentEvents = await pool.query(
    'SELECT event_type, COUNT(*)::int as count FROM analytics_events WHERE actor_id=$1 AND created_at > NOW()-INTERVAL 30 days GROUP BY event_type ORDER BY count DESC',
    [req.auth.sub]
  );
  const dailyEarnings = await pool.query(
    `SELECT DATE(released_at) as date, SUM(astrologer_amount)::numeric as total
     FROM escrow_records WHERE astrologer_id=$1 AND status='released' AND released_at > NOW()-INTERVAL 30 days
     GROUP BY DATE(released_at) ORDER BY date`,
    [req.auth.sub]
  );
  res.json({ success: true, data: {
    profileViews: profileViews.rows[0].count,
    questionsAnswered: questionsAnswered.rows[0].count,
    totalEarnings: totalEarnings.rows[0].total,
    subscriberCount: subscriberCount.rows[0].count,
    followerCount: followerCount.rows[0].count,
    liveSessionCount: liveSessionCount.rows[0].count,
    averageRating: Number(avgRating.rows[0].avg).toFixed(1),
    totalReviews: avgRating.rows[0].count,
    recentActivity: recentEvents.rows,
    dailyEarnings: dailyEarnings.rows
  }});
});

router.get('/astrologer/analytics/earnings', requireAuth('astrologer'), async (req, res) => {
  const { period } = req.query;
  let interval = '30 days';
  if (period === '7d') interval = '7 days';
  else if (period === '90d') interval = '90 days';
  else if (period === '365d') interval = '365 days';
  const byType = await pool.query(
    `SELECT service_type, COUNT(*)::int as count, COALESCE(SUM(astrologer_amount),0)::numeric as total
     FROM escrow_records WHERE astrologer_id=$1 AND status='released' AND released_at > NOW()-INTERVAL '1' || $2::interval
     GROUP BY service_type`,
    [req.auth.sub, interval]
  );
  const byMonth = await pool.query(
    `SELECT TO_CHAR(released_at,'YYYY-MM') as month, SUM(astrologer_amount)::numeric as total
     FROM escrow_records WHERE astrologer_id=$1 AND status='released' AND released_at > NOW()-INTERVAL '1' || $2::interval
     GROUP BY TO_CHAR(released_at,'YYYY-MM') ORDER BY month`,
    [req.auth.sub, interval]
  );
  const commission = await pool.query(
    `SELECT COALESCE(SUM(platform_commission),0)::numeric as total_commission
     FROM escrow_records WHERE astrologer_id=$1 AND status='released' AND released_at > NOW()-INTERVAL '1' || $2::interval`,
    [req.auth.sub, interval]
  );
  res.json({ success: true, data: {
    byService: byType.rows,
    byMonth: byMonth.rows,
    totalCommissionPaid: commission.rows[0].total_commission
  }});
});

router.get('/astrologer/analytics/audience', requireAuth('astrologer'), async (req, res) => {
  const totalFollowers = await pool.query("SELECT COUNT(*)::int as count FROM user_follows WHERE astrologer_id=$1 AND status='active'", [req.auth.sub]);
  const totalSubscribers = await pool.query("SELECT COUNT(*)::int as count FROM user_subscriptions WHERE astrologer_id=$1 AND status='active'", [req.auth.sub]);
  const recentFollowers = await pool.query(
    `SELECT u.full_name,u.id,u.created_at FROM user_follows f JOIN users u ON u.id=f.user_id
     WHERE f.astrologer_id=$1 AND f.status='active' ORDER BY f.followed_at DESC LIMIT 10`,
    [req.auth.sub]
  );
  const recentSubscribers = await pool.query(
    `SELECT u.full_name,u.id,sp.plan_name,us.started_at,us.expires_at FROM user_subscriptions us
     JOIN users u ON u.id=us.user_id JOIN subscription_plans sp ON sp.id=us.plan_id
     WHERE us.astrologer_id=$1 AND us.status='active' ORDER BY us.started_at DESC LIMIT 10`,
    [req.auth.sub]
  );
  const topQuestions = await pool.query(
    `SELECT category,COUNT(*)::int as count FROM questions WHERE astrologer_id=$1 GROUP BY category ORDER BY count DESC LIMIT 5`,
    [req.auth.sub]
  );
  res.json({ success: true, data: {
    totalFollowers: totalFollowers.rows[0].count,
    totalSubscribers: totalSubscribers.rows[0].count,
    recentFollowers: recentFollowers.rows,
    recentSubscribers: recentSubscribers.rows,
    topQuestionCategories: topQuestions.rows
  }});
});

export default router;
