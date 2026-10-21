import { Router } from 'express';
import { pool } from '../db/pool.js';
import { fail } from '../utils/response.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// ═══════════════════════════════════════════════════════════════════
// 1. DAILY HOROSCOPE
// ═══════════════════════════════════════════════════════════════════
const ZODIAC_SIGNS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];

router.get('/horoscope/daily', async (req, res) => {
  const sign = (req.query.sign || '').trim();
  if (!sign || !ZODIAC_SIGNS.includes(sign)) return fail(res, 'Valid zodiac sign required.');
  const today = new Date().toISOString().slice(0, 10);
  const result = await pool.query('SELECT * FROM daily_horoscopes WHERE zodiac_sign=$1 AND date=$2', [sign, today]);
  if (!result.rows[0]) return fail(res, 'No horoscope available for today.', 404);
  res.json({ success: true, data: result.rows[0] });
});

router.get('/horoscope/daily/all', async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const result = await pool.query('SELECT * FROM daily_horoscopes WHERE date=$1 ORDER BY zodiac_sign', [today]);
  res.json({ success: true, data: result.rows });
});

router.post('/horoscope/daily', async (req, res) => {
  const { zodiacSign, prediction, loveRating, careerRating, healthRating, luckRating, luckyColor, luckyNumber } = req.body;
  if (!zodiacSign || !prediction) return fail(res, 'Zodiac sign and prediction required.');
  const today = new Date().toISOString().slice(0, 10);
  const result = await pool.query(
    `INSERT INTO daily_horoscopes (zodiac_sign,date,prediction,love_rating,career_rating,health_rating,luck_rating,lucky_color,lucky_number)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (zodiac_sign,date) DO UPDATE SET prediction=$3,love_rating=$4,career_rating=$5,health_rating=$6,luck_rating=$7,lucky_color=$8,lucky_number=$9
     RETURNING *`,
    [zodiacSign, today, prediction, loveRating||0, careerRating||0, healthRating||0, luckRating||0, luckyColor||null, luckyNumber||null]
  );
  res.json({ success: true, data: result.rows[0] });
});

// ═══════════════════════════════════════════════════════════════════
// 2. ASTROLOGER REVIEWS
// ═══════════════════════════════════════════════════════════════════
router.get('/astrologers/:id/reviews', async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const p = Math.max(1, parseInt(page)), l = Math.min(50, parseInt(limit) || 10), offset = (p - 1) * l;
  const [reviews, count, stats] = await Promise.all([
    pool.query(`SELECT r.*, u.full_name as user_name FROM astrologer_reviews r LEFT JOIN users u ON u.id = r.user_id WHERE r.astrologer_id=$1 ORDER BY r.created_at DESC LIMIT $2 OFFSET $3`, [req.params.id, l, offset]),
    pool.query('SELECT COUNT(*)::int as total FROM astrologer_reviews WHERE astrologer_id=$1', [req.params.id]),
    pool.query('SELECT AVG(rating)::numeric(3,2) as avg_rating, COUNT(*)::int as total_reviews, COUNT(CASE WHEN rating=5 THEN 1 END) as five_star, COUNT(CASE WHEN rating=4 THEN 1 END) as four_star, COUNT(CASE WHEN rating=3 THEN 1 END) as three_star, COUNT(CASE WHEN rating<=2 THEN 1 END) as low_star FROM astrologer_reviews WHERE astrologer_id=$1', [req.params.id])
  ]);
  res.json({ success: true, data: { reviews: reviews.rows, total: count.rows[0].total, stats: stats.rows[0], page: p, limit: l } });
});

