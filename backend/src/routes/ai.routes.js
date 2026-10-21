import { Router } from 'express';
import { pool } from '../db/pool.js';
import { fail } from '../utils/response.js';
import { requireAuth } from '../middleware/auth.js';
import { generateAiAnswer } from '../services/aiKnowledgeBase.js';

const router = Router();

function decideUsageType(usage) {
  const freeRemaining = usage.free_limit - usage.free_used;
  if (freeRemaining > 0) return 'free';
  if (usage.paid_remaining > 0) return 'paid';
  return 'blocked';
}

router.get('/usage', requireAuth('user'), async (req, res) => {
  let usage = await pool.query('SELECT * FROM ai_usage WHERE user_id=$1', [req.auth.sub]);
  if (!usage.rows[0]) {
    const result = await pool.query(
      'INSERT INTO ai_usage (user_id) VALUES ($1) RETURNING *', [req.auth.sub]
    );
    usage = result;
  }
  const u = usage.rows[0];
  const freeRemaining = u.free_limit - u.free_used;
  const paymentRequired = freeRemaining <= 0 && u.paid_remaining <= 0;
  let currentPack = null;
  if (u.current_pack_id) {
    const pack = await pool.query('SELECT pack_name FROM ai_packs WHERE id=$1', [u.current_pack_id]);
    currentPack = pack.rows[0]?.pack_name || null;
  }
  res.json({ success: true, data: {
    freeUsed: u.free_used,
    freeLimit: u.free_limit,
    freeRemaining,
    paidRemaining: u.paid_remaining,
    totalQuestionsUsed: u.total_questions_used,
    paymentRequired,
    currentPack
  }});
});

router.get('/conversations', requireAuth('user'), async (req, res) => {
  const result = await pool.query(
    'SELECT id,mode,profile_id,title,status,created_at,updated_at FROM ai_conversations WHERE user_id=$1 ORDER BY updated_at DESC LIMIT 50',
    [req.auth.sub]
  );
  res.json({ success: true, data: result.rows.map(r => ({
    id: r.id, mode: r.mode, profileId: r.profile_id, title: r.title,
    status: r.status, createdAt: r.created_at, updatedAt: r.updated_at
  }))});
});

router.post('/conversations', requireAuth('user'), async (req, res) => {
  const { mode, profileId, title } = req.body;
  if (!['general', 'personal'].includes(mode || 'general')) return fail(res, 'Invalid mode.');
  const result = await pool.query(
    'INSERT INTO ai_conversations (user_id,mode,profile_id,title) VALUES ($1,$2,$3,$4) RETURNING id',
    [req.auth.sub, mode || 'general', profileId || null, title || `${mode || 'general'} AI Chat`]
  );
  res.status(201).json({ success: true, message: 'Conversation created.', data: { conversationId: result.rows[0].id } });
});

router.get('/conversations/:conversationId/messages', requireAuth('user'), async (req, res) => {
  const conv = await pool.query('SELECT id FROM ai_conversations WHERE id=$1 AND user_id=$2', [req.params.conversationId, req.auth.sub]);
  if (!conv.rows[0]) return fail(res, 'Conversation not found.', 404);
  const result = await pool.query(
    'SELECT id,role,message_text,category,usage_type,created_at FROM ai_messages WHERE conversation_id=$1 ORDER BY created_at ASC',
    [req.params.conversationId]
  );
  res.json({ success: true, data: result.rows.map(r => ({
    id: r.id, role: r.role, messageText: r.message_text, category: r.category,
    usageType: r.usage_type, createdAt: r.created_at
  }))});
});

