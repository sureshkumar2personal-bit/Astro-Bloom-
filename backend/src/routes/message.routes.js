import { Router } from 'express';
import { pool } from '../db/pool.js';
import { fail } from '../utils/response.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

async function findOrCreateConversation(actorType1, actorId1, actorType2, actorId2) {
  const existing = await pool.query(
    `SELECT c.id FROM conversations c
     JOIN conversation_members m1 ON m1.conversation_id=c.id AND m1.actor_type=$1 AND m1.actor_id=$2
     JOIN conversation_members m2 ON m2.conversation_id=c.id AND m2.actor_type=$3 AND m2.actor_id=$4
     WHERE c.type='direct'`,
    [actorType1, actorId1, actorType2, actorId2]
  );
  if (existing.rows[0]) return existing.rows[0].id;
  const conv = await pool.query("INSERT INTO conversations (type) VALUES ('direct') RETURNING id");
  const convId = conv.rows[0].id;
  await pool.query('INSERT INTO conversation_members (conversation_id,actor_type,actor_id) VALUES ($1,$2,$3),($1,$4,$5)',
    [convId, actorType1, actorId1, actorType2, actorId2]);
  return convId;
}

router.get('/user/conversations', requireAuth('user'), async (req, res) => {
  const result = await pool.query(
    `SELECT c.id,c.updated_at,
      (SELECT json_build_object('type',m.actor_type,'id',m.actor_id,
        'name',CASE WHEN m.actor_type='astrologer' THEN (SELECT display_name FROM astrologers WHERE id=m.actor_id) ELSE (SELECT full_name FROM users WHERE id=m.actor_id) END
      ) FROM conversation_members m WHERE m.conversation_id=c.id AND (m.actor_type != 'user' OR m.actor_id != $1) LIMIT 1) as other,
      (SELECT content FROM messages WHERE conversation_id=c.id ORDER BY created_at DESC LIMIT 1) as last_message,
      (SELECT created_at FROM messages WHERE conversation_id=c.id ORDER BY created_at DESC LIMIT 1) as last_message_at,
      (SELECT COUNT(*)::int FROM messages msg WHERE msg.conversation_id=c.id AND msg.sender_type != 'user' AND msg.sender_id != $1 AND msg.is_read = false) as unread_count
     FROM conversations c
     JOIN conversation_members cm ON cm.conversation_id=c.id AND cm.actor_type='user' AND cm.actor_id=$1
     ORDER BY last_message_at DESC NULLS LAST`,
    [req.auth.sub]
  );
  res.json({ success: true, data: result.rows.map(r => ({
    id: r.id, other: r.other, lastMessage: r.last_message, lastMessageAt: r.last_message_at, unreadCount: r.unread_count, updatedAt: r.updated_at
  }))});
});

router.get('/astrologer/conversations', requireAuth('astrologer'), async (req, res) => {
  const result = await pool.query(
    `SELECT c.id,c.updated_at,
      (SELECT json_build_object('type',m.actor_type,'id',m.actor_id,
        'name',CASE WHEN m.actor_type='user' THEN (SELECT full_name FROM users WHERE id=m.actor_id) ELSE (SELECT display_name FROM astrologers WHERE id=m.actor_id) END
      ) FROM conversation_members m WHERE m.conversation_id=c.id AND (m.actor_type != 'astrologer' OR m.actor_id != $1) LIMIT 1) as other,
      (SELECT content FROM messages WHERE conversation_id=c.id ORDER BY created_at DESC LIMIT 1) as last_message,
      (SELECT created_at FROM messages WHERE conversation_id=c.id ORDER BY created_at DESC LIMIT 1) as last_message_at,
      (SELECT COUNT(*)::int FROM messages msg WHERE msg.conversation_id=c.id AND msg.sender_type != 'astrologer' AND msg.sender_id != $1 AND msg.read_at IS NULL) as unread_count
     FROM conversations c
     JOIN conversation_members cm ON cm.conversation_id=c.id AND cm.actor_type='astrologer' AND cm.actor_id=$1
     ORDER BY last_message_at DESC NULLS LAST`,
    [req.auth.sub]
  );
  res.json({ success: true, data: result.rows.map(r => ({
    id: r.id, other: r.other, lastMessage: r.last_message, lastMessageAt: r.last_message_at, unreadCount: r.unread_count, updatedAt: r.updated_at
  }))});
});

router.get('/user/conversations/:conversationId/messages', requireAuth('user'), async (req, res) => {
  const { before } = req.query;
  let q = `SELECT id,sender_type,sender_id,content,message_type,media_url,reply_to,status,created_at
           FROM messages WHERE conversation_id=$1 AND deleted_at IS NULL`;
  const params = [req.params.conversationId];
  if (before) { params.push(before); q += ` AND created_at < (SELECT created_at FROM messages WHERE id=$${params.length})`; }
  q += ' ORDER BY created_at DESC LIMIT 50';
  const result = await pool.query(q, params);
  await pool.query(
    `UPDATE messages SET read_at=NOW() WHERE conversation_id=$1 AND sender_type != 'user' AND read_at IS NULL`,
    [req.params.conversationId]
  );
  res.json({ success: true, data: result.rows.reverse() });
});