router.post('/astrologers/:id/reviews', requireAuth, async (req, res) => {
  const { rating, title, reviewText, consultationType, consultationId, isAnonymous } = req.body;
  if (!rating || rating < 1 || rating > 5) return fail(res, 'Rating must be 1-5.');
  const existing = await pool.query('SELECT id FROM astrologer_reviews WHERE astrologer_id=$1 AND user_id=$2 AND consultation_id=$3', [req.params.id, req.auth.sub, consultationId || null]);
  if (existing.rows[0]) return fail(res, 'You have already reviewed this consultation.');
  const result = await pool.query(
    `INSERT INTO astrologer_reviews (astrologer_id,user_id,rating,title,review_text,consultation_type,consultation_id,is_anonymous) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [req.params.id, req.auth.sub, rating, title || null, reviewText || null, consultationType || 'general', consultationId || null, isAnonymous || false]
  );
  const avg = await pool.query('SELECT AVG(rating)::numeric(3,2) as avg, COUNT(*)::int as cnt FROM astrologer_reviews WHERE astrologer_id=$1', [req.params.id]);
  await pool.query('UPDATE astrologers SET average_rating=$1, review_count=$2 WHERE id=$3', [avg.rows[0].avg, avg.rows[0].cnt, req.params.id]);
  res.json({ success: true, data: result.rows[0] });
});

// ═══════════════════════════════════════════════════════════════════
// 3. ASTROLOGER SCHEDULE / AVAILABILITY
// ═══════════════════════════════════════════════════════════════════
router.get('/astrologer/schedule', requireAuth('astrologer'), async (req, res) => {
  const result = await pool.query('SELECT * FROM astrologer_schedule WHERE astrologer_id=$1 ORDER BY day_of_week', [req.auth.sub]);
  res.json({ success: true, data: result.rows });
});

router.put('/astrologer/schedule', requireAuth('astrologer'), async (req, res) => {
  const { schedule } = req.body;
  if (!Array.isArray(schedule)) return fail(res, 'Schedule array required.');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM astrologer_schedule WHERE astrologer_id=$1', [req.auth.sub]);
    for (const slot of schedule) {
      await client.query(
        'INSERT INTO astrologer_schedule (astrologer_id,day_of_week,start_time,end_time,is_available) VALUES ($1,$2,$3,$4,$5)',
        [req.auth.sub, slot.dayOfWeek, slot.startTime, slot.endTime, slot.isAvailable !== false]
      );
    }
    await client.query('COMMIT');
    const result = await pool.query('SELECT * FROM astrologer_schedule WHERE astrologer_id=$1 ORDER BY day_of_week', [req.auth.sub]);
    res.json({ success: true, data: result.rows });
  } catch (err) { await client.query('ROLLBACK'); throw err; } finally { client.release(); }
});

// ═══════════════════════════════════════════════════════════════════
// 4. ASTROLOGER EARNINGS DASHBOARD
// ═══════════════════════════════════════════════════════════════════
router.get('/astrologer/earnings-overview', requireAuth, async (req, res) => {
  const id = req.auth.sub;
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

  const [wallet, todayEarn, weekEarn, monthEarn, byService, trend] = await Promise.all([
    pool.query("SELECT available_balance,hold_balance FROM wallet_accounts WHERE owner_type='astrologer' AND owner_id=$1", [id]),
    pool.query("SELECT COALESCE(SUM(amount),0)::numeric as total FROM wallet_transactions WHERE owner_type='astrologer' AND owner_id=$1 AND transaction_type='credit' AND created_at::date=$2", [id, today]),
    pool.query("SELECT COALESCE(SUM(amount),0)::numeric as total FROM wallet_transactions WHERE owner_type='astrologer' AND owner_id=$1 AND transaction_type='credit' AND created_at::date >= $2", [id, weekAgo]),
    pool.query("SELECT COALESCE(SUM(amount),0)::numeric as total FROM wallet_transactions WHERE owner_type='astrologer' AND owner_id=$1 AND transaction_type='credit' AND created_at::date >= $2", [id, monthStart]),
    pool.query("SELECT service_type, COALESCE(SUM(amount),0)::numeric as total, COUNT(*)::int as count FROM wallet_transactions WHERE owner_type='astrologer' AND owner_id=$1 AND transaction_type='credit' AND created_at::date >= $2 GROUP BY service_type ORDER BY total DESC", [id, monthStart]),
    pool.query("SELECT created_at::date as date, COALESCE(SUM(amount),0)::numeric as earnings FROM wallet_transactions WHERE owner_type='astrologer' AND owner_id=$1 AND transaction_type='credit' AND created_at >= $2 GROUP BY created_at::date ORDER BY date", [id, monthStart])
  ]);
  res.json({
    success: true,
    data: {
      walletBalance: wallet.rows[0]?.available_balance || 0,
      holdBalance: wallet.rows[0]?.hold_balance || 0,
      todayEarnings: todayEarn.rows[0].total,
      weekEarnings: weekEarn.rows[0].total,
      monthEarnings: monthEarn.rows[0].total,
      byService: byService.rows,
      dailyTrend: trend.rows
    }
  });
});

// ═══════════════════════════════════════════════════════════════════
// 5. WITHDRAWAL REQUESTS
// ═══════════════════════════════════════════════════════════════════
router.get('/astrologer/withdrawals', requireAuth, async (req, res) => {
  const result = await pool.query('SELECT * FROM withdrawal_requests WHERE astrologer_id=$1 ORDER BY created_at DESC', [req.auth.sub]);
  res.json({ success: true, data: result.rows });
});

router.post('/astrologer/withdrawals', requireAuth, async (req, res) => {
  const { amount, bankName, accountNumber, ifscCode, accountHolderName, upiId } = req.body;
  if (!amount || amount <= 0) return fail(res, 'Valid amount required.');
  const wallet = await pool.query("SELECT id,available_balance FROM wallet_accounts WHERE owner_type='astrologer' AND owner_id=$1", [req.auth.sub]);
  if (!wallet.rows[0]) return fail(res, 'Wallet not found.', 404);
  if (wallet.rows[0].available_balance < amount) return fail(res, 'Insufficient balance.');
  const pending = await pool.query("SELECT id FROM withdrawal_requests WHERE astrologer_id=$1 AND status IN ('pending','processing')", [req.auth.sub]);
  if (pending.rows[0]) return fail(res, 'You already have a pending withdrawal request.');
  const result = await pool.query(
    `INSERT INTO withdrawal_requests (astrologer_id,amount,bank_name,account_number,ifsc_code,account_holder_name,upi_id) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [req.auth.sub, amount, bankName || null, accountNumber || null, ifscCode || null, accountHolderName || null, upiId || null]
  );
  await pool.query("UPDATE wallet_accounts SET available_balance=available_balance-$1,hold_balance=hold_balance+$1 WHERE id=$2", [amount, wallet.rows[0].id]);
  res.json({ success: true, data: result.rows[0] });
});

