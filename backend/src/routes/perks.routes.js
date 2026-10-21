import { Router } from 'express';
import { pool } from '../db/pool.js';
import { fail } from '../utils/response.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// User: Get my perks
router.get('/user/perks', requireAuth('user'), async (req, res) => {
  try {
    const rows = await pool.query(
      `SELECT up.*, a.display_name as astrologer_name, sp.plan_name
       FROM user_perks up
       JOIN astrologers a ON a.id = up.astrologer_id
       LEFT JOIN user_subscriptions us ON us.id = up.subscription_id
       LEFT JOIN subscription_plans sp ON sp.id = us.plan_id
       WHERE up.user_id=$1 ORDER BY up.valid_until DESC`, [req.auth.sub]);
    res.json({ success: true, data: rows.rows.map(r => ({
      id: r.id, astrologerId: r.astrologer_id, astrologerName: r.astrologer_name,
      planName: r.plan_name, perkType: r.perk_type, title: r.title,
      totalCount: r.total_count, usedCount: r.used_count,
      remainingCount: r.total_count - r.used_count, status: r.status,
      validFrom: r.valid_from, validUntil: r.valid_until
    }))});
  } catch (err) { fail(res, 'Failed to fetch perks.', 500); }
});

// User: Use a perk
router.post('/user/perks/:perkId/use', requireAuth('user'), async (req, res) => {
  const { serviceType, referenceId } = req.body;
  try {
    const pRes = await pool.query('SELECT * FROM user_perks WHERE id=$1 AND user_id=$2', [req.params.perkId, req.auth.sub]);
    if (!pRes.rows.length) return fail(res, 'Perk not found.', 404);
    const perk = pRes.rows[0];
    if (perk.status === 'expired' || perk.status === 'locked' || perk.status === 'cancelled') {
      return fail(res, 'This perk is no longer available.');
    }
    if (perk.used_count >= perk.total_count) return fail(res, 'This perk has been fully used.');
    if (new Date(perk.valid_until) < new Date()) return fail(res, 'This perk has expired.');

    const newUsed = perk.used_count + 1;
    const newStatus = newUsed >= perk.total_count ? 'used' : 'partially_used';
    await pool.query('UPDATE user_perks SET used_count=$1,status=$2,updated_at=NOW() WHERE id=$3', [newUsed, newStatus, perk.id]);

    res.json({ success: true, message: 'Perk used successfully', data: { remainingCount: perk.total_count - newUsed, status: newStatus } });
  } catch (err) { fail(res, 'Failed to use perk.', 500); }
});

export default router;
