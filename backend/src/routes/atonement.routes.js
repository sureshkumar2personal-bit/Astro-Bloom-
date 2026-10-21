import { Router } from 'express';
import { pool } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import { fail } from '../utils/response.js';

const router = Router();

const VALID_REMEDY_TYPES = [
  'mantra_chanting', 'temple_visit', 'donation', 'fasting', 'pooja', 'homam',
  'digital_atonement', 'festival_pariharam', 'dosham_remedy', 'sani_pariharam',
  'rahu_ketu_pariharam', 'sevvai_remedy', 'marriage_delay_remedy',
  'career_obstacle_remedy', 'family_peace_remedy', 'ecommerce_referral', 'discount_purchase'
];
const VALID_SOURCE_TYPES = [
  'text_question', 'appointment', 'emergency_call', 'live_session', 'ai_chat', 'free_calculation', 'platform_event', 'manual'
];
const VALID_STATUSES = [
  'draft', 'prescribed', 'notified', 'pending_user_action', 'payment_pending',
  'paid', 'in_progress', 'proof_uploaded', 'completed', 'cancelled', 'expired', 'disputed', 'refunded'
];
const VALID_PAYMENT_STATUSES = ['not_required', 'pending', 'paid', 'failed', 'refunded', 'partially_refunded', 'held', 'released'];

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
}

// ═══════════════════════════════════════════════════════════════════════════
// ASTROLOGER APIS
// ═══════════════════════════════════════════════════════════════════════════

// Dashboard
router.get('/astrologer/atonements/dashboard', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'astrologer') return res.status(403).json(fail('Astrologer access required'));
    const astrologerId = req.user.id;

    const [total, pending, completed, paid, disputed, freeCount, revenueResult] = await Promise.all([
      pool.query('SELECT COUNT(*)::int as c FROM atonements WHERE astrologer_id=$1', [astrologerId]),
      pool.query("SELECT COUNT(*)::int as c FROM atonements WHERE astrologer_id=$1 AND status IN ('prescribed','notified','pending_user_action','payment_pending')", [astrologerId]),
      pool.query("SELECT COUNT(*)::int as c FROM atonements WHERE astrologer_id=$1 AND status='completed'", [astrologerId]),
      pool.query("SELECT COUNT(*)::int as c FROM atonements WHERE astrologer_id=$1 AND is_paid=true AND payment_status='paid'", [astrologerId]),
      pool.query("SELECT COUNT(*)::int as c FROM atonements WHERE astrologer_id=$1 AND status='disputed'", [astrologerId]),
      pool.query("SELECT COUNT(*)::int as c FROM atonements WHERE astrologer_id=$1 AND is_paid=false", [astrologerId]),
      pool.query("SELECT COALESCE(SUM(astrologer_commission),0)::numeric as total FROM atonement_revenues WHERE astrologer_id=$1 AND status='released'", [astrologerId])
    ]);

    res.json({
      success: true,
      data: {
        total: total.rows[0].c,
        pending: pending.rows[0].c,
        completed: completed.rows[0].c,
        paid: paid.rows[0].c,
        disputed: disputed.rows[0].c,
        free: freeCount.rows[0].c,
        revenue: Number(revenueResult.rows[0].total)
      }
    });
  } catch (e) { res.status(400).json(fail(e.message)); }
});