// ═══════════════════════════════════════════════════════════════════
// 6. RESPONSE TEMPLATES
// ═══════════════════════════════════════════════════════════════════
router.get('/astrologer/templates', requireAuth, async (req, res) => {
  const result = await pool.query('SELECT * FROM response_templates WHERE astrologer_id=$1 ORDER BY usage_count DESC', [req.auth.sub]);
  res.json({ success: true, data: result.rows });
});

router.post('/astrologer/templates', requireAuth, async (req, res) => {
  const { title, body, category } = req.body;
  if (!title || !body) return fail(res, 'Title and body required.');
  const result = await pool.query(
    'INSERT INTO response_templates (astrologer_id,title,body,category) VALUES ($1,$2,$3,$4) RETURNING *',
    [req.auth.sub, title, body, category || 'general']
  );
  res.json({ success: true, data: result.rows[0] });
});

router.put('/astrologer/templates/:id', requireAuth, async (req, res) => {
  const { title, body, category } = req.body;
  await pool.query('UPDATE response_templates SET title=COALESCE($1,title), body=COALESCE($2,body), category=COALESCE($3,category) WHERE id=$4 AND astrologer_id=$5',
    [title || null, body || null, category || null, req.params.id, req.auth.sub]);
  res.json({ success: true, message: 'Template updated.' });
});

router.delete('/astrologer/templates/:id', requireAuth, async (req, res) => {
  await pool.query('DELETE FROM response_templates WHERE id=$1 AND astrologer_id=$2', [req.params.id, req.auth.sub]);
  res.json({ success: true, message: 'Template deleted.' });
});

// ═══════════════════════════════════════════════════════════════════
// 7. CLIENT NOTES
// ═══════════════════════════════════════════════════════════════════
router.get('/astrologer/client-notes', requireAuth, async (req, res) => {
  const result = await pool.query(
    `SELECT cn.*, u.full_name as client_name, u.email as client_email
     FROM client_notes cn LEFT JOIN users u ON u.id = cn.user_id
     WHERE cn.astrologer_id=$1 ORDER BY cn.updated_at DESC`, [req.auth.sub]
  );
  res.json({ success: true, data: result.rows });
});

