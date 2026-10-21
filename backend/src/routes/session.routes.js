import { Router } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { pool } from '../db/pool.js';
import { fail } from '../utils/response.js';
import { secret, refreshSecret, requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/user/forgot-password', async (req, res) => {
  const { identifier } = req.body;
  if (!identifier) return fail(res, 'Email or mobile is required.');
  const result = await pool.query('SELECT id FROM users WHERE mobile=$1 OR email=$1', [identifier]);
  if (!result.rows[0]) return res.json({ success: true, message: 'If an account exists, a reset link has been sent.' });
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = await bcrypt.hash(token, 10);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await pool.query(
    'INSERT INTO password_resets (actor_type,actor_id,token_hash,expires_at) VALUES ($1,$2,$3,$4)',
    ['user', result.rows[0].id, tokenHash, expiresAt]
  );
  res.json({ success: true, message: 'If an account exists, a reset link has been sent.', data: { resetToken: token } });
});

router.post('/astrologer/forgot-password', async (req, res) => {
  const { identifier } = req.body;
  if (!identifier) return fail(res, 'Email or mobile is required.');
  const result = await pool.query('SELECT id FROM astrologers WHERE mobile=$1 OR email=$1', [identifier]);
  if (!result.rows[0]) return res.json({ success: true, message: 'If an account exists, a reset link has been sent.' });
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = await bcrypt.hash(token, 10);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await pool.query(
    'INSERT INTO password_resets (actor_type,actor_id,token_hash,expires_at) VALUES ($1,$2,$3,$4)',
    ['astrologer', result.rows[0].id, tokenHash, expiresAt]
  );
  res.json({ success: true, message: 'If an account exists, a reset link has been sent.', data: { resetToken: token } });
});

router.post('/user/reset-password', async (req, res) => {
  const { token, newPassword, confirmPassword } = req.body;
  if (!token || !newPassword || !confirmPassword) return fail(res, 'All fields are required.');
  if (newPassword !== confirmPassword) return fail(res, 'Passwords do not match.');
  if (newPassword.length < 8) return fail(res, 'Password must be at least 8 characters.');
  const result = await pool.query(
    "SELECT id,actor_id FROM password_resets WHERE actor_type='user' AND used=false AND expires_at>NOW() ORDER BY created_at DESC LIMIT 10",
    []
  );
  let matched = null;
  for (const row of result.rows) {
    if (await bcrypt.compare(token, row.token_hash)) { matched = row; break; }
  }
  if (!matched) return fail(res, 'Invalid or expired reset token.', 400);
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await pool.query('UPDATE users SET password_hash=$1,updated_at=NOW() WHERE id=$2', [passwordHash, matched.actor_id]);
  await pool.query('UPDATE password_resets SET used=true WHERE id=$1', [matched.id]);
  res.json({ success: true, message: 'Password reset successfully.' });
});

router.post('/astrologer/reset-password', async (req, res) => {
  const { token, newPassword, confirmPassword } = req.body;
  if (!token || !newPassword || !confirmPassword) return fail(res, 'All fields are required.');
  if (newPassword !== confirmPassword) return fail(res, 'Passwords do not match.');
  if (newPassword.length < 8) return fail(res, 'Password must be at least 8 characters.');
  const result = await pool.query(
    "SELECT id,actor_id FROM password_resets WHERE actor_type='astrologer' AND used=false AND expires_at>NOW() ORDER BY created_at DESC LIMIT 10",
    []
  );
  let matched = null;
  for (const row of result.rows) {
    if (await bcrypt.compare(token, row.token_hash)) { matched = row; break; }
  }
  if (!matched) return fail(res, 'Invalid or expired reset token.', 400);
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await pool.query('UPDATE astrologers SET password_hash=$1,updated_at=NOW() WHERE id=$2', [passwordHash, matched.actor_id]);
  await pool.query('UPDATE password_resets SET used=true WHERE id=$1', [matched.id]);
  res.json({ success: true, message: 'Password reset successfully.' });
});

router.get('/user/sessions', requireAuth('user'), async (req, res) => {
  const result = await pool.query(
    'SELECT id,device_info,ip_address,last_active_at,created_at FROM active_session_log WHERE actor_type=$1 AND actor_id=$2 ORDER BY last_active_at DESC',
    ['user', req.auth.sub]
  );
  res.json({ success: true, data: result.rows.map(r => ({ id: r.id, deviceInfo: r.device_info, ipAddress: r.ip_address, lastActiveAt: r.last_active_at, createdAt: r.created_at })) });
});

router.get('/astrologer/sessions', requireAuth('astrologer'), async (req, res) => {
  const result = await pool.query(
    'SELECT id,device_info,ip_address,last_active_at,created_at FROM active_session_log WHERE actor_type=$1 AND actor_id=$2 ORDER BY last_active_at DESC',
    ['astrologer', req.auth.sub]
  );
  res.json({ success: true, data: result.rows.map(r => ({ id: r.id, deviceInfo: r.device_info, ipAddress: r.ip_address, lastActiveAt: r.last_active_at, createdAt: r.created_at })) });
});

router.delete('/user/sessions/:sessionId', requireAuth('user'), async (req, res) => {
  const result = await pool.query(
    'DELETE FROM active_session_log WHERE id=$1 AND actor_type=$2 AND actor_id=$3',
    [req.params.sessionId, 'user', req.auth.sub]
  );
  if (result.rowCount === 0) return fail(res, 'Session not found.', 404);
  res.json({ success: true, message: 'Session revoked.' });
});

router.delete('/astrologer/sessions/:sessionId', requireAuth('astrologer'), async (req, res) => {
  const result = await pool.query(
    'DELETE FROM active_session_log WHERE id=$1 AND actor_type=$2 AND actor_id=$3',
    [req.params.sessionId, 'astrologer', req.auth.sub]
  );
  if (result.rowCount === 0) return fail(res, 'Session not found.', 404);
  res.json({ success: true, message: 'Session revoked.' });
});

router.delete('/user/sessions', requireAuth('user'), async (req, res) => {
  await pool.query('DELETE FROM active_session_log WHERE actor_type=$1 AND actor_id=$2', ['user', req.auth.sub]);
  res.json({ success: true, message: 'All other sessions revoked.' });
});

router.delete('/astrologer/sessions', requireAuth('astrologer'), async (req, res) => {
  await pool.query('DELETE FROM active_session_log WHERE actor_type=$1 AND actor_id=$2', ['astrologer', req.auth.sub]);
  res.json({ success: true, message: 'All other sessions revoked.' });
});

export default router;
