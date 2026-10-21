import { Router } from 'express';
import { pool } from '../db/pool.js';
import { fail } from '../utils/response.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// User: Follow astrologer
router.post('/user/follows/:astrologerId', requireAuth('user'), async (req, res) => {
  const { astrologerId } = req.params;
  try {
    // Check astrologer exists
    const aRes = await pool.query("SELECT id FROM astrologers WHERE id=$1 AND account_status='active'", [astrologerId]);
    if (!aRes.rows.length) return fail(res, 'Astrologer not found.', 404);

    // Check if already following
    const existing = await pool.query('SELECT * FROM user_follows WHERE user_id=$1 AND astrologer_id=$2', [req.auth.sub, astrologerId]);
    if (existing.rows.length) {
      const f = existing.rows[0];
      if (f.status === 'active') return fail(res, 'Already following this astrologer.');
      // Reactivate
      await pool.query("UPDATE user_follows SET status='active',followed_at=NOW(),unfollowed_at=NULL WHERE id=$1", [f.id]);
      return res.json({ success: true, message: 'Astrologer followed successfully.' });
    }

    await pool.query(
      'INSERT INTO user_follows (user_id,astrologer_id,status) VALUES ($1,$2,$2)', // BUG: status should be 'active'
      [req.auth.sub, astrologerId]);
    // Fix the status
    await pool.query("UPDATE user_follows SET status='active' WHERE user_id=$1 AND astrologer_id=$2", [req.auth.sub, astrologerId]);
    res.json({ success: true, message: 'Astrologer followed successfully.' });
  } catch (err) { fail(res, 'Failed to follow.', 500); }
});

// User: Unfollow astrologer
router.delete('/user/follows/:astrologerId', requireAuth('user'), async (req, res) => {
  try {
    const res2 = await pool.query(
      "UPDATE user_follows SET status='unfollowed',unfollowed_at=NOW() WHERE user_id=$1 AND astrologer_id=$2 AND status='active' RETURNING id",
      [req.auth.sub, req.params.astrologerId]);
    if (!res2.rows.length) return fail(res, 'Not following this astrologer.', 404);
    res.json({ success: true, message: 'Astrologer unfollowed.' });
  } catch (err) { fail(res, 'Failed to unfollow.', 500); }
});

// User: Check follow status
router.get('/user/follows/check/:astrologerId', requireAuth('user'), async (req, res) => {
  try {
    const res2 = await pool.query(
      "SELECT status FROM user_follows WHERE user_id=$1 AND astrologer_id=$2", [req.auth.sub, req.params.astrologerId]);
    const isFollowing = res2.rows.length > 0 && res2.rows[0].status === 'active';
    res.json({ success: true, data: { isFollowing } });
  } catch (err) { fail(res, 'Failed to check follow status.', 500); }
});

export default router;