router.get('/astrologer/client-notes/:userId', requireAuth, async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM client_notes WHERE astrologer_id=$1 AND user_id=$2 ORDER BY created_at DESC',
    [req.auth.sub, req.params.userId]
  );
  res.json({ success: true, data: result.rows });
});

router.post('/astrologer/client-notes', requireAuth, async (req, res) => {
  const { userId, note, tags } = req.body;
  if (!userId || !note) return fail(res, 'User ID and note required.');
  const result = await pool.query(
    'INSERT INTO client_notes (astrologer_id,user_id,note,tags) VALUES ($1,$2,$3,$4) RETURNING *',
    [req.auth.sub, userId, note, tags || null]
  );
  res.json({ success: true, data: result.rows[0] });
});

router.put('/astrologer/client-notes/:id', requireAuth, async (req, res) => {
  const { note, tags } = req.body;
  await pool.query('UPDATE client_notes SET note=COALESCE($1,note), tags=COALESCE($2,tags), updated_at=NOW() WHERE id=$3 AND astrologer_id=$4',
    [note || null, tags || null, req.params.id, req.auth.sub]);
  res.json({ success: true, message: 'Note updated.' });
});

router.delete('/astrologer/client-notes/:id', requireAuth, async (req, res) => {
  await pool.query('DELETE FROM client_notes WHERE id=$1 AND astrologer_id=$2', [req.params.id, req.auth.sub]);
  res.json({ success: true, message: 'Note deleted.' });
});

// ═══════════════════════════════════════════════════════════════════
// 8. CONSULTATION HISTORY (User)
// ═══════════════════════════════════════════════════════════════════
router.get('/user/consultation-history', requireAuth('user'), async (req, res) => {
  const { type, page = 1, limit = 20 } = req.query;
  const p = Math.max(1, parseInt(page)), l = Math.min(50, parseInt(limit) || 20), offset = (p - 1) * l;
  let where = ['ch.user_id=$1'];
  const params = [req.auth.sub]; let idx = 2;
  if (type) { where.push(`ch.type=$${idx}`); params.push(type); idx++; }
  const [rows, count] = await Promise.all([
    pool.query(`SELECT ch.*, a.display_name as astrologer_name FROM consultation_history ch LEFT JOIN astrologers a ON a.id = ch.astrologer_id WHERE ${where.join(' AND ')} ORDER BY ch.created_at DESC LIMIT $${idx} OFFSET $${idx+1}`, [...params, l, offset]),
    pool.query(`SELECT COUNT(*)::int as total FROM consultation_history ch WHERE ${where.join(' AND ')}`, params)
  ]);
  res.json({ success: true, data: { items: rows.rows, total: count.rows[0].total, page: p, limit: l } });
});

// ═══════════════════════════════════════════════════════════════════
// 9. NOTIFICATIONS (with unread count)
// ═══════════════════════════════════════════════════════════════════
router.get('/user/notifications', requireAuth, async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const p = Math.max(1, parseInt(page)), l = Math.min(50, parseInt(limit) || 20), offset = (p - 1) * l;
  const [rows, count, unread] = await Promise.all([
    pool.query(`SELECT * FROM notifications WHERE actor_type='user' AND actor_id=$1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`, [req.auth.sub, l, offset]),
    pool.query('SELECT COUNT(*)::int as total FROM notifications WHERE actor_type=$1 AND actor_id=$2', ['user', req.auth.sub]),
    pool.query('SELECT COUNT(*)::int as count FROM notifications WHERE actor_type=$1 AND actor_id=$2 AND read_at IS NULL', ['user', req.auth.sub])
  ]);
  res.json({ success: true, data: { items: rows.rows, total: count.rows[0].total, unreadCount: unread.rows[0].count, page: p, limit: l } });
});

router.get('/user/notifications/unread-count', requireAuth('user'), async (req, res) => {
  const result = await pool.query('SELECT COUNT(*)::int as count FROM notifications WHERE actor_type=$1 AND actor_id=$2 AND read_at IS NULL', ['user', req.auth.sub]);
  res.json({ success: true, data: { count: result.rows[0].count } });
});

