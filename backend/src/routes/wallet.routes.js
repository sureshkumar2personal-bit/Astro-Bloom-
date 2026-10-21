import { Router } from 'express';
import crypto from 'crypto';
import { pool } from '../db/pool.js';
import { fail } from '../utils/response.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const uid = () => crypto.randomUUID();

async function ensureWallet(client, ownerId, ownerType) {
  const res = await client.query('SELECT * FROM wallet_accounts WHERE owner_type=$1 AND owner_id=$2', [ownerType, ownerId]);
  if (res.rows.length) return res.rows[0];
  const ins = await client.query(
    'INSERT INTO wallet_accounts (owner_type,owner_id) VALUES ($1,$2) RETURNING *', [ownerType, ownerId]);
  return ins.rows[0];
}

async function getWalletClient(client, ownerId, ownerType) {
  return ensureWallet(client, ownerId, ownerType);
}

// User wallet balance
router.get('/balance', requireAuth('user'), async (req, res) => {
  try {
    const wallet = await ensureWallet(pool, req.auth.sub, 'user');
    res.json({ success: true, data: {
      walletId: wallet.id, availableBalance: parseFloat(wallet.available_balance),
      holdBalance: parseFloat(wallet.hold_balance), pendingBalance: parseFloat(wallet.pending_balance),
      currency: wallet.currency
    }});
  } catch (err) { fail(res, 'Failed to fetch wallet.', 500); }
});

// Astrologer wallet balance
router.get('/astrologer/balance', requireAuth('astrologer'), async (req, res) => {
  try {
    const wallet = await ensureWallet(pool, req.auth.sub, 'astrologer');
    res.json({ success: true, data: {
      walletId: wallet.id, availableBalance: parseFloat(wallet.available_balance),
      holdBalance: parseFloat(wallet.hold_balance), pendingBalance: parseFloat(wallet.pending_balance),
      currency: wallet.currency
    }});
  } catch (err) { fail(res, 'Failed to fetch wallet.', 500); }
});

// User top-up wallet (dev: direct credit)
router.post('/topup', requireAuth('user'), async (req, res) => {
  const { amount } = req.body;
  if (!amount || amount <= 0) return fail(res, 'Amount must be > 0.');
  try {
    const wallet = await ensureWallet(pool, req.auth.sub, 'user');
    await pool.query('UPDATE wallet_accounts SET available_balance=available_balance+$1,updated_at=NOW() WHERE id=$2', [amount, wallet.id]);
    await pool.query(
      'INSERT INTO wallet_transactions (wallet_id,owner_type,owner_id,transaction_type,amount,status,description) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [wallet.id, 'user', req.auth.sub, 'wallet_topup', amount, 'completed', 'Wallet top-up']);
    const updated = await pool.query('SELECT available_balance FROM wallet_accounts WHERE id=$1', [wallet.id]);
    res.json({ success: true, message: 'Wallet topped up.', data: { availableBalance: parseFloat(updated.rows[0].available_balance) } });
  } catch (err) { fail(res, 'Failed to top up wallet.', 500); }
});

// User transaction history
router.get('/transactions', requireAuth('user'), async (req, res) => {
  try {
    const wallet = await ensureWallet(pool, req.auth.sub, 'user');
    const rows = await pool.query(
      'SELECT id,transaction_type,service_type,amount,status,description,created_at FROM wallet_transactions WHERE wallet_id=$1 ORDER BY created_at DESC LIMIT 50', [wallet.id]);
    res.json({ success: true, data: rows.rows.map(r => ({
      id: r.id, transactionType: r.transaction_type, serviceType: r.service_type,
      amount: parseFloat(r.amount), status: r.status, description: r.description, createdAt: r.created_at
    }))});
  } catch (err) { fail(res, 'Failed to fetch transactions.', 500); }
});

// Astrologer transaction history
router.get('/astrologer/transactions', requireAuth('astrologer'), async (req, res) => {
  try {
    const wallet = await ensureWallet(pool, req.auth.sub, 'astrologer');
    const rows = await pool.query(
      'SELECT id,transaction_type,service_type,amount,status,description,created_at FROM wallet_transactions WHERE wallet_id=$1 ORDER BY created_at DESC LIMIT 50', [wallet.id]);
    res.json({ success: true, data: rows.rows.map(r => ({
      id: r.id, transactionType: r.transaction_type, serviceType: r.service_type,
      amount: parseFloat(r.amount), status: r.status, description: r.description, createdAt: r.created_at
    }))});
  } catch (err) { fail(res, 'Failed to fetch transactions.', 500); }
});

export { ensureWallet };
export default router;