// List atonements
router.get('/astrologer/atonements', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'astrologer') return res.status(403).json(fail('Astrologer access required'));
    const astrologerId = req.user.id;
    const { status, remedyType, sourceType, search, page = 1, limit = 20 } = req.query;
    const offset = (Math.max(1, Number(page)) - 1) * Number(limit);
    const conditions = ['a.astrologer_id=$1'];
    const params = [astrologerId];
    let idx = 2;

    if (status) { conditions.push(`a.status=$${idx++}`); params.push(status); }
    if (remedyType) { conditions.push(`a.remedy_type=$${idx++}`); params.push(remedyType); }
    if (sourceType) { conditions.push(`a.source_type=$${idx++}`); params.push(sourceType); }
    if (search) { conditions.push(`(a.title ILIKE $${idx} OR u.name ILIKE $${idx})`); params.push(`%${search}%`); idx++; }

    const where = conditions.join(' AND ');
    const countR = await pool.query(`SELECT COUNT(*)::int as c FROM atonements a LEFT JOIN users u ON a.user_id=u.id WHERE ${where}`, params);
    const items = await pool.query(
      `SELECT a.*, u.name as user_name, u.mobile as user_mobile
       FROM atonements a LEFT JOIN users u ON a.user_id=u.id
       WHERE ${where} ORDER BY a.created_at DESC LIMIT $${idx++} OFFSET $${idx}`,
      [...params, Number(limit), offset]
    );

    res.json({ success: true, data: { items: items.rows, total: countR.rows[0].c, page: Number(page), limit: Number(limit) } });
  } catch (e) { res.status(400).json(fail(e.message)); }
});

// Get one atonement (astrologer)
router.get('/astrologer/atonements/:atonementId', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'astrologer') return res.status(403).json(fail('Astrologer access required'));
    const r = await pool.query(
      `SELECT a.*, u.name as user_name, u.mobile as user_mobile
       FROM atonements a LEFT JOIN users u ON a.user_id=u.id
       WHERE a.id=$1 AND a.astrologer_id=$2`, [req.params.atonementId, req.user.id]
    );
    if (!r.rows.length) return res.status(404).json(fail('Atonement not found'));
    const history = await pool.query('SELECT * FROM atonement_status_history WHERE atonement_id=$1 ORDER BY created_at', [req.params.atonementId]);
    const proofs = await pool.query('SELECT * FROM atonement_proofs WHERE atonement_id=$1 ORDER BY created_at', [req.params.atonementId]);
    res.json({ success: true, data: { ...r.rows[0], history: history.rows, proofs: proofs.rows } });
  } catch (e) { res.status(400).json(fail(e.message)); }
});

// Create atonement
router.post('/astrologer/atonements', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'astrologer') return res.status(403).json(fail('Astrologer access required'));
    const { userId, sourceType, sourceId, title, remedyType, problemCategory, astrologyReason, instructions, isPaid, price, proofRequired, expectedCompletionDate } = req.body;
    if (!userId || !title || !remedyType || !instructions || !sourceType) {
      return res.status(400).json(fail('userId, title, remedyType, instructions, sourceType are required'));
    }
    if (!VALID_REMEDY_TYPES.includes(remedyType)) return res.status(400).json(fail('Invalid remedy type'));
    if (!VALID_SOURCE_TYPES.includes(sourceType)) return res.status(400).json(fail('Invalid source type'));
    if (isPaid && (!price || Number(price) <= 0)) return res.status(400).json(fail('Paid atonement requires price > 0'));

    const paymentStatus = isPaid ? 'pending' : 'not_required';
    const r = await pool.query(
      `INSERT INTO atonements (user_id,astrologer_id,source_type,source_id,title,remedy_type,problem_category,astrology_reason,instructions,is_paid,price,proof_required,expected_completion_date,status,payment_status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'prescribed',$14) RETURNING id,status`,
      [userId, req.user.id, sourceType, sourceId || null, title, remedyType, problemCategory || null, astrologyReason || null, instructions, !!isPaid, Number(price) || 0, !!proofRequired, expectedCompletionDate || null, paymentStatus]
    );

    await pool.query(
      'INSERT INTO atonement_status_history (atonement_id,old_status,new_status,changed_by_type,changed_by_id,note) VALUES ($1,NULL,$2,$3,$4,$5)',
      [r.rows[0].id, 'prescribed', 'astrologer', req.user.id, 'Remedy prescribed']
    );

    res.json({ success: true, message: 'Atonement prescribed successfully', data: { atonementId: r.rows[0].id, status: r.rows[0].status } });
  } catch (e) { res.status(400).json(fail(e.message)); }
});