router.post('/messages', requireAuth('user'), async (req, res) => {
  const { conversationId, mode, profileId, messageText } = req.body;
  if (!conversationId) return fail(res, 'Conversation ID is required.');
  if (!messageText?.trim()) return fail(res, 'Message text is required.');
  if (messageText.trim().length < 2) return fail(res, 'Message must be at least 2 characters.');
  if (messageText.length > 1000) return fail(res, 'Message must be 1000 characters or less.');

  const conv = await pool.query('SELECT * FROM ai_conversations WHERE id=$1 AND user_id=$2', [conversationId, req.auth.sub]);
  if (!conv.rows[0]) {
    const err = new Error('Conversation not found.');
    err.code = 'CONVERSATION_NOT_FOUND';
    return fail(res, err.message, 404);
  }
  const conversation = conv.rows[0];

  if ((mode || conversation.mode) === 'personal') {
    if (!profileId && !conversation.profile_id) {
      const err = new Error('Please select a profile for personal astrology AI.');
      err.code = 'PROFILE_REQUIRED';
      return fail(res, err.message, 400);
    }
  }

  let usage = await pool.query('SELECT * FROM ai_usage WHERE user_id=$1', [req.auth.sub]);
  if (!usage.rows[0]) {
    const result = await pool.query('INSERT INTO ai_usage (user_id) VALUES ($1) RETURNING *', [req.auth.sub]);
    usage = result;
  }
  const u = usage.rows[0];

  const usageType = decideUsageType(u);
  if (usageType === 'blocked') {
    const packs = await pool.query('SELECT pack_code,pack_name,price_amount,question_count FROM ai_packs WHERE is_active=true ORDER BY price_amount ASC');
    return res.status(402).json({
      success: false,
      message: 'AI question limit completed. Please buy an AI pack.',
      code: 'AI_PAYMENT_REQUIRED',
      data: {
        freeUsed: u.free_used,
        freeLimit: u.free_limit,
        paidRemaining: u.paid_remaining,
        availablePacks: packs.rows.map(p => ({
          packCode: p.pack_code, packName: p.pack_name,
          priceAmount: Number(p.price_amount), questionCount: p.question_count
        }))
      }
    });
  }

  let profile = null;
  if ((mode || conversation.mode) === 'personal' && (profileId || conversation.profile_id)) {
    const pid = profileId || conversation.profile_id;
    const profileResult = await pool.query(
      'SELECT p.*,up.zodiac_sign,up.moon_sign,up.ascendant FROM user_profiles p LEFT JOIN user_preferences up ON up.user_id=p.user_id WHERE p.user_id=$1',
      [req.auth.sub]
    );
    if (profileResult.rows[0]) {
      profile = {
        dateOfBirth: profileResult.rows[0].date_of_birth,
        birthTime: profileResult.rows[0].birth_time,
        birthPlace: profileResult.rows[0].birth_place,
        zodiacSign: profileResult.rows[0].zodiac_sign,
        moonSign: profileResult.rows[0].moon_sign,
        ascendant: profileResult.rows[0].ascendant
      };
    }
  }

  const aiResult = generateAiAnswer({ messageText: messageText.trim(), mode: mode || conversation.mode, profile });

  await pool.query(
    'INSERT INTO ai_messages (conversation_id,user_id,role,message_text,category,usage_type) VALUES ($1,$2,$3,$4,$5,$6)',
    [conversationId, req.auth.sub, 'user', messageText.trim(), aiResult.category, usageType]
  );

  await pool.query(
    'INSERT INTO ai_messages (conversation_id,user_id,role,message_text,category,usage_type) VALUES ($1,$2,$3,$4,$5,$6)',
    [conversationId, req.auth.sub, 'assistant', aiResult.answer, aiResult.category, usageType]
  );

  if (usageType === 'free') {
    await pool.query('UPDATE ai_usage SET free_used=free_used+1,total_questions_used=total_questions_used+1,updated_at=NOW() WHERE user_id=$1', [req.auth.sub]);
  } else if (usageType === 'paid') {
    await pool.query('UPDATE ai_usage SET paid_remaining=paid_remaining-1,total_questions_used=total_questions_used+1,updated_at=NOW() WHERE user_id=$1', [req.auth.sub]);
  }

  const updatedUsage = await pool.query('SELECT * FROM ai_usage WHERE user_id=$1', [req.auth.sub]);
  const eu = updatedUsage.rows[0];
  const freeRemaining = eu.free_limit - eu.free_used;

  const assistantMsg = await pool.query(
    'SELECT id,role,message_text,category,usage_type,created_at FROM ai_messages WHERE conversation_id=$1 ORDER BY created_at DESC LIMIT 1',
    [conversationId]
  );

  res.json({
    success: true,
    message: 'AI response generated',
    data: {
      usageType,
      freeRemaining,
      paidRemaining: eu.paid_remaining,
      paymentRequired: freeRemaining <= 0 && eu.paid_remaining <= 0,
      assistantMessage: assistantMsg.rows[0] ? {
        id: assistantMsg.rows[0].id,
        role: assistantMsg.rows[0].role,
        messageText: assistantMsg.rows[0].message_text,
        category: assistantMsg.rows[0].category,
        usageType: assistantMsg.rows[0].usage_type,
        createdAt: assistantMsg.rows[0].created_at
      } : null
    }
  });
});

