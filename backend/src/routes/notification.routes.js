import { Router } from 'express';
import { pool } from '../db/pool.js';
import { fail } from '../utils/response.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

async function createNotification(actorType, actorId, type, title, body, data) {
  await pool.query(
    'INSERT INTO notifications (actor_type,actor_id,type,title,body,data) VALUES ($1,$2,$3,$4,$5,$6)',
    [actorType, actorId, type, title, body || '', JSON.stringify(data || {})]
  );
}

router.get('/user/notifications', requireAuth('user'), async (req, res) => {
  const { unreadOnly } = req.query;
  let q = 'SELECT id,type,title,body,data,read_at,created_at FROM notifications WHERE actor_type=$1 AND actor_id=$2';
  const params = ['user', req.auth.sub];
  if (unreadOnly === 'true') { q += ' AND read_at IS NULL'; }
  q += ' ORDER BY created_at DESC LIMIT 50';
  const result = await pool.query(q, params);
  const unreadCount = await pool.query('SELECT COUNT(*)::int as count FROM notifications WHERE actor_type=$1 AND actor_id=$2 AND read_at IS NULL', ['user', req.auth.sub]);
  res.json({ success: true, data: {
    notifications: result.rows.map(r => ({ id: r.id, type: r.type, title: r.title, body: r.body, data: r.data, readAt: r.read_at, createdAt: r.created_at })),
    unreadCount: unreadCount.rows[0].count
  }});
});

router.get('/astrologer/notifications', requireAuth('astrologer'), async (req, res) => {
  const { unreadOnly } = req.query;
  let q = 'SELECT id,type,title,body,data,read_at,created_at FROM notifications WHERE actor_type=$1 AND actor_id=$2';
  const params = ['astrologer', req.auth.sub];
  if (unreadOnly === 'true') { q += ' AND read_at IS NULL'; }
  q += ' ORDER BY created_at DESC LIMIT 50';
  const result = await pool.query(q, params);
  const unreadCount = await pool.query('SELECT COUNT(*)::int as count FROM notifications WHERE actor_type=$1 AND actor_id=$2 AND read_at IS NULL', ['astrologer', req.auth.sub]);
  res.json({ success: true, data: {
    notifications: result.rows.map(r => ({ id: r.id, type: r.type, title: r.title, body: r.body, data: r.data, readAt: r.read_at, createdAt: r.created_at })),
    unreadCount: unreadCount.rows[0].count
  }});
});

router.patch('/user/notifications/read', requireAuth('user'), async (req, res) => {
  const { notificationIds } = req.body;
  if (notificationIds?.length) {
    await pool.query('UPDATE notifications SET read_at=NOW() WHERE actor_type=$1 AND actor_id=$2 AND id=ANY($3)', ['user', req.auth.sub, notificationIds]);
  } else {
    await pool.query('UPDATE notifications SET read_at=NOW() WHERE actor_type=$1 AND actor_id=$2 AND read_at IS NULL', ['user', req.auth.sub]);
  }
  res.json({ success: true, message: 'Notifications marked as read.' });
});

router.patch('/astrologer/notifications/read', requireAuth('astrologer'), async (req, res) => {
  const { notificationIds } = req.body;
  if (notificationIds?.length) {
    await pool.query('UPDATE notifications SET read_at=NOW() WHERE actor_type=$1 AND actor_id=$2 AND id=ANY($3)', ['astrologer', req.auth.sub, notificationIds]);
  } else {
    await pool.query('UPDATE notifications SET read_at=NOW() WHERE actor_type=$1 AND actor_id=$2 AND read_at IS NULL', ['astrologer', req.auth.sub]);
  }
  res.json({ success: true, message: 'Notifications marked as read.' });
});

router.get('/user/notification-preferences', requireAuth('user'), async (req, res) => {
  const result = await pool.query('SELECT event_type,channel_in_app,channel_email,channel_push,channel_sms FROM notification_preferences WHERE actor_type=$1 AND actor_id=$2', ['user', req.auth.sub]);
  res.json({ success: true, data: result.rows.map(r => ({ eventType: r.event_type, inApp: r.channel_in_app, email: r.channel_email, push: r.channel_push, sms: r.channel_sms })) });
});

router.get('/astrologer/notification-preferences', requireAuth('astrologer'), async (req, res) => {
  const result = await pool.query('SELECT event_type,channel_in_app,channel_email,channel_push,channel_sms FROM notification_preferences WHERE actor_type=$1 AND actor_id=$2', ['astrologer', req.auth.sub]);
  res.json({ success: true, data: result.rows.map(r => ({ eventType: r.event_type, inApp: r.channel_in_app, email: r.channel_email, push: r.channel_push, sms: r.channel_sms })) });
});

router.put('/user/notification-preferences', requireAuth('user'), async (req, res) => {
  const { preferences } = req.body;
  if (!Array.isArray(preferences)) return fail(res, 'Preferences array is required.');
  for (const p of preferences) {
    await pool.query(
      `INSERT INTO notification_preferences (actor_type,actor_id,event_type,channel_in_app,channel_email,channel_push,channel_sms)
       VALUES ('user',$1,$2,$3,$4,$5,$6)
       ON CONFLICT (actor_type,actor_id,event_type) DO UPDATE SET
       channel_in_app=$3,channel_email=$4,channel_push=$5,channel_sms=$6`,
      [req.auth.sub, p.eventType, p.inApp ?? true, p.email ?? false, p.push ?? true, p.sms ?? false]
    );
  }
  res.json({ success: true, message: 'Notification preferences updated.' });
});

router.put('/astrologer/notification-preferences', requireAuth('astrologer'), async (req, res) => {
  const { preferences } = req.body;
  if (!Array.isArray(preferences)) return fail(res, 'Preferences array is required.');
  for (const p of preferences) {
    await pool.query(
      `INSERT INTO notification_preferences (actor_type,actor_id,event_type,channel_in_app,channel_email,channel_push,channel_sms)
       VALUES ('astrologer',$1,$2,$3,$4,$5,$6)
       ON CONFLICT (actor_type,actor_id,event_type) DO UPDATE SET
       channel_in_app=$3,channel_email=$4,channel_push=$5,channel_sms=$6`,
      [req.auth.sub, p.eventType, p.inApp ?? true, p.email ?? false, p.push ?? true, p.sms ?? false]
    );
  }
  res.json({ success: true, message: 'Notification preferences updated.' });
});

export { createNotification };
export default router;