// Update atonement
router.patch('/astrologer/atonements/:atonementId', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'astrologer') return res.status(403).json(fail('Astrologer access required'));
    const existing = await pool.query('SELECT * FROM atonements WHERE id=$1 AND astrologer_id=$2', [req.params.atonementId, req.user.id]);
    if (!existing.rows.length) return res.status(404).json(fail('Atonement not found'));

    const { title, remedyType, problemCategory, astrologyReason, instructions, isPaid, price, proofRequired, expectedCompletionDate } = req.body;
    const updates = [];
    const params = [];
    let idx = 1;

    if (title !== undefined) { updates.push(`title=$${idx++}`); params.push(title); }
    if (remedyType !== undefined) { updates.push(`remedy_type=$${idx++}`); params.push(remedyType); }
    if (problemCategory !== undefined) { updates.push(`problem_category=$${idx++}`); params.push(problemCategory); }
    if (astrologyReason !== undefined) { updates.push(`astrology_reason=$${idx++}`); params.push(astrologyReason); }
    if (instructions !== undefined) { updates.push(`instructions=$${idx++}`); params.push(instructions); }
    if (isPaid !== undefined) { updates.push(`is_paid=$${idx++}`); params.push(!!isPaid); }
    if (price !== undefined) { updates.push(`price=$${idx++}`); params.push(Number(price)); }
    if (proofRequired !== undefined) { updates.push(`proof_required=$${idx++}`); params.push(!!proofRequired); }
    if (expectedCompletionDate !== undefined) { updates.push(`expected_completion_date=$${idx++}`); params.push(expectedCompletionDate); }

    if (updates.length) {
      updates.push(`updated_at=NOW()`);
      await pool.query(`UPDATE atonements SET ${updates.join(', ')} WHERE id=$${idx}`, [...params, req.params.atonementId]);
    }
    res.json({ success: true, message: 'Atonement updated' });
  } catch (e) { res.status(400).json(fail(e.message)); }
});

// Update status
router.patch('/astrologer/atonements/:atonementId/status', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'astrologer') return res.status(403).json(fail('Astrologer access required'));
    const { status, note } = req.body;
    if (!status || !VALID_STATUSES.includes(status)) return res.status(400).json(fail('Invalid status'));

    const existing = await pool.query('SELECT * FROM atonements WHERE id=$1 AND astrologer_id=$2', [req.params.atonementId, req.user.id]);
    if (!existing.rows.length) return res.status(404).json(fail('Atonement not found'));

    const oldStatus = existing.rows[0].status;
    await pool.query('UPDATE atonements SET status=$1, updated_at=NOW() WHERE id=$2', [status, req.params.atonementId]);
    await pool.query(
      'INSERT INTO atonement_status_history (atonement_id,old_status,new_status,changed_by_type,changed_by_id,note) VALUES ($1,$2,$3,$4,$5,$6)',
      [req.params.atonementId, oldStatus, status, 'astrologer', req.user.id, note || null]
    );

    res.json({ success: true, message: 'Status updated' });
  } catch (e) { res.status(400).json(fail(e.message)); }
});

// Notify user
router.post('/astrologer/atonements/:atonementId/notify-user', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'astrologer') return res.status(403).json(fail('Astrologer access required'));
    const existing = await pool.query('SELECT * FROM atonements WHERE id=$1 AND astrologer_id=$2', [req.params.atonementId, req.user.id]);
    if (!existing.rows.length) return res.status(404).json(fail('Atonement not found'));

    await pool.query(
      "INSERT INTO notifications (user_id,title,body,type,entity_type,entity_id) VALUES ($1,$2,$3,'atonement','atonement',$4)",
      [existing.rows[0].user_id, 'New Remedy Prescribed', `You have a new remedy: ${existing.rows[0].title}`, req.params.atonementId]
    );

    if (existing.rows[0].status === 'prescribed') {
      await pool.query("UPDATE atonements SET status='notified', updated_at=NOW() WHERE id=$1", [req.params.atonementId]);
      await pool.query(
        'INSERT INTO atonement_status_history (atonement_id,old_status,new_status,changed_by_type,changed_by_id,note) VALUES ($1,$2,$3,$4,$5,$6)',
        [req.params.atonementId, 'prescribed', 'notified', 'astrologer', req.user.id, 'User notified']
      );
    }

    res.json({ success: true, message: 'User notified' });
  } catch (e) { res.status(400).json(fail(e.message)); }
});

