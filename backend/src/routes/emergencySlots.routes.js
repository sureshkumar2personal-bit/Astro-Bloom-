import { Router } from 'express';
import crypto from 'crypto';
import { pool } from '../db/pool.js';
import { fail } from '../utils/response.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const uid = () => crypto.randomUUID();

const VALID_PURPOSES = ['Family', 'Relationship', 'Marriage', 'Land or property', 'Career', 'Business', 'Finance', 'Health-related astrology guidance', 'Education', 'Legal or dispute-related astrology guidance', 'Other'];
const DEFAULT_LANGUAGES = ['Tamil', 'English', 'Hindi', 'Telugu', 'Malayalam', 'Kannada'];

const REQUEST_ACTIVE_STATUSES = ['requested', 'waiting_for_astrologer', 'payment_pending', 'payment_completed', 'call_ready', 'accepted', 'call_in_progress'];
const COMPLETED_STATUSES = ['call_completed', 'missed', 'rejected', 'expired', 'cancelled', 'refund_pending', 'refunded', 'disputed', 'closed'];

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function toMinutes(t) {
  if (t == null) return 0;
  if (typeof t === 'number') return t;
  const [h, m] = String(t).split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

// Calculate number of slots: AvailableSlotTime = TotalTime - BreakTime; Slots = / Duration
function computeSlotStats(slot) {
  const totalMin = toMinutes(slot.end_time) - toMinutes(slot.start_time);
  if (totalMin <= 0) return { totalAvailableMinutes: 0, breakMinutes: 0, durationMinutes: slot.call_duration_minutes, maxSlots: 0 };
  const duration = Math.max(1, slot.call_duration_minutes || 20);
  const breakMin = Math.max(0, slot.break_time_minutes || 0);
  const step = duration + breakMin;
  const maxSlots = Math.max(0, Math.floor(totalMin / step));
  return { totalAvailableMinutes: totalMin, breakMinutes: breakMin, durationMinutes: duration, maxSlots };
}

async function createNotification(actorType, actorId, type, title, body, data) {
  try {
    await pool.query(
      'INSERT INTO notifications (actor_type,actor_id,type,title,body,data) VALUES ($1,$2,$3,$4,$5,$6)',
      [actorType, actorId, type, title, body || '', JSON.stringify(data || {})]
    );
  } catch (e) {
    console.error('createNotification error:', e.message);
  }
}

// Compute price breakdown for a slot given subscriber status
function priceBreakdown(slot, isSubscriber) {
  const base = isSubscriber && slot.subscriber_price != null && Number(slot.subscriber_price) > 0
    ? Number(slot.subscriber_price)
    : (slot.non_subscriber_price != null && Number(slot.non_subscriber_price) > 0 ? Number(slot.non_subscriber_price) : Number(slot.price));
  const platformFee = Number(slot.platform_fee || 0);
  const tax = Number(slot.tax || 0);
  const total = Math.round((base + platformFee + tax) * 100) / 100;
  const discounted = isSubscriber ? Math.round((base + platformFee + tax) * 100) / 100 : total;
  return {
    basePrice: base,
    platformFee,
    tax,
    subscriberPrice: slot.subscriber_price != null ? Number(slot.subscriber_price) : null,
    nonSubscriberPrice: slot.non_subscriber_price != null ? Number(slot.non_subscriber_price) : (Number(slot.price) || null),
    discount: isSubscriber ? Math.round((Number(slot.non_subscriber_price || slot.price) - base) * 100) / 100 : 0,
    total: discounted,
    subscriberDiscountApplied: isSubscriber && slot.subscriber_price != null && Number(slot.subscriber_price) < Number(slot.non_subscriber_price || slot.price)
  };
}

function serializeSlot(r) {
  return {
    id: r.id,
    title: r.title,
    slotDate: r.slot_date,
    startTime: r.start_time,
    endTime: r.end_time,
    breakTimeMinutes: r.break_time_minutes,
    callDurationMinutes: r.call_duration_minutes,
    price: r.price,
    subscriberPrice: r.subscriber_price,
    nonSubscriberPrice: r.non_subscriber_price,
    platformFee: r.platform_fee,
    tax: r.tax,
    paymentTiming: r.payment_timing,
    languages: r.languages || [],
    purposes: r.purposes || [],
    callModes: r.call_modes,
    status: r.status,
    isRecurring: r.is_recurring,
    recurWeekdays: r.recur_weekdays || [],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    ...computeSlotStats(r)
  };
}

function serializeRequest(r) {
  return {
    id: r.id,
    slotId: r.slot_id,
    userId: r.user_id,
    userName: r.user_name,
    userMobile: r.user_mobile,
    astrologerId: r.astrologer_id,
    astrologerName: r.astrologer_name,
    astrologerCity: r.astrologer_city,
    callType: r.call_type,
    status: r.status,
    isSubscriber: r.is_subscriber,
    priorityScore: r.priority_score,
    purpose: r.purpose,
    language: r.language,
    voiceNoteUrl: r.voice_note_url,
    priceCharged: r.price_charged,
    platformFee: r.platform_fee,
    taxAmount: r.tax_amount,
    paymentMethod: r.payment_method,
    paymentStatus: r.payment_status,
    scheduledStartAt: r.scheduled_start_at,
    expectedDurationMinutes: r.expected_duration_minutes,
    estimatedWaitSeconds: r.estimated_wait_seconds,
    queuePosition: r.queue_position,
    astrologerResponse: r.astrologer_response,
    rejectionReason: r.rejection_reason,
    acceptedAt: r.accepted_at,
    readyAt: r.ready_at,
    startedAt: r.started_at,
    endedAt: r.ended_at,
    missedAt: r.missed_at,
    cancelledAt: r.cancelled_at,
    cancellationReason: r.cancellation_reason,
    cancelledBy: r.cancelled_by,
    refundedAt: r.refunded_at,
    rating: r.rating,
    reviewText: r.review_text,
    ratedAt: r.rated_at,
    ratingWindowExpiresAt: r.rating_window_expires_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// ASTROLOGER: SLOT MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

// Create a slot (validation rules 1-5)
router.post('/astrologer/emergency/slots', requireAuth('astrologer'), async (req, res) => {
  const {
    title, slotDate, startTime, endTime, breakTimeMinutes = 5, callDurationMinutes = 20,
    price, subscriberPrice, nonSubscriberPrice, platformFee = 0, tax = 0, paymentTiming = 'before',
    languages = [], purposes = [], callModes = 'audio', status = 'published', isRecurring = false, recurWeekdays = []
  } = req.body;

  if (!slotDate || !startTime || !endTime) return fail(res, 'Slot date, start time and end time are required.');
  if (toMinutes(endTime) <= toMinutes(startTime)) return fail(res, 'Slot start time must be earlier than slot end time.');
  if (!callDurationMinutes || callDurationMinutes <= 0) return fail(res, 'Call duration must be greater than zero.');
  if (breakTimeMinutes < 0) return fail(res, 'Break time must not be negative.');
  if (!price || Number(price) <= 0) return fail(res, 'Emergency call price must be greater than zero.');

  try {
    const overlapping = await pool.query(
      `SELECT id FROM emergency_slots WHERE astrologer_id=$1 AND slot_date=$2 AND status <> 'closed'
       AND ($3 < end_time AND $4 > start_time)`,
      [req.auth.sub, slotDate, startTime, endTime]
    );
    if (overlapping.rows.length) return fail(res, 'This slot overlaps with an existing slot on the same date.');

    const result = await pool.query(
      `INSERT INTO emergency_slots
        (id,astrologer_id,title,slot_date,start_time,end_time,break_time_minutes,call_duration_minutes,
         price,subscriber_price,non_subscriber_price,platform_fee,tax,payment_timing,languages,purposes,call_modes,status,is_recurring,recur_weekdays)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
       RETURNING *`,
      [uid(), req.auth.sub, title || null, slotDate, startTime, endTime, breakTimeMinutes, callDurationMinutes,
        price, subscriberPrice ?? null, nonSubscriberPrice ?? null, platformFee, tax, paymentTiming,
        languages, purposes, callModes, status, isRecurring, recurWeekdays]
    );
    const slot = result.rows[0];
    await createNotification('astrologer', req.auth.sub, 'emergency_slot_created', 'Emergency slot created', `Slot on ${slotDate} ${startTime}-${endTime} is ready.`, { slotId: slot.id });
    res.status(201).json({ success: true, message: 'Emergency slot created.', data: serializeSlot(slot) });
  } catch (err) {
    console.error('Create emergency slot error:', err);
    fail(res, 'Failed to create emergency slot.', 500);
  }
});

// List my slots
router.get('/astrologer/emergency/slots', requireAuth('astrologer'), async (req, res) => {
  const { status, from } = req.query;
  try {
    let q = `SELECT * FROM emergency_slots WHERE astrologer_id=$1`;
    const params = [req.auth.sub];
    let idx = 2;
    if (status) { q += ` AND status=$${idx++}`; params.push(status); }
    if (from) { q += ` AND slot_date >= $${idx++}`; params.push(from); }
    q += ' ORDER BY slot_date DESC, start_time ASC';
    const result = await pool.query(q, params);
    const summary = { draft: 0, published: 0, paused: 0, closed: 0 };
    result.rows.forEach(r => { summary[r.status] = (summary[r.status] || 0) + 1; });
    res.json({ success: true, data: { slots: result.rows.map(serializeSlot), summary } });
  } catch (err) {
    fail(res, 'Failed to fetch slots.', 500);
  }
});

// Update a slot
router.patch('/astrologer/emergency/slots/:slotId', requireAuth('astrologer'), async (req, res) => {
  const { slotId } = req.params;
  const {
    title, slotDate, startTime, endTime, breakTimeMinutes, callDurationMinutes,
    price, subscriberPrice, nonSubscriberPrice, platformFee, tax, paymentTiming,
    languages, purposes, callModes, status, isRecurring, recurWeekdays
  } = req.body;
  try {
    const existing = await pool.query('SELECT * FROM emergency_slots WHERE id=$1 AND astrologer_id=$2', [slotId, req.auth.sub]);
    if (!existing.rows.length) return fail(res, 'Slot not found.', 404);
    const cur = existing.rows[0];
    const s = (v, d) => v !== undefined ? v : d;
    const newStart = s(startTime, cur.start_time), newEnd = s(endTime, cur.end_time), newDate = s(slotDate, cur.slot_date);
    if (toMinutes(newEnd) <= toMinutes(newStart)) return fail(res, 'Slot start time must be earlier than slot end time.');
    if ((breakTimeMinutes !== undefined && breakTimeMinutes < 0)) return fail(res, 'Break time must not be negative.');
    if (callDurationMinutes !== undefined && callDurationMinutes <= 0) return fail(res, 'Call duration must be greater than zero.');

    const overlapping = await pool.query(
      `SELECT id FROM emergency_slots WHERE astrologer_id=$1 AND slot_date=$2 AND status <> 'closed' AND id <> $3
       AND ($4 < end_time AND $5 > start_time)`,
      [req.auth.sub, newDate, slotId, newStart, newEnd]
    );
    if (overlapping.rows.length) return fail(res, 'This slot overlaps with an existing slot on the same date.');

    const result = await pool.query(
      `UPDATE emergency_slots SET
        title=COALESCE($1,title), slot_date=$2, start_time=$3, end_time=$4,
        break_time_minutes=COALESCE($5,break_time_minutes), call_duration_minutes=COALESCE($6,call_duration_minutes),
        price=COALESCE($7,price), subscriber_price=$8, non_subscriber_price=$9, platform_fee=COALESCE($10,platform_fee),
        tax=COALESCE($11,tax), payment_timing=COALESCE($12,payment_timing), languages=COALESCE($13,languages),
        purposes=COALESCE($14,purposes), call_modes=COALESCE($15,call_modes), status=COALESCE($16,status),
        is_recurring=COALESCE($17,is_recurring), recur_weekdays=COALESCE($18,recur_weekdays), updated_at=NOW()
       WHERE id=$19 AND astrologer_id=$20 RETURNING *`,
      [title ?? null, newDate, newStart, newEnd, breakTimeMinutes, callDurationMinutes, price,
        subscriberPrice ?? null, nonSubscriberPrice ?? null, platformFee, tax, paymentTiming,
        languages, purposes, callModes, status, isRecurring, recurWeekdays, slotId, req.auth.sub]
    );
    res.json({ success: true, message: 'Emergency slot updated.', data: serializeSlot(result.rows[0]) });
  } catch (err) {
    console.error('Update emergency slot error:', err);
    fail(res, 'Failed to update emergency slot.', 500);
  }
});

// Publish / pause / close a slot
router.patch('/astrologer/emergency/slots/:slotId/status', requireAuth('astrologer'), async (req, res) => {
  const { slotId } = req.params;
  const { status } = req.body;
  if (!['published', 'paused', 'closed', 'draft'].includes(status)) return fail(res, 'Invalid slot status.');
  try {
    const result = await pool.query(
      "UPDATE emergency_slots SET status=$1,updated_at=NOW() WHERE id=$2 AND astrologer_id=$3 RETURNING *",
      [status, slotId, req.auth.sub]
    );
    if (!result.rows.length) return fail(res, 'Slot not found.', 404);
    res.json({ success: true, message: `Slot ${status}.`, data: serializeSlot(result.rows[0]) });
  } catch (err) {
    fail(res, 'Failed to update slot status.', 500);
  }
});

// Delete a slot
router.delete('/astrologer/emergency/slots/:slotId', requireAuth('astrologer'), async (req, res) => {
  const { slotId } = req.params;
  try {
    const bookings = await pool.query(
      "SELECT id FROM emergency_request_queue WHERE slot_id=$1 AND status IN ('requested','waiting_for_astrologer','payment_pending','payment_completed','call_ready','accepted','call_in_progress')",
      [slotId]
    );
    if (bookings.rows.length) return fail(res, 'Cannot delete a slot with active bookings. Close the slot instead.');
    const result = await pool.query('DELETE FROM emergency_slots WHERE id=$1 AND astrologer_id=$2', [slotId, req.auth.sub]);
    if (!result.rowCount) return fail(res, 'Slot not found.', 404);
    res.json({ success: true, message: 'Slot deleted.' });
  } catch (err) {
    fail(res, 'Failed to delete slot.', 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// USER: AVAILABLE ASTROLOGERS + SLOTS
// ═══════════════════════════════════════════════════════════════════════════

// List astrologers available for emergency consultation
router.get('/user/emergency/astrologers', requireAuth('user'), async (req, res) => {
  const { search, language, purpose, priceMax, subscriberOnly } = req.query;
  try {
    let q = `SELECT DISTINCT a.id, a.display_name, a.professional_title, a.profile_photo_url, a.average_rating, a.review_count, a.experience_years, a.city, a.short_bio, s.emergency_available,
                    (SELECT COUNT(*) FROM emergency_slots es WHERE es.astrologer_id=a.id AND es.status='published' AND es.slot_date >= CURRENT_DATE) as published_slots
             FROM astrologers a
             JOIN astrologer_service_status s ON s.astrologer_id = a.id
             WHERE a.account_status='active' AND a.verification_status='approved' AND a.profile_status='published' AND s.emergency_available = true`;
    const params = [];
    let idx = 1;
    if (search) { q += ` AND (a.display_name ILIKE $${idx} OR a.professional_title ILIKE $${idx})`; params.push(`%${search}%`); idx++; }
    if (language) { q += ` AND EXISTS (SELECT 1 FROM emergency_slots es WHERE es.astrologer_id=a.id AND es.status='published' AND $${idx} = ANY(es.languages))`; params.push(language); idx++; }
    if (purpose) { q += ` AND EXISTS (SELECT 1 FROM emergency_slots es WHERE es.astrologer_id=a.id AND es.status='published' AND $${idx} = ANY(es.purposes))`; params.push(purpose); idx++; }
    if (priceMax) { q += ` AND EXISTS (SELECT 1 FROM emergency_slots es WHERE es.astrologer_id=a.id AND es.status='published' AND es.price <= $${idx})`; params.push(Number(priceMax)); idx++; }
    q += ' ORDER BY a.average_rating DESC';
    const result = await pool.query(q, params);
    res.json({ success: true, data: { items: result.rows.map(r => ({
      id: r.id, displayName: r.display_name, professionalTitle: r.professional_title,
      profilePhotoUrl: r.profile_photo_url, averageRating: parseFloat(r.average_rating),
      reviewCount: r.review_count, experienceYears: r.experience_years, city: r.city,
      shortBio: r.short_bio, emergencyAvailable: r.emergency_available, publishedSlots: parseInt(r.published_slots) || 0
    })) } });
  } catch (err) {
    console.error('List emergency astrologers error:', err);
    fail(res, 'Failed to fetch emergency astrologers.', 500);
  }
});

// List published slots for an astrologer
router.get('/user/emergency/astrologers/:astrologerId/slots', requireAuth('user'), async (req, res) => {
  const { astrologerId } = req.params;
  try {
    const result = await pool.query(
      `SELECT * FROM emergency_slots WHERE astrologer_id=$1 AND status='published' AND slot_date >= CURRENT_DATE ORDER BY slot_date ASC, start_time ASC`,
      [astrologerId]
    );
    const isSubscriberRes = await pool.query(
      "SELECT id FROM user_subscriptions WHERE user_id=$1 AND astrologer_id=$2 AND status='active' AND expires_at > NOW()",
      [req.auth.sub, astrologerId]
    );
    const isSubscriber = isSubscriberRes.rows.length > 0;

    // Occupied times for these slots
    const slotIds = result.rows.map(r => r.id);
    const occupied = slotIds.length ? (await pool.query(
      `SELECT slot_id, COUNT(*)::int as count FROM emergency_request_queue WHERE slot_id = ANY($1) AND status IN ('requested','waiting_for_astrologer','payment_pending','payment_completed','call_ready','accepted','call_in_progress') GROUP BY slot_id`,
      [slotIds]
    )).rows : [];

    const occupiedMap = {};
    occupied.forEach(o => { occupiedMap[o.slot_id] = o.count; });

    res.json({ success: true, data: {
      astrologerId,
      isSubscriber,
      slots: result.rows.map(s => {
        const stats = computeSlotStats(s);
        const occupiedCount = occupiedMap[s.id] || 0;
        return { ...serializeSlot(s), occupiedCount, availableSlots: Math.max(0, stats.maxSlots - occupiedCount), priceBreakdown: priceBreakdown(s, isSubscriber) };
      })
    }});
  } catch (err) {
    console.error('List emergency slots error:', err);
    fail(res, 'Failed to fetch emergency slots.', 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// USER: BOOK + TRACK + RATE
// ═══════════════════════════════════════════════════════════════════════════

// Book an emergency call (single quantity - rule 9, rule 2.2)
router.post('/user/emergency/request', requireAuth('user'), async (req, res) => {
  const { slotId, callType = 'audio', purpose, language, voiceNoteUrl, paymentMethod = 'wallet' } = req.body;
  try {
    const slotRes = await pool.query("SELECT * FROM emergency_slots WHERE id=$1 AND status='published'", [slotId]);
    if (!slotRes.rows.length) return fail(res, 'Selected slot is not available.', 404);
    const slot = slotRes.rows[0];

    if (slot.payment_timing === 'before') {
      if (slot.slot_date < new Date().toISOString().slice(0, 10)) return fail(res, 'Past timings cannot be selected.');
    }

    const activeReq = await pool.query(
      `SELECT id FROM emergency_request_queue WHERE user_id=$1 AND status IN ('requested','waiting_for_astrologer','payment_pending','payment_completed','call_ready','accepted','call_in_progress')`,
      [req.auth.sub]
    );
    if (activeReq.rows.length) return fail(res, 'You already have an active emergency call. Book another after it is completed or cancelled.');

    const subRes = await pool.query(
      "SELECT id FROM user_subscriptions WHERE user_id=$1 AND astrologer_id=$2 AND status='active' AND expires_at > NOW()",
      [req.auth.sub, slot.astrologer_id]
    );
    const isSubscriber = subRes.rows.length > 0;

    const callModes = slot.call_modes === 'both' ? ['audio', 'video'] : [slot.call_modes];
    const ct = callModes.includes(callType) ? callType : callModes[0] || 'audio';

    const breakdown = priceBreakdown(slot, isSubscriber);
    const requestId = uid();
    const now = new Date();
    const ratingWindow = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    const result = await pool.query(
      `INSERT INTO emergency_request_queue
        (id,user_id,astrologer_id,slot_id,call_type,status,is_subscriber,priority_score,purpose,language,voice_note_url,
         price_charged,platform_fee,tax_amount,payment_method,payment_status,scheduled_start_at,expected_duration_minutes,estimated_wait_seconds,queue_position,rating_window_expires_at)
       VALUES ($1,$2,$3,$4,$5,'requested',$6,$7,$8,$9,$10,$11,$12,$13,$14,'pending',CURRENT_DATE + $15::time,$16,30,$17,$18)
       RETURNING *`,
      [requestId, req.auth.sub, slot.astrologer_id, slot.id, ct, isSubscriber, isSubscriber ? 100 : 0,
        purpose || null, language || null, voiceNoteUrl || null, breakdown.total, breakdown.platformFee, breakdown.tax,
        paymentMethod, slot.start_time, slot.call_duration_minutes, isSubscriber ? 0 : 1, ratingWindow]
    );
    const reqRow = result.rows[0];

    await createNotification('astrologer', slot.astrologer_id, 'emergency_request_new', 'New emergency call request', `${req.auth.sub ? 'A user' : 'A user'} requested an emergency ${ct} call.`, { requestId });

    res.status(201).json({ success: true, message: 'Emergency call requested.', data: { requestId, ...serializeRequest(reqRow), isSubscriber, priceBreakdown: breakdown } });
  } catch (err) {
    console.error('Book emergency slot error:', err);
    fail(res, 'Failed to book emergency slot.', 500);
  }
});

// Pay for emergency request (escrow before call)
router.post('/user/emergency/:requestId/pay', requireAuth('user'), async (req, res) => {
  const { requestId } = req.params;
  try {
    const eres = await pool.query(
      "SELECT * FROM emergency_request_queue WHERE id=$1 AND user_id=$2 AND status IN ('requested','payment_pending')",
      [requestId, req.auth.sub]
    );
    if (!eres.rows.length) return fail(res, 'Emergency request not found or not payable.', 404);
    const er = eres.rows[0];

    const walletResult = await pool.query(
      "SELECT id,available_balance FROM wallet_accounts WHERE owner_type='user' AND owner_id=$1",
      [req.auth.sub]
    );
    const wallet = walletResult.rows[0];
    if (!wallet || parseFloat(wallet.available_balance) < parseFloat(er.price_charged))
      return fail(res, 'Insufficient wallet balance. Please top up.', 400);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('UPDATE wallet_accounts SET available_balance=available_balance-$1 WHERE id=$2', [er.price_charged, wallet.id]);
      await client.query(
        `INSERT INTO wallet_transactions (wallet_id,owner_type,owner_id,transaction_type,service_type,service_id,amount,status,description)
         VALUES ($1,'user',$2,'debit','emergency_call',$3,$4,'completed','Emergency call payment (held)')`,
        [wallet.id, req.auth.sub, er.id, er.price_charged]
      );
      await client.query(
        "UPDATE emergency_request_queue SET status='payment_completed',payment_status='paid',payment_id=gen_random_uuid(),estimated_wait_seconds=0,updated_at=NOW() WHERE id=$1",
        [er.id]
      );
      await client.query('COMMIT');
      await createNotification('user', req.auth.sub, 'emergency_payment_success', 'Payment successful', `Your emergency call is confirmed. Awaiting astrologer acceptance.`, { requestId: er.id });
      await createNotification('astrologer', er.astrologer_id, 'emergency_payment_confirmed', 'Payment confirmed', 'A user has paid for an emergency call. Accept to start.', { requestId: er.id });
      res.json({ success: true, message: 'Payment successful. Waiting for astrologer to accept.' });
    } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
  } catch (err) {
    console.error('Emergency pay error:', err);
    fail(res, 'Failed to process payment.', 500);
  }
});

// List my emergency requests (tracking)
router.get('/user/emergency/requests', requireAuth('user'), async (req, res) => {
  const { status } = req.query;
  try {
    let q = `SELECT erq.*, a.display_name as astrologer_name, a.city as astrologer_city FROM emergency_request_queue erq JOIN astrologers a ON a.id=erq.astrologer_id WHERE erq.user_id=$1`;
    const params = [req.auth.sub];
    if (status) { q += ` AND erq.status=$2`; params.push(status); }
    q += ' ORDER BY erq.created_at DESC';
    const result = await pool.query(q, params);
    const summary = { active: 0, completed: 0, pendingRating: 0 };
    result.rows.forEach(r => {
      if (COMPLETED_STATUSES.includes(r.status)) summary.completed++;
      else if (r.status === 'call_completed' && r.rating == null && (r.rating_window_expires_at == null || new Date(r.rating_window_expires_at) > new Date())) summary.pendingRating++;
      else summary.active++;
    });
    res.json({ success: true, data: { requests: result.rows.map(serializeRequest), summary } });
  } catch (err) {
    fail(res, 'Failed to fetch emergency requests.', 500);
  }
});

// Cancel my request (refund if paid)
router.patch('/user/emergency/:requestId/cancel', requireAuth('user'), async (req, res) => {
  const { requestId } = req.params;
  const { reason } = req.body;
  try {
    const eres = await pool.query(
      "SELECT * FROM emergency_request_queue WHERE id=$1 AND user_id=$2 AND status IN ('requested','payment_pending','payment_completed','call_ready','waiting_for_astrologer')",
      [requestId, req.auth.sub]
    );
    if (!eres.rows.length) return fail(res, 'Request not found or cannot be cancelled.', 404);
    const er = eres.rows[0];

    await pool.query(
      "UPDATE emergency_request_queue SET status='cancelled',cancelled_at=NOW(),cancellation_reason=$1,cancelled_by='user',updated_at=NOW() WHERE id=$2",
      [reason || 'Cancelled by user', er.id]
    );

    if (er.payment_status === 'paid') {
      await pool.query(
        "UPDATE emergency_request_queue SET status='refund_pending',refund_pending_at=NOW(),updated_at=NOW() WHERE id=$1",
        [er.id]
      );
      const walletResult = await pool.query("SELECT id FROM wallet_accounts WHERE owner_type='user' AND owner_id=$1", [er.user_id]);
      if (walletResult.rows.length) {
        await pool.query('UPDATE wallet_accounts SET available_balance=available_balance+$1 WHERE id=$2', [er.price_charged, walletResult.rows[0].id]);
        await pool.query(
          `INSERT INTO wallet_transactions (wallet_id,owner_type,owner_id,transaction_type,service_type,service_id,amount,status,description)
           VALUES ($1,'user',$2,'credit','emergency_refund',$3,$4,'completed','Emergency call refund')`,
          [walletResult.rows[0].id, er.user_id, er.id, er.price_charged]
        );
        await pool.query("UPDATE emergency_request_queue SET status='refunded',refunded_at=NOW(),updated_at=NOW() WHERE id=$1", [er.id]);
      }
    }
    await createNotification('astrologer', er.astrologer_id, 'emergency_user_cancelled', 'User cancelled', 'A user cancelled their emergency call request.', { requestId: er.id });
    res.json({ success: true, message: 'Request cancelled.' });
  } catch (err) {
    fail(res, 'Failed to cancel request.', 500);
  }
});

// Rate after call (rules 11-12)
router.post('/user/emergency/:requestId/rating', requireAuth('user'), async (req, res) => {
  const { requestId } = req.params;
  const { rating, reviewText } = req.body;
  const r = parseInt(rating);
  if (!r || r < 1 || r > 5) return fail(res, 'Rating must be between 1 and 5.');
  try {
    const eres = await pool.query(
      "SELECT * FROM emergency_request_queue WHERE id=$1 AND user_id=$2 AND status='call_completed'",
      [requestId, req.auth.sub]
    );
    if (!eres.rows.length) return fail(res, 'Rating is allowed only after the call is completed.', 404);
    const er = eres.rows[0];
    if (er.rating != null) return fail(res, 'You have already rated this call.');
    if (er.rating_window_expires_at && new Date(er.rating_window_expires_at) < new Date())
      return fail(res, 'The 2-hour rating window has expired.');

    await pool.query(
      "UPDATE emergency_request_queue SET rating=$1,review_text=$2,rated_at=NOW(),updated_at=NOW() WHERE id=$3",
      [r, reviewText || null, er.id]
    );
    const existing = await pool.query(
      "SELECT id FROM astrologer_reviews WHERE consultation_type='emergency' AND consultation_id=$1",
      [er.id]
    );
    if (!existing.rows.length) {
      await pool.query(
        `INSERT INTO astrologer_reviews (astrologer_id,user_id,consultation_type,consultation_id,rating,review_text)
         VALUES ($1,$2,'emergency',$3,$4,$5)`,
        [er.astrologer_id, er.user_id, er.id, r, reviewText || null]
      );
    }
    await createNotification('astrologer', er.astrologer_id, 'emergency_rating_received', 'New rating', `A user rated your emergency call ${r}/5.`, { requestId: er.id });
    res.json({ success: true, message: 'Thank you for your rating!' });
  } catch (err) {
    console.error('Emergency rating error:', err);
    fail(res, 'Failed to submit rating.', 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ASTROLOGER: REQUEST QUEUE
// ═══════════════════════════════════════════════════════════════════════════

// List requests for astrologer
router.get('/astrologer/emergency/requests', requireAuth('astrologer'), async (req, res) => {
  const { status } = req.query;
  try {
    let q = `SELECT erq.*, u.full_name as user_name, u.mobile as user_mobile FROM emergency_request_queue erq JOIN users u ON u.id=erq.user_id WHERE erq.astrologer_id=$1`;
    const params = [req.auth.sub];
    if (status) { q += ` AND erq.status=$2`; params.push(status); }
    q += ' ORDER BY erq.priority_score DESC, erq.created_at ASC';
    const result = await pool.query(q, params);

    const summaryResult = await pool.query(
      "SELECT status, COUNT(*)::int as count FROM emergency_request_queue WHERE astrologer_id=$1 GROUP BY status",
      [req.auth.sub]
    );
    const summary = {};
    summaryResult.rows.forEach(r => { summary[r.status] = r.count; });

    res.json({ success: true, data: {
      requests: result.rows.map(r => ({
        ...serializeRequest(r),
        waitingSeconds: r.created_at ? Math.max(0, Math.floor((Date.now() - new Date(r.created_at)) / 1000)) : 0
      })),
      summary
    }});
  } catch (err) {
    console.error('List astrologer emergency requests error:', err);
    fail(res, 'Failed to fetch emergency requests.', 500);
  }
});

// Accept
router.patch('/astrologer/emergency/:requestId/accept', requireAuth('astrologer'), async (req, res) => {
  const { requestId } = req.params;
  try {
    const eres = await pool.query(
      "SELECT * FROM emergency_request_queue WHERE id=$1 AND astrologer_id=$2 AND status IN ('payment_completed','call_ready','waiting_for_astrologer')",
      [requestId, req.auth.sub]
    );
    if (!eres.rows.length) return fail(res, 'Request not found or not acceptable.', 404);
    const er = eres.rows[0];
    const roomId = `emer-${crypto.randomUUID().slice(0, 8)}`;

    await pool.query(
      "UPDATE emergency_request_queue SET status='accepted',accepted_at=NOW(),ready_at=NOW(),updated_at=NOW() WHERE id=$1",
      [er.id]
    );
    const csResult = await pool.query(
      `INSERT INTO call_sessions (user_id,astrologer_id,emergency_request_id,call_type,status,provider_channel_id)
       VALUES ($1,$2,$3,$4,'created',$5) RETURNING id`,
      [er.user_id, er.astrologer_id, er.id, er.call_type, roomId]
    );
    await createNotification('user', er.user_id, 'emergency_accepted', 'Astrologer accepted your call', 'Your emergency call is confirmed. Join when it starts.', { requestId: er.id, callRoomId: roomId });
    res.json({ success: true, message: 'Emergency call accepted.', data: { callSessionId: csResult.rows[0].id, callRoomId: roomId } });
  } catch (err) {
    console.error('Accept emergency error:', err);
    fail(res, 'Failed to accept request.', 500);
  }
});

// Reject (refund if paid)
router.patch('/astrologer/emergency/:requestId/reject', requireAuth('astrologer'), async (req, res) => {
  const { requestId } = req.params;
  const { reason } = req.body;
  try {
    const eres = await pool.query(
      "SELECT * FROM emergency_request_queue WHERE id=$1 AND astrologer_id=$2 AND status IN ('payment_completed','call_ready','waiting_for_astrologer')",
      [requestId, req.auth.sub]
    );
    if (!eres.rows.length) return fail(res, 'Request not found or not rejectable.', 404);
    const er = eres.rows[0];

    await pool.query(
      "UPDATE emergency_request_queue SET status='rejected',rejection_reason=$1,updated_at=NOW() WHERE id=$2",
      [reason || 'Astrologer unavailable', er.id]
    );
    if (er.payment_status === 'paid') {
      const walletResult = await pool.query("SELECT id FROM wallet_accounts WHERE owner_type='user' AND owner_id=$1", [er.user_id]);
      if (walletResult.rows.length) {
        await pool.query('UPDATE wallet_accounts SET available_balance=available_balance+$1 WHERE id=$2', [er.price_charged, walletResult.rows[0].id]);
        await pool.query(
          `INSERT INTO wallet_transactions (wallet_id,owner_type,owner_id,transaction_type,service_type,service_id,amount,status,description)
           VALUES ($1,'user',$2,'credit','emergency_refund',$3,$4,'completed','Emergency call rejected - refund')`,
          [walletResult.rows[0].id, er.user_id, er.id, er.price_charged]
        );
      }
    }
    await createNotification('user', er.user_id, 'emergency_rejected', 'Astrologer declined your request', reason || 'Please try another astrologer.', { requestId: er.id });
    res.json({ success: true, message: 'Request rejected. User has been refunded.' });
  } catch (err) {
    console.error('Reject emergency error:', err);
    fail(res, 'Failed to reject request.', 500);
  }
});

// Start
router.patch('/astrologer/emergency/:requestId/start', requireAuth('astrologer'), async (req, res) => {
  const { requestId } = req.params;
  try {
    const eres = await pool.query(
      "SELECT * FROM emergency_request_queue WHERE id=$1 AND astrologer_id=$2 AND status='accepted'",
      [requestId, req.auth.sub]
    );
    if (!eres.rows.length) return fail(res, 'Request not found or not ready to start.', 404);
    const er = eres.rows[0];
    await pool.query(
      "UPDATE emergency_request_queue SET status='call_in_progress',started_at=NOW(),updated_at=NOW() WHERE id=$1",
      [er.id]
    );
    await pool.query(
      "UPDATE call_sessions SET status='in_progress',started_at=NOW() WHERE emergency_request_id=$1 AND status='created'",
      [er.id]
    );
    await createNotification('user', er.user_id, 'emergency_started', 'Your emergency call started', 'Join your emergency call now.', { requestId: er.id });
    res.json({ success: true, message: 'Emergency call started.' });
  } catch (err) {
    fail(res, 'Failed to start call.', 500);
  }
});

// End (release payment to astrologer per platform rules)
router.patch('/astrologer/emergency/:requestId/end', requireAuth('astrologer'), async (req, res) => {
  const { requestId } = req.params;
  const { durationMinutes } = req.body;
  try {
    const eres = await pool.query(
      "SELECT * FROM emergency_request_queue WHERE id=$1 AND astrologer_id=$2 AND status='call_in_progress'",
      [requestId, req.auth.sub]
    );
    if (!eres.rows.length) return fail(res, 'Request not found or not in progress.', 404);
    const er = eres.rows[0];

    await pool.query(
      "UPDATE emergency_request_queue SET status='call_completed',ended_at=NOW(),updated_at=NOW() WHERE id=$1",
      [er.id]
    );
    const csUpdate = await pool.query(
      "UPDATE call_sessions SET status='completed',ended_at=NOW(),duration_seconds=EXTRACT(EPOCH FROM (NOW()-started_at))::int WHERE emergency_request_id=$1 AND status='in_progress' RETURNING id,duration_seconds",
      [er.id]
    );

    if (er.payment_status === 'paid' && parseFloat(er.price_charged) > 0) {
      const commission = Math.round(parseFloat(er.price_charged) * 0.20 * 100) / 100;
      const astroEarning = parseFloat(er.price_charged) - commission;
      const astroWallet = await pool.query("SELECT id FROM wallet_accounts WHERE owner_type='astrologer' AND owner_id=$1", [er.astrologer_id]);
      if (astroWallet.rows.length) {
        await pool.query('UPDATE wallet_accounts SET available_balance=available_balance+$1 WHERE id=$2', [astroEarning, astroWallet.rows[0].id]);
        await pool.query(
          `INSERT INTO wallet_transactions (wallet_id,owner_type,owner_id,transaction_type,service_type,service_id,amount,status,description)
           VALUES ($1,'astrologer',$2,'credit','emergency_call_earning',$3,$4,'completed','Emergency call earning')`,
          [astroWallet.rows[0].id, er.astrologer_id, er.id, astroEarning]
        );
      }
    }

    await createNotification('user', er.user_id, 'emergency_completed', 'Call completed', 'Your emergency call has ended. Please rate your astrologer within 2 hours.', { requestId: er.id });
    res.json({ success: true, message: 'Call ended.', data: { durationSeconds: csUpdate.rows[0]?.duration_seconds || 0 } });
  } catch (err) {
    console.error('End emergency error:', err);
    fail(res, 'Failed to end call.', 500);
  }
});

// Astrologer dashboard summary
router.get('/astrologer/emergency/dashboard', requireAuth('astrologer'), async (req, res) => {
  try {
    const slots = await pool.query(
      "SELECT COUNT(*)::int as total FROM emergency_slots WHERE astrologer_id=$1 AND status='published' AND slot_date >= CURRENT_DATE",
      [req.auth.sub]
    );
    const counts = await pool.query(
      "SELECT status, COUNT(*)::int as count FROM emergency_request_queue WHERE astrologer_id=$1 GROUP BY status",
      [req.auth.sub]
    );
    const earnings = await pool.query(
      "SELECT COALESCE(SUM(price_charged),0)::numeric as today FROM emergency_request_queue WHERE astrologer_id=$1 AND status='call_completed' AND ended_at::date = CURRENT_DATE",
      [req.auth.sub]
    );
    const summary = {};
    counts.rows.forEach(r => { summary[r.status] = r.count; });
    res.json({ success: true, data: {
      availableSlots: slots.rows[0].total,
      requests: summary['requested'] || 0,
      acceptedCalls: (summary['accepted'] || 0) + (summary['call_in_progress'] || 0),
      completedCalls: summary['call_completed'] || 0,
      missedCalls: summary['missed'] || 0,
      todayEarnings: parseFloat(earnings.rows[0].today),
      summary
    }});
  } catch (err) {
    fail(res, 'Failed to fetch emergency dashboard.', 500);
  }
});

// Language / purpose reference
router.get('/user/emergency/options', requireAuth('user'), (req, res) => {
  res.json({ success: true, data: { languages: DEFAULT_LANGUAGES, purposes: VALID_PURPOSES } });
});

export default router;
