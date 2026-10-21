import { Router } from 'express';
import crypto from 'crypto';
import { pool } from '../db/pool.js';
import { fail } from '../utils/response.js';
import { requireAuth } from '../middleware/auth.js';
import { ensureWallet } from './wallet.routes.js';

const router = Router();
const uid = () => crypto.randomUUID();
const genCode = (prefix) => `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

// Screen 9: Purchase question offer
router.post('/', requireAuth('user'), async (req, res) => {
  const { campaignId } = req.body;
  if (!campaignId) return fail(res, 'Campaign ID is required.');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Get campaign
    const campRes = await client.query('SELECT * FROM question_campaigns WHERE id=$1 FOR UPDATE', [campaignId]);
    if (!campRes.rows.length) { await client.query('ROLLBACK'); return fail(res, 'Campaign not found.', 404); }
    const camp = campRes.rows[0];

    // 2. Validate
    if (camp.status !== 'active') { await client.query('ROLLBACK'); return fail(res, 'Campaign is not active.'); }
    if (camp.available_slots <= 0) { await client.query('ROLLBACK'); return fail(res, 'No question slots available.'); }
    if (camp.end_at && new Date(camp.end_at) < new Date()) { await client.query('ROLLBACK'); return fail(res, 'Campaign has expired.'); }

    // 3. Check wallet
    const wallet = await ensureWallet(client, req.auth.sub, 'user');
    if (parseFloat(wallet.available_balance) < parseFloat(camp.price)) {
      await client.query('ROLLBACK');
      return fail(res, 'Insufficient wallet balance.');
    }

    // 4. Deduct wallet + create escrow + purchase in one transaction
    const price = parseFloat(camp.price);
    await client.query('UPDATE wallet_accounts SET available_balance=available_balance-$1,hold_balance=hold_balance+$1,updated_at=NOW() WHERE id=$2', [price, wallet.id]);

    await client.query(
      'INSERT INTO wallet_transactions (wallet_id,owner_type,owner_id,transaction_type,service_type,service_id,amount,status,description) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
      [wallet.id, 'user', req.auth.sub, 'question_purchase_debit', 'question_purchase', null, price, 'completed', `Purchase from campaign: ${camp.campaign_name}`]);

    const purchaseId = uid();
    const purchaseCode = genCode('QP');
    await client.query(
      `INSERT INTO question_purchases (id,user_id,astrologer_id,campaign_id,purchase_code,price, payment_status,purchase_status,expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,'paid','question_pending',NOW() + INTERVAL '7 days')`,
      [purchaseId, req.auth.sub, camp.astrologer_id, campaignId, purchaseCode, price]);

    // Update wallet transaction with service_id
    await client.query('UPDATE wallet_transactions SET service_id=$1 WHERE wallet_id=$2 AND service_type=$3 AND service_id IS NULL', [purchaseId, wallet.id, 'question_purchase']);

    await client.query(
      `INSERT INTO escrow_records (user_id,astrologer_id,service_type,service_id,gross_amount,status)
       VALUES ($1,$2,'question_purchase',$3,$4,'held')`,
      [req.auth.sub, camp.astrologer_id, purchaseId, price]);

    await client.query('UPDATE question_campaigns SET sold_slots=sold_slots+1,available_slots=available_slots-1,updated_at=NOW() WHERE id=$1', [campaignId]);

    await client.query('COMMIT');

    res.status(201).json({ success: true, message: 'Question purchase successful', data: {
      purchaseId, purchaseCode, campaignId, paymentStatus: 'paid', purchaseStatus: 'question_pending',
      amount: price, currency: camp.currency, escrowStatus: 'held'
    }});
  } catch (err) {
    await client.query('ROLLBACK');
    fail(res, 'Failed to process purchase.', 500);
  } finally { client.release(); }
});

// Screen 9: Get purchase details
router.get('/:purchaseId', requireAuth('user'), async (req, res) => {
  try {
    const rRes = await pool.query(
      `SELECT qp.*, qc.campaign_name, qc.answer_mode, qc.submission_mode, qc.deadline_hours
       FROM question_purchases qp
       JOIN question_campaigns qc ON qc.id = qp.campaign_id
       WHERE qp.id=$1 AND qp.user_id=$2`, [req.params.purchaseId, req.auth.sub]);
    if (!rRes.rows.length) return fail(res, 'Purchase not found.', 404);
    const r = rRes.rows[0];
    res.json({ success: true, data: {
      id: r.id, purchaseCode: r.purchase_code, campaignId: r.campaign_id,
      astrologerId: r.astrologer_id, price: parseFloat(r.price), paymentStatus: r.payment_status,
      purchaseStatus: r.purchase_status, questionSubmitted: r.question_submitted, questionId: r.question_id,
      campaignName: r.campaign_name, answerMode: r.answer_mode, submissionMode: r.submission_mode,
      deadlineHours: r.deadline_hours, expiresAt: r.expires_at, createdAt: r.created_at
    }});
  } catch (err) { fail(res, 'Failed to fetch purchase.', 500); }
});

// User: list my purchases
router.get('/', requireAuth('user'), async (req, res) => {
  try {
    const rows = await pool.query(
      `SELECT qp.*, qc.campaign_name, qc.answer_mode
       FROM question_purchases qp
       JOIN question_campaigns qc ON qc.id = qp.campaign_id
       WHERE qp.user_id=$1 ORDER BY qp.created_at DESC LIMIT 50`, [req.auth.sub]);
    res.json({ success: true, data: rows.rows.map(r => ({
      id: r.id, purchaseCode: r.purchase_code, campaignId: r.campaign_id, campaignName: r.campaign_name,
      astrologerId: r.astrologer_id, price: parseFloat(r.price), purchaseStatus: r.purchase_status,
      paymentStatus: r.payment_status, questionSubmitted: r.question_submitted, answerMode: r.answer_mode,
      createdAt: r.created_at
    }))});
  } catch (err) { fail(res, 'Failed to fetch purchases.', 500); }
});

export default router;