// ═══════════════════════════════════════════════════════════════════════════
// USER APIS
// ═══════════════════════════════════════════════════════════════════════════

// List user atonements
router.get('/user/atonements', requireAuth('user'), async (req, res) => {
  try {
    const { status, remedyType, sourceType, page = 1, limit = 20 } = req.query;
    const offset = (Math.max(1, Number(page)) - 1) * Number(limit);
    const conditions = ['a.user_id=$1'];
    const params = [req.auth.sub];
    let idx = 2;

    if (status) { conditions.push(`a.status=$${idx++}`); params.push(status); }
    if (remedyType) { conditions.push(`a.remedy_type=$${idx++}`); params.push(remedyType); }
    if (sourceType) { conditions.push(`a.source_type=$${idx++}`); params.push(sourceType); }

    const where = conditions.join(' AND ');
    const countR = await pool.query(`SELECT COUNT(*)::int as c FROM atonements a WHERE ${where}`, params);
    const items = await pool.query(
      `SELECT a.*, ast.display_name as astrologer_name
       FROM atonements a LEFT JOIN astrologers ast ON a.astrologer_id=ast.id
       WHERE ${where} ORDER BY a.created_at DESC LIMIT $${idx++} OFFSET $${idx}`,
      [...params, Number(limit), offset]
    );

    res.json({ success: true, data: { items: items.rows, total: countR.rows[0].c, page: Number(page), limit: Number(limit) } });
  } catch (e) { res.status(400).json(fail(e.message)); }
});

