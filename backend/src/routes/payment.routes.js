import { Router } from 'express';
import { pool } from '../db/pool.js';
import { fail } from '../utils/response.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/user/payments', requireAuth('user'), async (req, res) => {
  const { type, status } = req.query;
  let q = 'SELECT id,service_type,service_id,amount,currency,payment_status,escrow_status,created_at FROM payments WHERE user_id=$1';
  const params = [req.auth.sub];
  if (type) { params.push(type); q += ` AND service_type=$${params.length}`; }
  if (status) { params.push(status); q += ` AND payment_status=$${params.length}`; }
  q += ' ORDER BY created_at DESC LIMIT 100';
  const result = await pool.query(q, params);
  res.json({ success: true, data: result.rows });
});

router.get('/astrologer/payments', requireAuth('astrologer'), async (req, res) => {
  const result = await pool.query(
    'SELECT id,service_type,service_id,amount,currency,payment_status,escrow_status,created_at FROM payments WHERE astrologer_id=$1 ORDER BY created_at DESC LIMIT 100',
    [req.auth.sub]
  );
  res.json({ success: true, data: result.rows });
});

router.get('/user/escrow', requireAuth('user'), async (req, res) => {
  const result = await pool.query(
    'SELECT id,service_type,service_id,gross_amount,platform_commission,astrologer_amount,status,held_at,released_at,refunded_at,created_at FROM escrow_records WHERE user_id=$1 ORDER BY created_at DESC',
    [req.auth.sub]
  );
  res.json({ success: true, data: result.rows });
});

router.get('/astrologer/escrow', requireAuth('astrologer'), async (req, res) => {
  const result = await pool.query(
    'SELECT id,service_type,service_id,gross_amount,platform_commission,astrologer_amount,status,held_at,released_at,refunded_at,created_at FROM escrow_records WHERE astrologer_id=$1 ORDER BY created_at DESC',
    [req.auth.sub]
  );
  res.json({ success: true, data: result.rows });
});

router.get('/user/payment-summary', requireAuth('user'), async (req, res) => {
  const totalSpent = await pool.query("SELECT COALESCE(SUM(amount),0)::numeric as total FROM payments WHERE user_id=$1 AND payment_status='completed'", [req.auth.sub]);
  const byType = await pool.query(
    "SELECT service_type,COUNT(*)::int as count,COALESCE(SUM(amount),0)::numeric as total FROM payments WHERE user_id=$1 AND payment_status='completed' GROUP BY service_type",
    [req.auth.sub]
  );
  res.json({ success: true, data: {
    totalSpent: totalSpent.rows[0].total,
    byService: byType.rows.map(r => ({ serviceType: r.service_type, count: r.count, total: r.total }))
  }});
});

router.get('/astrologer/earnings-summary', requireAuth('astrologer'), async (req, res) => {
  const totalEarned = await pool.query("SELECT COALESCE(SUM(astrologer_amount),0)::numeric as total FROM escrow_records WHERE astrologer_id=$1 AND status='released'", [req.auth.sub]);
  const pending = await pool.query("SELECT COALESCE(SUM(astrologer_amount),0)::numeric as total FROM escrow_records WHERE astrologer_id=$1 AND status='held'", [req.auth.sub]);
  const byType = await pool.query(
    "SELECT service_type,COUNT(*)::int as count,COALESCE(SUM(astrologer_amount),0)::numeric as total FROM escrow_records WHERE astrologer_id=$1 AND status='released' GROUP BY service_type",
    [req.auth.sub]
  );
  const wallet = await pool.query("SELECT available_balance FROM wallet_accounts WHERE owner_type='astrologer' AND owner_id=$1", [req.auth.sub]);
  res.json({ success: true, data: {
    totalEarned: totalEarned.rows[0].total,
    pendingEarnings: pending.rows[0].total,
    walletBalance: wallet.rows[0]?.available_balance || 0,
    byService: byType.rows.map(r => ({ serviceType: r.service_type, count: r.count, total: r.total }))
  }});
});

router.get('/user/receipt/:paymentId', requireAuth('user'), async (req, res) => {
  const result = await pool.query(
    'SELECT id,service_type,service_id,amount,currency,payment_status,escrow_status,created_at FROM payments WHERE id=$1 AND user_id=$2',
    [req.params.paymentId, req.auth.sub]
  );
  if (!result.rows[0]) return fail(res, 'Payment not found.', 404);
  const r = result.rows[0];
  res.json({ success: true, data: {
    receiptId: r.id, serviceType: r.service_type, serviceId: r.service_id,
    amount: r.amount, currency: r.currency, paymentStatus: r.payment_status,
    escrowStatus: r.escrow_status, createdAt: r.created_at,
    platform: 'CosmicConnect', note: 'This is a system-generated receipt.'
  }});
});

export default router;
