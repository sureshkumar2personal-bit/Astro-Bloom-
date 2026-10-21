import { Router } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { secret, refreshSecret } from '../middleware/auth.js';
import { fail } from '../utils/response.js';
import jwt from 'jsonwebtoken';

const router = Router();
const uid = () => crypto.randomUUID();
const INVITE_EXPIRY_HOURS = 48;

const MODULES = [
  'dashboard', 'profile', 'text_questions', 'appointments', 'content',
  'live_streaming', 'wallet', 'disputes', 'atonement', 'staff_management',
  'audience', 'analytics', 'messages', 'notifications', 'free_calculations'
];
const ACTIONS = ['view', 'create', 'edit', 'delete', 'approve', 'publish', 'cancel', 'withdraw', 'manage_permissions'];

const OWNER_ONLY_MODULES = ['staff_management', 'wallet'];
const OWNER_ONLY_ACTIONS = ['withdraw', 'manage_permissions'];

async function logActivity(pool, astrologerId, staffId, actorType, actionKey, moduleKey, recordId, oldValue, newValue, ip, device) {
  await pool.query(
    `INSERT INTO astrologer_staff_activity_logs (astrologer_id,staff_id,actor_type,action_key,module_key,record_id,old_value,new_value,ip_address,device_info)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [astrologerId, staffId, actorType, actionKey, moduleKey, recordId || null, oldValue ? JSON.stringify(oldValue) : null, newValue ? JSON.stringify(newValue) : null, ip || null, device || null]
  );
}

async function logSecurityEvent(pool, astrologerId, triggeredByType, triggeredById, eventType, reason, metadata) {
  await pool.query(
    `INSERT INTO astrologer_security_events (astrologer_id,triggered_by_type,triggered_by_id,event_type,reason,metadata)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [astrologerId, triggeredByType, triggeredById || null, eventType, reason || null, metadata ? JSON.stringify(metadata) : null]
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC ROUTES (no auth required)
// ═══════════════════════════════════════════════════════════════════════════

router.post('/astrologer/staff/accept-invite', async (req, res) => {
  const { inviteToken, password, confirmPassword } = req.body;
  if (!inviteToken) return fail(res, 'Invite token is required.');
  if (!password || !confirmPassword) return fail(res, 'Password and confirm password are required.');
  if (password !== confirmPassword) return fail(res, 'Passwords do not match.');
  if (password.length < 8) return fail(res, 'Password must be at least 8 characters.');
  try {
    const tokenHash = await bcrypt.hash(inviteToken, 10);
    const result = await pool.query(
      `SELECT id, astrologer_id, email, mobile, status, invite_expires_at, full_name, role_name
       FROM astrologer_staff_accounts
       WHERE invite_token_hash IS NOT NULL AND status='invited'`,
      []
    );
    let staff = null;
    for (const row of result.rows) {
      if (await bcrypt.compare(inviteToken, row.invite_token_hash)) {
        staff = row;
        break;
      }
    }
    if (!staff) return fail(res, 'Invalid invite token.', 404);
    if (staff.invite_expires_at && new Date(staff.invite_expires_at) < new Date())
      return fail(res, 'This invite has expired. Please request a new one.', 410);
    const passwordHash = await bcrypt.hash(password, 12);
    await pool.query(
      `UPDATE astrologer_staff_accounts
       SET password_hash=$1, status='active', invite_token_hash=NULL, invite_expires_at=NULL, updated_at=NOW()
       WHERE id=$2`,
      [passwordHash, staff.id]
    );
    await logActivity(pool, staff.astrologer_id, staff.id, 'staff', 'invite_accepted', 'staff_management', staff.id, null, { status: 'active' }, req.ip, req.headers['user-agent']);
    res.json({ success: true, message: 'Invite accepted. You can now log in.', data: { staffId: staff.id, status: 'active' } });
  } catch (err) {
    throw err;
  }
});

router.post('/astrologer/staff/login', async (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) return fail(res, 'Email/mobile and password are required.');
  try {
    const result = await pool.query(
      `SELECT id, astrologer_id, full_name, email, mobile, role_name, status, password_hash, access_expires_at
       FROM astrologer_staff_accounts
       WHERE email=$1 OR mobile=$1`,
      [identifier]
    );
    const staff = result.rows[0];
    if (!staff) return fail(res, 'Invalid email/mobile or password.', 401);
    if (staff.status !== 'active') return fail(res, 'This staff account is not active.', 403);
    if (staff.access_expires_at && new Date(staff.access_expires_at) < new Date())
      return fail(res, 'Your access has expired. Please contact the astrologer.', 403);
    if (!staff.password_hash || !await bcrypt.compare(password, staff.password_hash))
      return fail(res, 'Invalid email/mobile or password.', 401);
    const permResult = await pool.query(
      `SELECT module_key, action_key, is_allowed FROM astrologer_staff_permissions WHERE staff_id=$1`,
      [staff.id]
    );
    const permissions = permResult.rows.filter(p => p.is_allowed).map(p => `${p.module_key}:${p.action_key}`);
    const accessToken = jwt.sign({ sub: staff.id, actorType: 'staff', role: staff.role_name, astrologerId: staff.astrologer_id, permissions }, secret, { expiresIn: '1h' });
    const refreshToken = jwt.sign({ sub: staff.id, actorType: 'staff' }, refreshSecret, { expiresIn: '30d' });
    const refreshHash = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await pool.query(
      `INSERT INTO astrologer_staff_sessions (staff_id, refresh_token_hash, ip_address, device_info, expires_at)
       VALUES ($1,$2,$3,$4,$5)`,
      [staff.id, refreshHash, req.ip, req.headers['user-agent'], expiresAt]
    );
    await pool.query(`UPDATE astrologer_staff_accounts SET last_login_at=NOW() WHERE id=$1`, [staff.id]);
    await logActivity(pool, staff.astrologer_id, staff.id, 'staff', 'staff_login', 'staff_management', staff.id, null, null, req.ip, req.headers['user-agent']);
    res.json({
      success: true, message: 'Login successful',
      data: {
        accessToken, refreshToken,
        staff: { id: staff.id, fullName: staff.full_name, roleName: staff.role_name, permissions }
      }
    });
  } catch (err) {
    throw err;
  }
});

router.post('/astrologer/staff/refresh-token', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return fail(res, 'Refresh token is required.');
  try {
    let payload;
    try { payload = jwt.verify(refreshToken, refreshSecret); } catch { return fail(res, 'Invalid refresh token.', 401); }
    if (payload.actorType !== 'staff') return fail(res, 'Invalid token type.', 401);
    const result = await pool.query(
      `SELECT id, s.id as session_id, s.staff_id, s.expires_at, s.revoked_at,
              a.full_name, a.role_name, a.status, a.astrologer_id, a.access_expires_at
       FROM astrologer_staff_sessions s
       JOIN astrologer_staff_accounts a ON a.id = s.staff_id
       WHERE s.staff_id=$1 AND s.revoked_at IS NULL`,
      [payload.sub]
    );
    let session = null;
    for (const row of result.rows) {
      if (await bcrypt.compare(refreshToken, row.refresh_token_hash)) {
        session = row;
        break;
      }
    }
    if (!session) return fail(res, 'Session not found or revoked.', 401);
    if (new Date(session.expires_at) < new Date()) return fail(res, 'Refresh token has expired.', 401);
    if (session.status !== 'active') return fail(res, 'Staff account is not active.', 403);
    if (session.access_expires_at && new Date(session.access_expires_at) < new Date())
      return fail(res, 'Your access has expired.', 403);
    const permResult = await pool.query(
      `SELECT module_key, action_key, is_allowed FROM astrologer_staff_permissions WHERE staff_id=$1`,
      [session.staff_id]
    );
    const permissions = permResult.rows.filter(p => p.is_allowed).map(p => `${p.module_key}:${p.action_key}`);
    const newAccessToken = jwt.sign(
      { sub: session.staff_id, actorType: 'staff', role: session.role_name, astrologerId: session.astrologer_id, permissions },
      secret, { expiresIn: '1h' }
    );
    res.json({ success: true, data: { accessToken: newAccessToken } });
  } catch (err) {
    throw err;
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// OWNER ASTROLOGER ROUTES (require auth)
// ═══════════════════════════════════════════════════════════════════════════

router.get('/astrologer/staff', requireAuth('astrologer'), async (req, res) => {
  try {
    const astrologerId = req.auth.sub;
    const staffResult = await pool.query(
      `SELECT id, full_name, email, mobile, role_name, status, last_login_at, access_expires_at, created_at
       FROM astrologer_staff_accounts WHERE astrologer_id=$1 AND status != 'removed' ORDER BY created_at DESC`,
      [astrologerId]
    );
    const staff = staffResult.rows;
    const summary = { totalStaff: staff.length, activeStaff: 0, pendingInvites: 0, disabledStaff: 0 };
    staff.forEach(s => {
      if (s.status === 'active') summary.activeStaff++;
      else if (s.status === 'invited') summary.pendingInvites++;
      else if (s.status === 'disabled') summary.disabledStaff++;
    });
    const alertResult = await pool.query(
      `SELECT COUNT(*)::int as count FROM astrologer_security_events
       WHERE astrologer_id=$1 AND created_at > NOW() - INTERVAL '24 hours'`,
      [astrologerId]
    );
    summary.securityAlerts = alertResult.rows[0].count;
    res.json({ success: true, data: { summary, staff } });
  } catch (err) {
    throw err;
  }
});

router.post('/astrologer/staff', requireAuth('astrologer'), async (req, res) => {
  const astrologerId = req.auth.sub;
  const { fullName, email, mobile, roleName, permissions, accessExpiresAt, notes } = req.body;
  if (!fullName) return fail(res, 'Full name is required.');
  if (!email && !mobile) return fail(res, 'Email or mobile is required.');
  if (!roleName) return fail(res, 'Role name is required.');
  if (!permissions || !Array.isArray(permissions) || permissions.length === 0)
    return fail(res, 'At least one permission is required.');
  try {
    if (email) {
      const dup = await pool.query(
        `SELECT id FROM astrologer_staff_accounts WHERE astrologer_id=$1 AND email=$2 AND status != 'removed'`,
        [astrologerId, email]
      );
      if (dup.rows.length > 0) return fail(res, 'A staff member with this email already exists.');
    }
    if (mobile) {
      const dup = await pool.query(
        `SELECT id FROM astrologer_staff_accounts WHERE astrologer_id=$1 AND mobile=$2 AND status != 'removed'`,
        [astrologerId, mobile]
      );
      if (dup.rows.length > 0) return fail(res, 'A staff member with this mobile number already exists.');
    }
    const staffId = uid();
    const inviteToken = crypto.randomBytes(32).toString('hex');
    const inviteTokenHash = await bcrypt.hash(inviteToken, 10);
    const inviteExpires = new Date(Date.now() + INVITE_EXPIRY_HOURS * 60 * 60 * 1000);
    await pool.query(
      `INSERT INTO astrologer_staff_accounts (id, astrologer_id, full_name, email, mobile, role_name, status, invite_token_hash, invite_expires_at, created_by)
       VALUES ($1,$2,$3,$4,$5,'invited',$6,$7,$8)`,
      [staffId, astrologerId, fullName, email || null, mobile || null, roleName, inviteTokenHash, inviteExpires, astrologerId]
    );
    for (const p of permissions) {
      if (OWNER_ONLY_MODULES.includes(p.moduleKey) && p.isAllowed) continue;
      await pool.query(
        `INSERT INTO astrologer_staff_permissions (staff_id, module_key, action_key, is_allowed)
         VALUES ($1,$2,$3,$4) ON CONFLICT (staff_id, module_key, action_key) DO UPDATE SET is_allowed=$4`,
        [staffId, p.moduleKey, p.actionKey, p.isAllowed || false]
      );
    }
    await logActivity(pool, astrologerId, null, 'owner_astrologer', 'staff_created', 'staff_management', staffId, null, { fullName, email, mobile, roleName }, req.ip, req.headers['user-agent']);
    res.status(201).json({
      success: true, message: 'Staff invite created successfully',
      data: { staffId, status: 'invited', inviteToken, inviteExpiresAt: inviteExpires }
    });
  } catch (err) {
    throw err;
  }
});

router.get('/astrologer/staff/activity-logs', requireAuth('astrologer'), async (req, res) => {
  try {
    const astrologerId = req.auth.sub;
    const { staffId, actionKey, moduleKey, from, to, limit } = req.query;
    let query = `SELECT l.*, a.full_name as staff_name, a.role_name as staff_role
                 FROM astrologer_staff_activity_logs l
                 LEFT JOIN astrologer_staff_accounts a ON a.id = l.staff_id
                 WHERE l.astrologer_id=$1`;
    const params = [astrologerId];
    let idx = 2;
    if (staffId) { query += ` AND l.staff_id=$${idx++}`; params.push(staffId); }
    if (actionKey) { query += ` AND l.action_key=$${idx++}`; params.push(actionKey); }
    if (moduleKey) { query += ` AND l.module_key=$${idx++}`; params.push(moduleKey); }
    if (from) { query += ` AND l.created_at >= $${idx++}`; params.push(from); }
    if (to) { query += ` AND l.created_at <= $${idx++}`; params.push(to); }
    query += ` ORDER BY l.created_at DESC`;
    const maxLimit = Math.min(parseInt(limit) || 100, 500);
    query += ` LIMIT $${idx++}`;
    params.push(maxLimit);
    const result = await pool.query(query, params);
    const staffResult = await pool.query(
      `SELECT id, full_name, role_name FROM astrologer_staff_accounts WHERE astrologer_id=$1 AND status != 'removed'`,
      [astrologerId]
    );
    res.json({ success: true, data: { logs: result.rows, staff: staffResult.rows } });
  } catch (err) {
    throw err;
  }
});

router.get('/astrologer/staff/:staffId', requireAuth('astrologer'), async (req, res) => {
  try {
    const astrologerId = req.auth.sub;
    const { staffId } = req.params;
    const staffResult = await pool.query(
      `SELECT id, full_name, email, mobile, role_name, status, last_login_at, access_expires_at, created_at, updated_at
       FROM astrologer_staff_accounts WHERE id=$1 AND astrologer_id=$2`,
      [staffId, astrologerId]
    );
    if (staffResult.rows.length === 0) return fail(res, 'Staff member not found.', 404);
    const permResult = await pool.query(
      `SELECT module_key, action_key, is_allowed FROM astrologer_staff_permissions WHERE staff_id=$1 ORDER BY module_key, action_key`,
      [staffId]
    );
    const logResult = await pool.query(
      `SELECT action_key, module_key, status, created_at FROM astrologer_staff_activity_logs
       WHERE staff_id=$1 ORDER BY created_at DESC LIMIT 20`,
      [staffId]
    );
    const sessionResult = await pool.query(
      `SELECT id, ip_address, device_info, expires_at, revoked_at, created_at
       FROM astrologer_staff_sessions WHERE staff_id=$1 ORDER BY created_at DESC LIMIT 10`,
      [staffId]
    );
    res.json({
      success: true,
      data: {
        staff: staffResult.rows[0],
        permissions: permResult.rows,
        recentLogs: logResult.rows,
        sessions: sessionResult.rows
      }
    });
  } catch (err) {
    throw err;
  }
});

router.put('/astrologer/staff/:staffId/permissions', requireAuth('astrologer'), async (req, res) => {
  const astrologerId = req.auth.sub;
  const { staffId } = req.params;
  const { permissions } = req.body;
  if (!permissions || !Array.isArray(permissions)) return fail(res, 'Permissions array is required.');
  try {
    const staffResult = await pool.query(
      `SELECT id, status FROM astrologer_staff_accounts WHERE id=$1 AND astrologer_id=$2`,
      [staffId, astrologerId]
    );
    if (staffResult.rows.length === 0) return fail(res, 'Staff member not found.', 404);
    const oldPerms = await pool.query(
      `SELECT module_key, action_key, is_allowed FROM astrologer_staff_permissions WHERE staff_id=$1`,
      [staffId]
    );
    const oldPermMap = {};
    oldPerms.rows.forEach(p => { oldPermMap[`${p.module_key}:${p.action_key}`] = p.is_allowed; });
    await pool.query(`DELETE FROM astrologer_staff_permissions WHERE staff_id=$1`, [staffId]);
    for (const p of permissions) {
      if (OWNER_ONLY_MODULES.includes(p.moduleKey) && p.isAllowed) continue;
      await pool.query(
        `INSERT INTO astrologer_staff_permissions (staff_id, module_key, action_key, is_allowed)
         VALUES ($1,$2,$3,$4)`,
        [staffId, p.moduleKey, p.actionKey, p.isAllowed || false]
      );
    }
    await logActivity(pool, astrologerId, null, 'owner_astrologer', 'permissions_changed', 'staff_management', staffId, oldPermMap, permissions, req.ip, req.headers['user-agent']);
    await logSecurityEvent(pool, astrologerId, 'owner_astrologer', null, 'permission_changed', `Permissions updated for staff ${staffId}`, { staffId });
    res.json({ success: true, message: 'Permissions updated successfully.' });
  } catch (err) {
    throw err;
  }
});

router.patch('/astrologer/staff/:staffId/disable', requireAuth('astrologer'), async (req, res) => {
  const astrologerId = req.auth.sub;
  const { staffId } = req.params;
  try {
    const result = await pool.query(
      `UPDATE astrologer_staff_accounts SET status='disabled', updated_at=NOW()
       WHERE id=$1 AND astrologer_id=$2 AND status='active' RETURNING id, full_name`,
      [staffId, astrologerId]
    );
    if (result.rows.length === 0) return fail(res, 'Staff member not found or already disabled.', 404);
    await pool.query(
      `UPDATE astrologer_staff_sessions SET revoked_at=NOW()
       WHERE staff_id=$1 AND revoked_at IS NULL`,
      [staffId]
    );
    await logActivity(pool, astrologerId, null, 'owner_astrologer', 'staff_disabled', 'staff_management', staffId, { status: 'active' }, { status: 'disabled' }, req.ip, req.headers['user-agent']);
    await logSecurityEvent(pool, astrologerId, 'owner_astrologer', null, 'staff_disabled', `Staff ${result.rows[0].full_name} disabled`, { staffId });
    res.json({ success: true, message: 'Staff account disabled and sessions revoked.' });
  } catch (err) {
    throw err;
  }
});

router.patch('/astrologer/staff/:staffId/enable', requireAuth('astrologer'), async (req, res) => {
  const astrologerId = req.auth.sub;
  const { staffId } = req.params;
  try {
    const result = await pool.query(
      `UPDATE astrologer_staff_accounts SET status='active', updated_at=NOW()
       WHERE id=$1 AND astrologer_id=$2 AND status='disabled' RETURNING id, full_name`,
      [staffId, astrologerId]
    );
    if (result.rows.length === 0) return fail(res, 'Staff member not found or not disabled.', 404);
    await logActivity(pool, astrologerId, null, 'owner_astrologer', 'staff_enabled', 'staff_management', staffId, { status: 'disabled' }, { status: 'active' }, req.ip, req.headers['user-agent']);
    await logSecurityEvent(pool, astrologerId, 'owner_astrologer', null, 'staff_enabled', `Staff ${result.rows[0].full_name} enabled`, { staffId });
    res.json({ success: true, message: 'Staff account enabled.' });
  } catch (err) {
    throw err;
  }
});

router.delete('/astrologer/staff/:staffId', requireAuth('astrologer'), async (req, res) => {
  const astrologerId = req.auth.sub;
  const { staffId } = req.params;
  try {
    const result = await pool.query(
      `UPDATE astrologer_staff_accounts SET status='removed', updated_at=NOW()
       WHERE id=$1 AND astrologer_id=$2 AND status != 'removed' RETURNING id, full_name`,
      [staffId, astrologerId]
    );
    if (result.rows.length === 0) return fail(res, 'Staff member not found.', 404);
    await pool.query(`UPDATE astrologer_staff_sessions SET revoked_at=NOW() WHERE staff_id=$1 AND revoked_at IS NULL`, [staffId]);
    await logActivity(pool, astrologerId, null, 'owner_astrologer', 'staff_removed', 'staff_management', staffId, null, { status: 'removed' }, req.ip, req.headers['user-agent']);
    await logSecurityEvent(pool, astrologerId, 'owner_astrologer', null, 'staff_disabled', `Staff ${result.rows[0].full_name} removed`, { staffId });
    res.json({ success: true, message: 'Staff member removed.' });
  } catch (err) {
    throw err;
  }
});

router.post('/astrologer/staff/kill-switch', requireAuth('astrologer'), async (req, res) => {
  const astrologerId = req.auth.sub;
  const { password, reason, disableStaff, revokeSessions, lockWallet, lockContentPublishing, lockLiveScheduling, lockRefunds } = req.body;
  if (!password) return fail(res, 'Password is required to activate kill switch.');
  try {
    const authResult = await pool.query(
      `SELECT password_hash FROM astrologers WHERE id=$1`,
      [astrologerId]
    );
    if (authResult.rows.length === 0) return fail(res, 'Astrologer not found.', 404);
    if (!await bcrypt.compare(password, authResult.rows[0].password_hash))
      return fail(res, 'Incorrect password.', 401);
    const metadata = { disableStaff: disableStaff !== false, revokeSessions: revokeSessions !== false, lockWallet: !!lockWallet, lockContentPublishing: !!lockContentPublishing, lockLiveScheduling: !!lockLiveScheduling, lockRefunds: !!lockRefunds };
    if (metadata.disableStaff) {
      await pool.query(
        `UPDATE astrologer_staff_accounts SET status='disabled', updated_at=NOW()
         WHERE astrologer_id=$1 AND status='active'`,
        [astrologerId]
      );
    }
    if (metadata.revokeSessions) {
      await pool.query(
        `UPDATE astrologer_staff_sessions SET revoked_at=NOW()
         WHERE staff_id IN (SELECT id FROM astrologer_staff_accounts WHERE astrologer_id=$1) AND revoked_at IS NULL`,
        [astrologerId]
      );
    }
    await logActivity(pool, astrologerId, null, 'owner_astrologer', 'kill_switch_activated', 'staff_management', null, null, metadata, req.ip, req.headers['user-agent']);
    await logSecurityEvent(pool, astrologerId, 'owner_astrologer', null, 'kill_switch_activated', reason || 'Emergency kill switch activated', metadata);
    const disabledCount = metadata.disableStaff ? (await pool.query(
      `SELECT COUNT(*)::int as count FROM astrologer_staff_accounts WHERE astrologer_id=$1 AND status='disabled'`,
      [astrologerId]
    )).rows[0].count : 0;
    const revokedCount = metadata.revokeSessions ? (await pool.query(
      `SELECT COUNT(*)::int as count FROM astrologer_staff_sessions
       WHERE staff_id IN (SELECT id FROM astrologer_staff_accounts WHERE astrologer_id=$1) AND revoked_at IS NOT NULL`,
      [astrologerId]
    )).rows[0].count : 0;
    res.json({
      success: true, message: 'Kill switch activated. Staff access has been emergency stopped.',
      data: { disabledStaffCount: disabledCount, revokedSessionCount: revokedCount, locks: metadata }
    });
  } catch (err) {
    throw err;
  }
});

router.post('/astrologer/staff/kill-switch/restore', requireAuth('astrologer'), async (req, res) => {
  const astrologerId = req.auth.sub;
  const { password, reason } = req.body;
  if (!password) return fail(res, 'Password is required to restore staff access.');
  try {
    const authResult = await pool.query(`SELECT password_hash FROM astrologers WHERE id=$1`, [astrologerId]);
    if (authResult.rows.length === 0) return fail(res, 'Astrologer not found.', 404);
    if (!await bcrypt.compare(password, authResult.rows[0].password_hash))
      return fail(res, 'Incorrect password.', 401);
    await pool.query(
      `UPDATE astrologer_staff_accounts SET status='active', updated_at=NOW()
       WHERE astrologer_id=$1 AND status='disabled'`,
      [astrologerId]
    );
    await logActivity(pool, astrologerId, null, 'owner_astrologer', 'kill_switch_restored', 'staff_management', null, null, { reason }, req.ip, req.headers['user-agent']);
    await logSecurityEvent(pool, astrologerId, 'owner_astrologer', null, 'kill_switch_restored', reason || 'Staff access restored', null);
    res.json({ success: true, message: 'Staff access restored.' });
  } catch (err) {
    throw err;
  }
});

router.get('/astrologer/staff/security-events', requireAuth('astrologer'), async (req, res) => {
  try {
    const astrologerId = req.auth.sub;
    const { limit } = req.query;
    const maxLimit = Math.min(parseInt(limit) || 50, 200);
    const result = await pool.query(
      `SELECT * FROM astrologer_security_events WHERE astrologer_id=$1 ORDER BY created_at DESC LIMIT $2`,
      [astrologerId, maxLimit]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    throw err;
  }
});

export default router;