// Get one atonement (user)
router.get('/user/atonements/:atonementId', requireAuth('user'), async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT a.*, ast.display_name as astrologer_name
       FROM atonements a LEFT JOIN astrologers ast ON a.astrologer_id=ast.id
       WHERE a.id=$1 AND a.user_id=$2`, [req.params.atonementId, req.auth.sub]
    );
    if (!r.rows.length) return res.status(404).json(fail('Atonement not found'));
    const history = await pool.query('SELECT * FROM atonement_status_history WHERE atonement_id=$1 ORDER BY created_at', [req.params.atonementId]);
    const proofs = await pool.query('SELECT * FROM atonement_proofs WHERE atonement_id=$1 ORDER BY created_at', [req.params.atonementId]);
    res.json({ success: true, data: { ...r.rows[0], history: history.rows, proofs: proofs.rows } });
  } catch (e) { res.status(400).json(fail(e.message)); }
});

// Mark started
router.post('/user/atonements/:atonementId/mark-started', requireAuth('user'), async (req, res) => {
  try {
    const existing = await pool.query('SELECT * FROM atonements WHERE id=$1 AND user_id=$2', [req.params.atonementId, req.auth.sub]);
    if (!existing.rows.length) return res.status(404).json(fail('Atonement not found'));

    const oldStatus = existing.rows[0].status;
    await pool.query("UPDATE atonements SET status='in_progress', updated_at=NOW() WHERE id=$1", [req.params.atonementId]);
    await pool.query(
      'INSERT INTO atonement_status_history (atonement_id,old_status,new_status,changed_by_type,changed_by_id,note) VALUES ($1,$2,$3,$4,$5,$6)',
      [req.params.atonementId, oldStatus, 'in_progress', 'user', req.auth.sub, 'User started remedy']
    );
    res.json({ success: true, message: 'Remedy marked as started' });
  } catch (e) { res.status(400).json(fail(e.message)); }
});

// Upload proof
router.post('/user/atonements/:atonementId/proofs', requireAuth, async (req, res) => {
  try {
    const existing = await pool.query('SELECT * FROM atonements WHERE id=$1 AND user_id=$2', [req.params.atonementId, req.user.id]);
    if (!existing.rows.length) return res.status(404).json(fail('Atonement not found'));

    const { proofType, note, fileUrl } = req.body;
    const url = fileUrl || '/uploads/proof-placeholder.pdf';
    await pool.query(
      'INSERT INTO atonement_proofs (atonement_id,uploaded_by_type,uploaded_by_id,file_url,proof_type,note) VALUES ($1,$2,$3,$4,$5,$6)',
      [req.params.atonementId, 'user', req.user.id, url, proofType || 'image', note || null]
    );

    await pool.query("UPDATE atonements SET status='proof_uploaded', updated_at=NOW() WHERE id=$1 AND status IN ('in_progress','pending_user_action')", [req.params.atonementId]);
    await pool.query(
      'INSERT INTO atonement_status_history (atonement_id,old_status,new_status,changed_by_type,changed_by_id,note) VALUES ($1,$2,$3,$4,$5,$6)',
      [req.params.atonementId, 'in_progress', 'proof_uploaded', 'user', req.user.id, 'Proof uploaded']
    );

    res.json({ success: true, message: 'Proof uploaded' });
  } catch (e) { res.status(400).json(fail(e.message)); }
});

// Pay for atonement
router.post('/user/atonements/:atonementId/pay', requireAuth, async (req, res) => {
  try {
    const existing = await pool.query('SELECT * FROM atonements WHERE id=$1 AND user_id=$2', [req.params.atonementId, req.user.id]);
    if (!existing.rows.length) return res.status(404).json(fail('Atonement not found'));
    const a = existing.rows[0];
    if (!a.is_paid) return res.status(400).json(fail('This is a free remedy'));
    if (a.payment_status === 'paid') return res.status(400).json(fail('Already paid'));

    const { paymentMethod = 'wallet', discountCode } = req.body;
    let grossAmount = Number(a.price);
    let discountAmount = 0;

    // Apply discount code
    if (discountCode) {
      const dcResult = await pool.query(
        "SELECT * FROM discount_codes WHERE code=$1 AND status='active' AND (expires_at IS NULL OR expires_at > NOW()) AND (max_usage IS NULL OR used_count < max_usage)",
        [discountCode]
      );
      if (!dcResult.rows.length) return res.status(400).json(fail('Invalid or expired discount code'));
      const dc = dcResult.rows[0];
      if (dc.discount_type === 'percentage') discountAmount = grossAmount * (Number(dc.discount_value) / 100);
      else discountAmount = Math.min(Number(dc.discount_value), grossAmount);
      await pool.query('UPDATE discount_codes SET used_count=used_count+1 WHERE id=$1', [dc.id]);
      await pool.query(
        'INSERT INTO discount_code_usages (discount_code_id,user_id,atonement_id,original_amount,discount_amount,final_amount) VALUES ($1,$2,$3,$4,$5,$6)',
        [dc.id, req.user.id, req.params.atonementId, grossAmount, discountAmount, grossAmount - discountAmount]
      );
    }

    const finalAmount = grossAmount - discountAmount;
    const platformCommission = finalAmount * 0.20;
    const astrologerEarning = finalAmount - platformCommission;

    // Deduct wallet
    const walletR = await pool.query('SELECT id, balance FROM wallets WHERE user_id=$1', [req.user.id]);
    if (!walletR.rows.length) return res.status(400).json(fail('Wallet not found'));
    if (Number(walletR.rows[0].balance) < finalAmount) return res.status(400).json(fail('Insufficient wallet balance'));

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('UPDATE wallets SET balance=balance-$1, updated_at=NOW() WHERE id=$2', [finalAmount, walletR.rows[0].id]);
      await client.query(
        `INSERT INTO wallet_transactions (wallet_id,type,amount,reference_type,reference_id,description) VALUES ($1,'debit',$2,'atonement',$3,$4)`,
        [walletR.rows[0].id, finalAmount, req.params.atonementId, `Atonement payment: ${a.title}`]
      );
      await client.query(
        `INSERT INTO atonement_payments (atonement_id,user_id,astrologer_id,gross_amount,discount_amount,platform_commission,astrologer_earning,payment_status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'paid')`,
        [req.params.atonementId, req.user.id, a.astrologer_id, grossAmount, discountAmount, platformCommission, astrologerEarning]
      );
      await client.query(
        `INSERT INTO atonement_revenues (atonement_id,astrologer_id,user_id,revenue_source,gross_amount,platform_commission,astrologer_commission,status)
         VALUES ($1,$2,$3,'digital_atonement',$4,$5,$6,'pending')`,
        [req.params.atonementId, a.astrologer_id, req.user.id, grossAmount, platformCommission, astrologerEarning]
      );
      await client.query("UPDATE atonements SET payment_status='paid', status='paid', updated_at=NOW() WHERE id=$1", [req.params.atonementId]);
      await client.query(
        'INSERT INTO atonement_status_history (atonement_id,old_status,new_status,changed_by_type,changed_by_id,note) VALUES ($1,$2,$3,$4,$5,$6)',
        [req.params.atonementId, a.status, 'paid', 'user', req.user.id, `Paid ₹${finalAmount}`]
      );
      await client.query('COMMIT');
    } catch (err) { await client.query('ROLLBACK'); throw err; }
    finally { client.release(); }

    res.json({ success: true, message: 'Payment successful', data: { amountPaid: finalAmount, discountApplied: discountAmount } });
  } catch (e) { res.status(400).json(fail(e.message)); }
});

// ═══════════════════════════════════════════════════════════════════════════
// REVENUE APIS
// ═══════════════════════════════════════════════════════════════════════════

router.get('/astrologer/atonements/revenue', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'astrologer') return res.status(403).json(fail('Astrologer access required'));
    const astrologerId = req.user.id;
    const { status, revenueSource, page = 1, limit = 20 } = req.query;
    const offset = (Math.max(1, Number(page)) - 1) * Number(limit);
    const conditions = ['r.astrologer_id=$1'];
    const params = [astrologerId];
    let idx = 2;

    if (status) { conditions.push(`r.status=$${idx++}`); params.push(status); }
    if (revenueSource) { conditions.push(`r.revenue_source=$${idx++}`); params.push(revenueSource); }

    const where = conditions.join(' AND ');
    const summaryR = await pool.query(
      `SELECT COALESCE(SUM(gross_amount),0)::numeric as gross,
              COALESCE(SUM(platform_commission),0)::numeric as platform_commission,
              COALESCE(SUM(astrologer_commission),0)::numeric as astrologer_commission,
              COUNT(*)::int as total
       FROM atonement_revenues r WHERE ${where}`, params
    );
    const items = await pool.query(
      `SELECT r.*, u.name as user_name, a.title as atonement_title
       FROM atonement_revenues r
       LEFT JOIN users u ON r.user_id=u.id
       LEFT JOIN atonements a ON r.atonement_id=a.id
       WHERE ${where} ORDER BY r.created_at DESC LIMIT $${idx++} OFFSET $${idx}`,
      [...params, Number(limit), offset]
    );

    res.json({ success: true, data: { summary: summaryR.rows[0], items: items.rows } });
  } catch (e) { res.status(400).json(fail(e.message)); }
});

router.get('/astrologer/atonements/revenue/:revenueId', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'astrologer') return res.status(403).json(fail('Astrologer access required'));
    const r = await pool.query(
      `SELECT r.*, u.name as user_name, a.title as atonement_title
       FROM atonement_revenues r LEFT JOIN users u ON r.user_id=u.id LEFT JOIN atonements a ON r.atonement_id=a.id
       WHERE r.id=$1 AND r.astrologer_id=$2`, [req.params.revenueId, req.user.id]
    );
    if (!r.rows.length) return res.status(404).json(fail('Revenue record not found'));
    res.json({ success: true, data: r.rows[0] });
  } catch (e) { res.status(400).json(fail(e.message)); }
});

// ═══════════════════════════════════════════════════════════════════════════
// DISCOUNT CODE APIS
// ═══════════════════════════════════════════════════════════════════════════

router.get('/astrologer/discount-codes', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'astrologer') return res.status(403).json(fail('Astrologer access required'));
    const items = await pool.query(
      'SELECT * FROM discount_codes WHERE astrologer_id=$1 ORDER BY created_at DESC', [req.user.id]
    );
    res.json({ success: true, data: items.rows });
  } catch (e) { res.status(400).json(fail(e.message)); }
});

router.post('/astrologer/discount-codes', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'astrologer') return res.status(403).json(fail('Astrologer access required'));
    const { code, description, remedyType, discountType, discountValue, commissionPercentage, maxUsage, expiresAt } = req.body;
    if (!code || !discountType || !discountValue) return res.status(400).json(fail('code, discountType, discountValue are required'));
    if (!['percentage', 'fixed_amount'].includes(discountType)) return res.status(400).json(fail('discountType must be percentage or fixed_amount'));

    const r = await pool.query(
      `INSERT INTO discount_codes (astrologer_id,code,description,remedy_type,discount_type,discount_value,commission_percentage,max_usage,expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
      [req.user.id, code.toUpperCase(), description || null, remedyType || null, discountType, Number(discountValue), Number(commissionPercentage) || 0, maxUsage || null, expiresAt || null]
    );
    res.json({ success: true, message: 'Discount code created', data: { codeId: r.rows[0].id } });
  } catch (e) {
    if (e.code === '23505') return res.status(400).json(fail('Code already exists'));
    res.status(400).json(fail(e.message));
  }
});

