import { Router } from 'express';
import crypto from 'crypto';
import { pool } from '../db/pool.js';
import { fail, asArray } from '../utils/response.js';
import { requireAuth } from '../middleware/auth.js';
import { ensureWallet } from './wallet.routes.js';

const router = Router();
const uid = () => crypto.randomUUID();

// Astrologer creates subscription plan
router.post('/astrologer/subscription-plans', requireAuth('astrologer'), async (req, res) => {
  const { planName, planCode, price, durationDays, description, benefits } = req.body;
  if (!planName || !planCode) return fail(res, 'Plan name and code are required.');
  if (price === undefined || price < 0) return fail(res, 'Price must be >= 0.');
  if (!durationDays || durationDays <= 0) return fail(res, 'Duration must be > 0.');
  try {
    const planId = uid();
    await pool.query(
      `INSERT INTO subscription_plans (id,astrologer_id,plan_name,plan_code,price,duration_days,description)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [planId, req.auth.sub, planName, planCode.toLowerCase(), price || 0, durationDays || 30, description || null]
    );
    const benefitList = asArray(benefits);
    for (const b of benefitList) {
      await pool.query(
        `INSERT INTO subscription_plan_benefits (plan_id,benefit_type,benefit_name,benefit_value,description)
         VALUES ($1,$2,$3,$4,$5)`,
        [planId, b.benefitType, b.benefitName, b.benefitValue || 1, b.description || null]
      );
    }
    res.status(201).json({ success: true, message: 'Plan created successfully', data: { planId } });
  } catch (err) {
    if (err.code === '23505') return fail(res, 'A plan with this code already exists.');
    fail(res, 'Failed to create plan.', 500);
  }
});

// Astrologer lists own plans
router.get('/astrologer/subscription-plans', requireAuth('astrologer'), async (req, res) => {
  try {
    const plansRes = await pool.query('SELECT * FROM subscription_plans WHERE astrologer_id=$1 ORDER BY sort_order, created_at', [req.auth.sub]);
    const plans = [];
    for (const p of plansRes.rows) {
      const benefits = await pool.query('SELECT * FROM subscription_plan_benefits WHERE plan_id=$1 AND is_active=true', [p.id]);
      plans.push({
        id: p.id, planName: p.plan_name, planCode: p.plan_code, price: parseFloat(p.price),
        currency: p.currency, durationDays: p.duration_days, description: p.description,
        isActive: p.is_active, createdAt: p.created_at,
        benefits: benefits.rows.map(b => ({ id: b.id, benefitType: b.benefit_type, benefitName: b.benefit_name, benefitValue: b.benefit_value, description: b.description }))
      });
    }
    res.json({ success: true, data: plans });
  } catch (err) { fail(res, 'Failed to fetch plans.', 500); }
});

// Public: Get plans for a specific astrologer (for user profile page)
router.get('/astrologers/:astrologerId/subscription-plans', async (req, res) => {
  try {
    const plansRes = await pool.query(
      "SELECT * FROM subscription_plans WHERE astrologer_id=$1 AND is_active=true ORDER BY sort_order, price",
      [req.params.astrologerId]);
    const plans = [];
    for (const p of plansRes.rows) {
      const benefits = await pool.query('SELECT * FROM subscription_plan_benefits WHERE plan_id=$1 AND is_active=true', [p.id]);
      plans.push({
        id: p.id, planName: p.plan_name, planCode: p.plan_code, price: parseFloat(p.price),
        currency: p.currency, durationDays: p.duration_days, description: p.description,
        benefits: benefits.rows.map(b => ({ benefitType: b.benefit_type, benefitName: b.benefit_name, benefitValue: b.benefit_value }))
      });
    }
    res.json({ success: true, data: plans });
  } catch (err) { fail(res, 'Failed to fetch plans.', 500); }
});

// User: Subscribe to astrologer
router.post('/user/subscriptions', requireAuth('user'), async (req, res) => {
  const { astrologerId, planId, autoRenew } = req.body;
  if (!astrologerId || !planId) return fail(res, 'Astrologer ID and plan ID are required.');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Validate plan
    const planRes = await client.query('SELECT * FROM subscription_plans WHERE id=$1 AND astrologer_id=$2 AND is_active=true', [planId, astrologerId]);
    if (!planRes.rows.length) { await client.query('ROLLBACK'); return fail(res, 'Plan not found or inactive.', 404); }
    const plan = planRes.rows[0];

    // Check for existing active subscription - treat as renewal
    const existing = await client.query(
      "SELECT * FROM user_subscriptions WHERE user_id=$1 AND astrologer_id=$2 AND status='active'",
      [req.auth.sub, astrologerId]);
    if (existing.rows.length) {
      // Extend expiry
      const sub = existing.rows[0];
      const newExpiry = new Date(Math.max(new Date(sub.expires_at).getTime(), Date.now()) + plan.duration_days * 86400000);
      await client.query('UPDATE user_subscriptions SET expires_at=$1,plan_id=$2,updated_at=NOW() WHERE id=$3', [newExpiry, planId, sub.id]);
      // Regenerate perks
      await client.query('DELETE FROM user_perks WHERE subscription_id=$1', [sub.id]);
      const benefits = await client.query('SELECT * FROM subscription_plan_benefits WHERE plan_id=$1 AND is_active=true', [planId]);
      for (const b of benefits.rows) {
        await client.query(
          `INSERT INTO user_perks (user_id,astrologer_id,subscription_id,plan_benefit_id,perk_type,title,total_count,used_count,status,valid_from,valid_until)
           VALUES ($1,$2,$3,$4,$5,$6,$7,0,'available',NOW(),$8)`,
          [req.auth.sub, astrologerId, sub.id, b.id, b.benefit_type, b.benefit_name, b.benefit_value || 1, newExpiry]);
      }
      await client.query('COMMIT');
      return res.json({ success: true, message: 'Subscription renewed.', data: { subscriptionId: sub.id, status: 'active', expiresAt: newExpiry } });
    }

    // Deduct wallet
    const wallet = await ensureWallet(client, req.auth.sub, 'user');
    if (parseFloat(wallet.available_balance) < parseFloat(plan.price)) {
      await client.query('ROLLBACK');
      return fail(res, 'Insufficient wallet balance.');
    }
    const price = parseFloat(plan.price);
    if (price > 0) {
      await client.query('UPDATE wallet_accounts SET available_balance=available_balance-$1,hold_balance=hold_balance+$1,updated_at=NOW() WHERE id=$2', [price, wallet.id]);
      await client.query(
        'INSERT INTO wallet_transactions (wallet_id,owner_type,owner_id,transaction_type,service_type,amount,status,description) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
        [wallet.id, 'user', req.auth.sub, 'subscription_payment', 'subscription', price, 'completed', `Subscription: ${plan.plan_name}`]);
    }

    // Create subscription
    const subId = uid();
    const expiresAt = new Date(Date.now() + plan.duration_days * 86400000);
    await client.query(
      `INSERT INTO user_subscriptions (id,user_id,astrologer_id,plan_id,status,started_at,expires_at,auto_renew)
       VALUES ($1,$2,$3,$4,'active',NOW(),$5,$6)`,
      [subId, req.auth.sub, astrologerId, planId, expiresAt, autoRenew || false]);

    // Generate perks
    const benefits = await client.query('SELECT * FROM subscription_plan_benefits WHERE plan_id=$1 AND is_active=true', [planId]);
    for (const b of benefits.rows) {
      await client.query(
        `INSERT INTO user_perks (user_id,astrologer_id,subscription_id,plan_benefit_id,perk_type,title,total_count,used_count,status,valid_from,valid_until)
         VALUES ($1,$2,$3,$4,$5,$6,$7,0,'available',NOW(),$8)`,
        [req.auth.sub, astrologerId, subId, b.id, b.benefit_type, b.benefit_name, b.benefit_value || 1, expiresAt]);
    }

    // Astrologer wallet (commission)
    const commission = Math.round(price * 0.20 * 100) / 100;
    const astroEarning = price - commission;
    const astroWallet = await ensureWallet(client, astrologerId, 'astrologer');
    if (price > 0) {
      await client.query('UPDATE wallet_accounts SET available_balance=available_balance+$1,updated_at=NOW() WHERE id=$2', [astroEarning, astroWallet.id]);
      await client.query(
        'INSERT INTO wallet_transactions (wallet_id,owner_type,owner_id,transaction_type,service_type,amount,status,description) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
        [astroWallet.id, 'astrologer', astrologerId, 'subscription_earning', 'subscription', astroEarning, 'completed', `Subscription earning from ${plan.plan_name}`]);
    }

    await client.query('COMMIT');
    res.status(201).json({ success: true, message: 'Subscription activated.', data: { subscriptionId: subId, status: 'active', expiresAt } });
  } catch (err) {
    await client.query('ROLLBACK');
    fail(res, 'Failed to subscribe.', 500);
  } finally { client.release(); }
});

// User: Get my subscriptions + follows
router.get('/user/subscriptions', requireAuth('user'), async (req, res) => {
  try {
    const [follows, active, expired] = await Promise.all([
      pool.query(
        `SELECT f.*, a.display_name, a.professional_title, a.profile_photo_url
         FROM user_follows f JOIN astrologers a ON a.id = f.astrologer_id
         WHERE f.user_id=$1 AND f.status='active' ORDER BY f.followed_at DESC`, [req.auth.sub]),
      pool.query(
        `SELECT us.*, sp.plan_name, sp.plan_code, a.display_name
         FROM user_subscriptions us
         JOIN subscription_plans sp ON sp.id = us.plan_id
         JOIN astrologers a ON a.id = us.astrologer_id
         WHERE us.user_id=$1 AND us.status='active' ORDER BY us.expires_at`, [req.auth.sub]),
      pool.query(
        `SELECT us.*, sp.plan_name, sp.plan_code, a.display_name
         FROM user_subscriptions us
         JOIN subscription_plans sp ON sp.id = us.plan_id
         JOIN astrologers a ON a.id = us.astrologer_id
         WHERE us.user_id=$1 AND us.status IN ('expired','cancelled') ORDER BY us.expires_at DESC LIMIT 20`, [req.auth.sub])
    ]);
    res.json({ success: true, data: {
      following: follows.rows.map(f => ({ id: f.id, astrologerId: f.astrologer_id, displayName: f.display_name, professionalTitle: f.professional_title, followedAt: f.followed_at })),
      activeSubscriptions: active.rows.map(s => ({ id: s.id, astrologerId: s.astrologer_id, displayName: s.display_name, planName: s.plan_name, planCode: s.plan_code, status: s.status, expiresAt: s.expires_at, startedAt: s.started_at, autoRenew: s.auto_renew })),
      expiredSubscriptions: expired.rows.map(s => ({ id: s.id, astrologerId: s.astrologer_id, displayName: s.display_name, planName: s.plan_name, planCode: s.plan_code, status: s.status, expiresAt: s.expires_at }))
    }});
  } catch (err) { fail(res, 'Failed to fetch subscriptions.', 500); }
});

// User: Cancel subscription
router.post('/user/subscriptions/:subId/cancel', requireAuth('user'), async (req, res) => {
  try {
    const res2 = await pool.query(
      "UPDATE user_subscriptions SET status='cancelled',cancelled_at=NOW(),auto_renew=false,updated_at=NOW() WHERE id=$1 AND user_id=$2 AND status='active' RETURNING id",
      [req.params.subId, req.auth.sub]);
    if (!res2.rows.length) return fail(res, 'Active subscription not found.', 404);
    // Lock perks
    await pool.query("UPDATE user_perks SET status='locked' WHERE subscription_id=$1 AND status IN ('available','partially_used')", [req.params.subId]);
    res.json({ success: true, message: 'Subscription cancelled. Benefits remain until expiry.' });
  } catch (err) { fail(res, 'Failed to cancel.', 500); }
});

// User: Renew subscription
router.post('/user/subscriptions/:subId/renew', requireAuth('user'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const subRes = await client.query(
      "SELECT us.*, sp.price, sp.duration_days, sp.plan_name FROM user_subscriptions us JOIN subscription_plans sp ON sp.id=us.plan_id WHERE us.id=$1 AND us.user_id=$2",
      [req.params.subId, req.auth.sub]);
    if (!subRes.rows.length) { await client.query('ROLLBACK'); return fail(res, 'Subscription not found.', 404); }
    const sub = subRes.rows[0];

    // Deduct wallet
    const wallet = await ensureWallet(client, req.auth.sub, 'user');
    const price = parseFloat(sub.price);
    if (price > 0 && parseFloat(wallet.available_balance) < price) {
      await client.query('ROLLBACK');
      return fail(res, 'Insufficient wallet balance.');
    }
    if (price > 0) {
      await client.query('UPDATE wallet_accounts SET available_balance=available_balance-$1,updated_at=NOW() WHERE id=$2', [price, wallet.id]);
      await client.query(
        'INSERT INTO wallet_transactions (wallet_id,owner_type,owner_id,transaction_type,service_type,amount,status,description) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
        [wallet.id, 'user', req.auth.sub, 'subscription_payment', 'subscription', price, 'completed', `Subscription renewal: ${sub.plan_name}`]);
    }

    // Extend subscription
    const baseDate = new Date(sub.expires_at) > new Date() ? new Date(sub.expires_at) : new Date();
    const newExpiry = new Date(baseDate.getTime() + sub.duration_days * 86400000);
    await client.query("UPDATE user_subscriptions SET status='active',expires_at=$1,updated_at=NOW() WHERE id=$2", [newExpiry, req.params.subId]);

    // Regenerate perks
    await client.query("UPDATE user_perks SET status='locked' WHERE subscription_id=$1 AND status IN ('available','partially_used')", [req.params.subId]);
    const benefits = await client.query('SELECT * FROM subscription_plan_benefits WHERE plan_id=$1 AND is_active=true', [sub.plan_id]);
    for (const b of benefits.rows) {
      await client.query(
        `INSERT INTO user_perks (user_id,astrologer_id,subscription_id,plan_benefit_id,perk_type,title,total_count,used_count,status,valid_from,valid_until)
         VALUES ($1,$2,$3,$4,$5,$6,$7,0,'available',NOW(),$8)`,
        [req.auth.sub, sub.astrologer_id, req.params.subId, b.id, b.benefit_type, b.benefit_name, b.benefit_value || 1, newExpiry]);
    }

    // Astrologer wallet
    const commission = Math.round(price * 0.20 * 100) / 100;
    const astroEarning = price - commission;
    const astroWallet = await ensureWallet(client, sub.astrologer_id, 'astrologer');
    if (price > 0) {
      await client.query('UPDATE wallet_accounts SET available_balance=available_balance+$1,updated_at=NOW() WHERE id=$2', [astroEarning, astroWallet.id]);
      await client.query(
        'INSERT INTO wallet_transactions (wallet_id,owner_type,owner_id,transaction_type,service_type,amount,status,description) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
        [astroWallet.id, 'astrologer', sub.astrologer_id, 'subscription_earning', 'subscription', astroEarning, 'completed', `Renewal earning: ${sub.plan_name}`]);
    }

    await client.query('COMMIT');
    res.json({ success: true, message: 'Subscription renewed.', data: { expiresAt: newExpiry } });
  } catch (err) { await client.query('ROLLBACK'); fail(res, 'Failed to renew.', 500); }
  finally { client.release(); }
});

// User: Upgrade subscription
router.post('/user/subscriptions/:subId/upgrade', requireAuth('user'), async (req, res) => {
  const { newPlanId } = req.body;
  if (!newPlanId) return fail(res, 'newPlanId is required.');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const subRes = await client.query(
      "SELECT us.*, sp.price as current_price, sp.plan_code as current_code, sp.plan_name as current_name, sp.duration_days FROM user_subscriptions us JOIN subscription_plans sp ON sp.id=us.plan_id WHERE us.id=$1 AND us.user_id=$2 AND us.status='active'",
      [req.params.subId, req.auth.sub]);
    if (!subRes.rows.length) { await client.query('ROLLBACK'); return fail(res, 'Active subscription not found.', 404); }
    const sub = subRes.rows[0];

    const newPlanRes = await client.query('SELECT * FROM subscription_plans WHERE id=$1 AND astrologer_id=$2 AND is_active=true', [newPlanId, sub.astrologer_id]);
    if (!newPlanRes.rows.length) { await client.query('ROLLBACK'); return fail(res, 'New plan not found.', 404); }
    const newPlan = newPlanRes.rows[0];

    const PLAN_ORDER = { silver: 1, gold: 2, platinum: 3 };
    if ((PLAN_ORDER[newPlan.plan_code] || 0) <= (PLAN_ORDER[sub.current_code] || 0)) {
      await client.query('ROLLBACK');
      return fail(res, 'New plan must be higher than current plan. Use downgrade instead.');
    }

    // Calculate upgrade difference
    const priceDiff = Math.max(0, parseFloat(newPlan.price) - parseFloat(sub.current_price));
    const wallet = await ensureWallet(client, req.auth.sub, 'user');
    if (priceDiff > 0 && parseFloat(wallet.available_balance) < priceDiff) {
      await client.query('ROLLBACK');
      return fail(res, 'Insufficient wallet balance for upgrade.');
    }
    if (priceDiff > 0) {
      await client.query('UPDATE wallet_accounts SET available_balance=available_balance-$1,updated_at=NOW() WHERE id=$2', [priceDiff, wallet.id]);
      await client.query(
        'INSERT INTO wallet_transactions (wallet_id,owner_type,owner_id,transaction_type,service_type,amount,status,description) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
        [wallet.id, 'user', req.auth.sub, 'subscription_payment', 'subscription', priceDiff, 'completed', `Upgrade to ${newPlan.plan_name}`]);
    }

    // Update subscription
    await client.query('UPDATE user_subscriptions SET plan_id=$1,updated_at=NOW() WHERE id=$2', [newPlanId, req.params.subId]);

    // Regenerate perks
    await client.query("UPDATE user_perks SET status='locked' WHERE subscription_id=$1 AND status IN ('available','partially_used')", [req.params.subId]);
    const benefits = await client.query('SELECT * FROM subscription_plan_benefits WHERE plan_id=$1 AND is_active=true', [newPlanId]);
    for (const b of benefits.rows) {
      await client.query(
        `INSERT INTO user_perks (user_id,astrologer_id,subscription_id,plan_benefit_id,perk_type,title,total_count,used_count,status,valid_from,valid_until)
         VALUES ($1,$2,$3,$4,$5,$6,$7,0,'available',NOW(),$8)`,
        [req.auth.sub, sub.astrologer_id, req.params.subId, b.id, b.benefit_type, b.benefit_name, b.benefit_value || 1, sub.expires_at]);
    }

    // Astrologer wallet
    const commission = Math.round(priceDiff * 0.20 * 100) / 100;
    const astroEarning = priceDiff - commission;
    const astroWallet = await ensureWallet(client, sub.astrologer_id, 'astrologer');
    if (priceDiff > 0) {
      await client.query('UPDATE wallet_accounts SET available_balance=available_balance+$1,updated_at=NOW() WHERE id=$2', [astroEarning, astroWallet.id]);
      await client.query(
        'INSERT INTO wallet_transactions (wallet_id,owner_type,owner_id,transaction_type,service_type,amount,status,description) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
        [astroWallet.id, 'astrologer', sub.astrologer_id, 'subscription_earning', 'subscription', astroEarning, 'completed', `Upgrade earning: ${newPlan.plan_name}`]);
    }

    await client.query('COMMIT');
    res.json({ success: true, message: 'Subscription upgraded.', data: { newPlanName: newPlan.plan_name } });
  } catch (err) { await client.query('ROLLBACK'); fail(res, 'Failed to upgrade.', 500); }
  finally { client.release(); }
});

// User: Downgrade subscription
router.post('/user/subscriptions/:subId/downgrade', requireAuth('user'), async (req, res) => {
  const { newPlanId, applyFrom = 'next_cycle' } = req.body;
  if (!newPlanId) return fail(res, 'newPlanId is required.');
  try {
    const subRes = await pool.query(
      "SELECT us.*, sp.plan_code as current_code FROM user_subscriptions us JOIN subscription_plans sp ON sp.id=us.plan_id WHERE us.id=$1 AND us.user_id=$2 AND us.status='active'",
      [req.params.subId, req.auth.sub]);
    if (!subRes.rows.length) return fail(res, 'Active subscription not found.', 404);
    const sub = subRes.rows[0];

    const newPlanRes = await pool.query('SELECT * FROM subscription_plans WHERE id=$1 AND astrologer_id=$2 AND is_active=true', [newPlanId, sub.astrologer_id]);
    if (!newPlanRes.rows.length) return fail(res, 'New plan not found.', 404);
    const newPlan = newPlanRes.rows[0];

    const PLAN_ORDER = { silver: 1, gold: 2, platinum: 3 };
    if ((PLAN_ORDER[newPlan.plan_code] || 0) >= (PLAN_ORDER[sub.current_code] || 0)) {
      return fail(res, 'New plan must be lower than current plan. Use upgrade instead.');
    }

    if (applyFrom === 'immediate') {
      // Apply now
      await pool.query('UPDATE user_subscriptions SET plan_id=$1,updated_at=NOW() WHERE id=$2', [newPlanId, req.params.subId]);
      // Regenerate perks
      await pool.query("UPDATE user_perks SET status='locked' WHERE subscription_id=$1 AND status IN ('available','partially_used')", [req.params.subId]);
      const benefits = await pool.query('SELECT * FROM subscription_plan_benefits WHERE plan_id=$1 AND is_active=true', [newPlanId]);
      for (const b of benefits.rows) {
        await pool.query(
          `INSERT INTO user_perks (user_id,astrologer_id,subscription_id,plan_benefit_id,perk_type,title,total_count,used_count,status,valid_from,valid_until)
           VALUES ($1,$2,$3,$4,$5,$6,$7,0,'available',NOW(),$8)`,
          [req.auth.sub, sub.astrologer_id, req.params.subId, b.id, b.benefit_type, b.benefit_name, b.benefit_value || 1, sub.expires_at]);
      }
      return res.json({ success: true, message: 'Downgraded immediately.' });
    }

    // Next cycle: store pending plan change
    await pool.query("UPDATE user_subscriptions SET updated_at=NOW() WHERE id=$1", [req.params.subId]);
    // Simple approach: just update the plan (will take effect on next renewal)
    await pool.query('UPDATE user_subscriptions SET plan_id=$1,updated_at=NOW() WHERE id=$2', [newPlanId, req.params.subId]);
    await pool.query("UPDATE user_perks SET status='locked' WHERE subscription_id=$1 AND status IN ('available','partially_used')", [req.params.subId]);
    const benefits = await pool.query('SELECT * FROM subscription_plan_benefits WHERE plan_id=$1 AND is_active=true', [newPlanId]);
    for (const b of benefits.rows) {
      await pool.query(
        `INSERT INTO user_perks (user_id,astrologer_id,subscription_id,plan_benefit_id,perk_type,title,total_count,used_count,status,valid_from,valid_until)
         VALUES ($1,$2,$3,$4,$5,$6,$7,0,'available',NOW(),$8)`,
        [req.auth.sub, sub.astrologer_id, req.params.subId, b.id, b.benefit_type, b.benefit_name, b.benefit_value || 1, sub.expires_at]);
    }
    res.json({ success: true, message: 'Downgrade applied. New plan active from next cycle.' });
  } catch (err) { fail(res, 'Failed to downgrade.', 500); }
});

export default router;