router.post('/user/notifications/:id/read', requireAuth, async (req, res) => {
  await pool.query('UPDATE notifications SET read_at=NOW() WHERE id=$1 AND actor_type=$2 AND actor_id=$3', [req.params.id, 'user', req.auth.sub]);
  res.json({ success: true });
});

router.post('/user/notifications/read-all', requireAuth, async (req, res) => {
  await pool.query('UPDATE notifications SET read_at=NOW() WHERE actor_type=$1 AND actor_id=$2 AND read_at IS NULL', ['user', req.auth.sub]);
  res.json({ success: true });
});

// ═══════════════════════════════════════════════════════════════════
// 10. ASTROLOGER PROFILE COMPLETION
// ═══════════════════════════════════════════════════════════════════
router.get('/astrologer/profile-completion', requireAuth, async (req, res) => {
  const a = await pool.query(
    `SELECT a.*, (SELECT COUNT(*)::int FROM astrologer_languages WHERE astrologer_id=a.id) as lang_count,
     (SELECT COUNT(*)::int FROM astrologer_specializations WHERE astrologer_id=a.id) as spec_count,
     (SELECT COUNT(*)::int FROM astrologer_certificates WHERE astrologer_id=a.id) as cert_count
     FROM astrologers a WHERE a.id=$1`, [req.auth.sub]
  );
  if (!a.rows[0]) return fail(res, 'Astrologer not found.', 404);
  const astro = a.rows[0];
  const checks = [
    { label: 'Profile Photo', done: !!astro.profile_photo_url, points: 15 },
    { label: 'Short Bio', done: !!astro.short_bio && astro.short_bio.length > 20, points: 10 },
    { label: 'Long Bio', done: !!astro.long_bio && astro.long_bio.length > 50, points: 15 },
    { label: 'Professional Title', done: !!astro.professional_title, points: 10 },
    { label: 'Languages (2+)', done: astro.lang_count >= 2, points: 10 },
    { label: 'Specializations (2+)', done: astro.spec_count >= 2, points: 10 },
    { label: 'City / Location', done: !!astro.city, points: 5 },
    { label: 'Consultation Style', done: !!astro.consultation_style, points: 5 },
    { label: 'Experience Years', done: (astro.experience_years || 0) > 0, points: 5 },
    { label: 'Certificates (1+)', done: astro.cert_count >= 1, points: 15 },
  ];
  const completed = checks.filter(c => c.done).reduce((sum, c) => sum + c.points, 0);
  res.json({ success: true, data: { percentage: completed, checks } });
});

// ═══════════════════════════════════════════════════════════════════
// 11. ASTROLOGER REVIEW MANAGEMENT
// ═══════════════════════════════════════════════════════════════════
router.get('/astrologer/reviews', requireAuth, async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const p = Math.max(1, parseInt(page)), l = Math.min(50, parseInt(limit) || 20), offset = (p - 1) * l;
  const [rows, count, stats] = await Promise.all([
    pool.query(`SELECT r.*, CASE WHEN r.is_anonymous THEN 'Anonymous' ELSE u.full_name END as user_name FROM astrologer_reviews r LEFT JOIN users u ON u.id = r.user_id WHERE r.astrologer_id=$1 ORDER BY r.created_at DESC LIMIT $2 OFFSET $3`, [req.auth.sub, l, offset]),
    pool.query('SELECT COUNT(*)::int as total FROM astrologer_reviews WHERE astrologer_id=$1', [req.auth.sub]),
    pool.query('SELECT AVG(rating)::numeric(3,2) as avg_rating, COUNT(*)::int as total_reviews FROM astrologer_reviews WHERE astrologer_id=$1', [req.auth.sub])
  ]);
  res.json({ success: true, data: { reviews: rows.rows, total: count.rows[0].total, stats: stats.rows[0], page: p, limit: l } });
});

router.put('/astrologer/reviews/:id/reply', requireAuth, async (req, res) => {
  const { adminReply } = req.body;
  if (!adminReply) return fail(res, 'Reply text required.');
  await pool.query('UPDATE astrologer_reviews SET admin_reply=$1, updated_at=NOW() WHERE id=$2 AND astrologer_id=$3', [adminReply, req.params.id, req.auth.sub]);
  res.json({ success: true, message: 'Reply added.' });
});

export default router;