router.patch('/astrologer/discount-codes/:codeId/pause', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'astrologer') return res.status(403).json(fail('Astrologer access required'));
    const { status } = req.body;
    if (!['active', 'paused'].includes(status)) return res.status(400).json(fail('Status must be active or paused'));
    const r = await pool.query(
      'UPDATE discount_codes SET status=$1, updated_at=NOW() WHERE id=$2 AND astrologer_id=$3 RETURNING id',
      [status, req.params.codeId, req.user.id]
    );
    if (!r.rows.length) return res.status(404).json(fail('Code not found'));
    res.json({ success: true, message: `Code ${status}` });
  } catch (e) { res.status(400).json(fail(e.message)); }
});

// Validate discount code (user)
router.post('/user/discount-codes/validate', requireAuth, async (req, res) => {
  try {
    const { code, atonementId, amount } = req.body;
    if (!code || !amount) return res.status(400).json(fail('code and amount required'));

    const dcR = await pool.query(
      "SELECT * FROM discount_codes WHERE code=$1 AND status='active' AND (expires_at IS NULL OR expires_at > NOW()) AND (max_usage IS NULL OR used_count < max_usage)",
      [code.toUpperCase()]
    );
    if (!dcR.rows.length) return res.status(400).json(fail('Invalid or expired discount code'));
    const dc = dcR.rows[0];

    let discountAmount = 0;
    if (dc.discount_type === 'percentage') discountAmount = Number(amount) * (Number(dc.discount_value) / 100);
    else discountAmount = Math.min(Number(dc.discount_value), Number(amount));

    res.json({
      success: true,
      data: {
        code: dc.code, discountType: dc.discount_type, discountValue: Number(dc.discount_value),
        discountAmount, finalAmount: Number(amount) - discountAmount, commissionPercentage: Number(dc.commission_percentage)
      }
    });
  } catch (e) { res.status(400).json(fail(e.message)); }
});

export default router;