router.post('/packs/buy', requireAuth('user'), async (req, res) => {
  const { packCode } = req.body;
  if (!packCode) return fail(res, 'Pack code is required.');

  const pack = await pool.query('SELECT * FROM ai_packs WHERE pack_code=$1 AND is_active=true', [packCode]);
  if (!pack.rows[0]) return fail(res, 'Invalid or inactive pack.');

  const p = pack.rows[0];

  const wallet = await pool.query("SELECT id,available_balance FROM wallet_accounts WHERE owner_type='user' AND owner_id=$1", [req.auth.sub]);
  if (!wallet.rows[0] || Number(wallet.rows[0].available_balance) < Number(p.price_amount)) {
    const err = new Error('Insufficient wallet balance. Please add money to your wallet.');
    err.code = 'WALLET_BALANCE_LOW';
    return res.status(402).json({ success: false, code: 'WALLET_BALANCE_LOW', message: err.message });
  }

  const w = wallet.rows[0];
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query('UPDATE wallet_accounts SET available_balance=available_balance-$1 WHERE id=$2', [p.price_amount, w.id]);

    const txResult = await client.query(
      "INSERT INTO wallet_transactions (wallet_id,owner_type,owner_id,transaction_type,service_type,amount,status,description) VALUES ($1,'user',$2,'debit','ai_pack',$3,'completed','AI Pack purchase: $4') RETURNING id",
      [w.id, req.auth.sub, p.price_amount, p.pack_name]
    );

    await client.query(
      'INSERT INTO ai_pack_purchases (user_id,pack_id,wallet_transaction_id,price_paid,question_count,questions_remaining) VALUES ($1,$2,$3,$4,$5,$5)',
      [req.auth.sub, p.id, txResult.rows[0].id, p.price_amount, p.question_count]
    );

    await client.query(
      'UPDATE ai_usage SET paid_remaining=paid_remaining+$1,current_pack_id=$2,updated_at=NOW() WHERE user_id=$3',
      [p.question_count, p.id, req.auth.sub]
    );

    await client.query('COMMIT');

    const updatedWallet = await pool.query('SELECT available_balance FROM wallet_accounts WHERE id=$1', [w.id]);
    const updatedUsage = await pool.query('SELECT paid_remaining FROM ai_usage WHERE user_id=$1', [req.auth.sub]);

    res.json({
      success: true,
      message: 'AI pack purchased successfully.',
      data: {
        packName: p.pack_name,
        questionsAdded: p.question_count,
        paidRemaining: updatedUsage.rows[0].paid_remaining,
        walletBalance: Number(updatedWallet.rows[0].available_balance)
      }
    });
  } catch (err) { await client.query('ROLLBACK'); throw err; } finally { client.release(); }
});

router.get('/packs', async (req, res) => {
  const result = await pool.query('SELECT pack_code,pack_name,price_amount,question_count FROM ai_packs WHERE is_active=true ORDER BY price_amount ASC');
  res.json({ success: true, data: result.rows });
});

export default router;