router.get('/astrologer/conversations/:conversationId/messages', requireAuth('astrologer'), async (req, res) => {
  const { before } = req.query;
  let q = `SELECT id,sender_type,sender_id,content,message_type,media_url,reply_to,status,created_at
           FROM messages WHERE conversation_id=$1 AND deleted_at IS NULL`;
  const params = [req.params.conversationId];
  if (before) { params.push(before); q += ` AND created_at < (SELECT created_at FROM messages WHERE id=$${params.length})`; }
  q += ' ORDER BY created_at DESC LIMIT 50';
  const result = await pool.query(q, params);
  await pool.query(
    `UPDATE messages SET read_at=NOW() WHERE conversation_id=$1 AND sender_type != 'astrologer' AND read_at IS NULL`,
    [req.params.conversationId]
  );
  res.json({ success: true, data: result.rows.reverse() });
});

router.post('/user/conversations/:conversationId/messages', requireAuth('user'), async (req, res) => {
  const { content, messageType, replyTo } = req.body;
  if (!content?.trim()) return fail(res, 'Message content is required.');
  const conv = await pool.query('SELECT id FROM conversations WHERE id=$1', [req.params.conversationId]);
  if (!conv.rows[0]) return fail(res, 'Conversation not found.', 404);
  const result = await pool.query(
    `INSERT INTO messages (conversation_id,sender_type,sender_id,content,message_type,reply_to) VALUES ($1,'user',$2,$3,$4,$5) RETURNING id,created_at`,
    [req.params.conversationId, req.auth.sub, content.trim(), messageType || 'text', replyTo || null]
  );
  await pool.query('UPDATE conversations SET updated_at=NOW() WHERE id=$1', [req.params.conversationId]);
  res.status(201).json({ success: true, data: { messageId: result.rows[0].id, createdAt: result.rows[0].created_at } });
});

router.post('/astrologer/conversations/:conversationId/messages', requireAuth('astrologer'), async (req, res) => {
  const { content, messageType, replyTo } = req.body;
  if (!content?.trim()) return fail(res, 'Message content is required.');
  const conv = await pool.query('SELECT id FROM conversations WHERE id=$1', [req.params.conversationId]);
  if (!conv.rows[0]) return fail(res, 'Conversation not found.', 404);
  const result = await pool.query(
    `INSERT INTO messages (conversation_id,sender_type,sender_id,content,message_type,reply_to) VALUES ($1,'astrologer',$2,$3,$4,$5) RETURNING id,created_at`,
    [req.params.conversationId, req.auth.sub, content.trim(), messageType || 'text', replyTo || null]
  );
  await pool.query('UPDATE conversations SET updated_at=NOW() WHERE id=$1', [req.params.conversationId]);
  res.status(201).json({ success: true, data: { messageId: result.rows[0].id, createdAt: result.rows[0].created_at } });
});

router.post('/user/start-conversation', requireAuth('user'), async (req, res) => {
  const { astrologerId } = req.body;
  if (!astrologerId) return fail(res, 'Astrologer ID is required.');
  const convId = await findOrCreateConversation('user', req.auth.sub, 'astrologer', astrologerId);
  res.json({ success: true, data: { conversationId: convId } });
});

router.post('/user/conversations/:conversationId/read', requireAuth('user'), async (req, res) => {
  await pool.query('UPDATE messages SET read_at=NOW() WHERE conversation_id=$1 AND sender_type != $2 AND read_at IS NULL', [req.params.conversationId, 'user']);
  res.json({ success: true, message: 'Messages marked as read.' });
});

router.post('/astrologer/conversations/:conversationId/read', requireAuth('astrologer'), async (req, res) => {
  await pool.query('UPDATE messages SET read_at=NOW() WHERE conversation_id=$1 AND sender_type != $2 AND read_at IS NULL', [req.params.conversationId, 'astrologer']);
  res.json({ success: true, message: 'Messages marked as read.' });
});

router.delete('/user/conversations/:conversationId/messages/:messageId', requireAuth('user'), async (req, res) => {
  await pool.query('UPDATE messages SET deleted_at=NOW() WHERE id=$1 AND conversation_id=$2 AND sender_type=$3 AND sender_id=$4',
    [req.params.messageId, req.params.conversationId, 'user', req.auth.sub]);
  res.json({ success: true, message: 'Message deleted.' });
});

router.delete('/astrologer/conversations/:conversationId/messages/:messageId', requireAuth('astrologer'), async (req, res) => {
  await pool.query('UPDATE messages SET deleted_at=NOW() WHERE id=$1 AND conversation_id=$2 AND sender_type=$3 AND sender_id=$4',
    [req.params.messageId, req.params.conversationId, 'astrologer', req.auth.sub]);
  res.json({ success: true, message: 'Message deleted.' });
});

export default router;
