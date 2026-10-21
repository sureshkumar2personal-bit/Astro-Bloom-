import { Router } from 'express';
import { pool } from '../db/pool.js';
import { fail } from '../utils/response.js';
import { requireAuth } from '../middleware/auth.js';
import crypto from 'crypto';

const router = Router();

function timeToMinutes(value) {
  const [hours, minutes] = String(value).slice(0, 5).split(':').map(Number);
  return hours * 60 + minutes;
}

function formatTime(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function buildAvailableSlots(scheduleRows, bookedRows) {
  const booked = bookedRows.map(row => {
    const start = timeToMinutes(row.scheduled_time);
    return { start, end: start + Number(row.duration_minutes || 30) };
  });
  const slots = [];

  for (const schedule of scheduleRows) {
    const start = timeToMinutes(schedule.start_time);
    const end = timeToMinutes(schedule.end_time);
    const duration = 30;
    for (let slotStart = start; slotStart + duration <= end; slotStart += duration) {
      const slotEnd = slotStart + duration;
      const isBooked = booked.some(booking => booking.start < slotEnd && booking.end > slotStart);
      if (!isBooked) slots.push({ time: formatTime(slotStart), duration });
    }
  }

  return slots;
}

router.get('/astrologer/slots', requireAuth('astrologer'), async (req, res) => {
  const result = await pool.query(
    'SELECT id,day_of_week,start_time,end_time,slot_duration_minutes,is_active FROM appointment_slots WHERE astrologer_id=$1 ORDER BY day_of_week,start_time',
    [req.auth.sub]
  );
  res.json({ success: true, data: result.rows });
});

router.post('/astrologer/slots', requireAuth('astrologer'), async (req, res) => {
  const { dayOfWeek, startTime, endTime, slotDurationMinutes } = req.body;
  if (dayOfWeek === undefined || !startTime || !endTime) return fail(res, 'Day, start time, and end time are required.');
  const result = await pool.query(
    'INSERT INTO appointment_slots (astrologer_id,day_of_week,start_time,end_time,slot_duration_minutes) VALUES ($1,$2,$3,$4,$5) RETURNING id',
    [req.auth.sub, dayOfWeek, startTime, endTime, slotDurationMinutes || 30]
  );
  res.status(201).json({ success: true, message: 'Slot created.', data: { slotId: result.rows[0].id } });
});

router.put('/astrologer/slots/:slotId', requireAuth('astrologer'), async (req, res) => {
  const { startTime, endTime, slotDurationMinutes, isActive } = req.body;
  await pool.query(
    'UPDATE appointment_slots SET start_time=COALESCE($1,start_time),end_time=COALESCE($2,end_time),slot_duration_minutes=COALESCE($3,slot_duration_minutes),is_active=COALESCE($4,is_active),updated_at=NOW() WHERE id=$5 AND astrologer_id=$6',
    [startTime || null, endTime || null, slotDurationMinutes || null, isActive ?? null, req.params.slotId, req.auth.sub]
  );
  res.json({ success: true, message: 'Slot updated.' });
});

router.delete('/astrologer/slots/:slotId', requireAuth('astrologer'), async (req, res) => {
  await pool.query('DELETE FROM appointment_slots WHERE id=$1 AND astrologer_id=$2', [req.params.slotId, req.auth.sub]);
  res.json({ success: true, message: 'Slot deleted.' });
});

router.get('/user/available-slots/:astrologerId', async (req, res) => {
  const { date } = req.query;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail(res, 'A valid date is required.');
  const result = await pool.query(
    `SELECT start_time,end_time FROM astrologer_schedule
     WHERE astrologer_id=$1 AND day_of_week=EXTRACT(DOW FROM $2::date)::int AND is_available=true
     ORDER BY start_time`,
    [req.params.astrologerId, date]
  );
  const booked = await pool.query(
    `SELECT scheduled_time,duration_minutes FROM appointments
     WHERE astrologer_id=$1 AND scheduled_date=$2 AND status NOT IN ('cancelled_by_user','cancelled_by_astrologer')`,
    [req.params.astrologerId, date]
  );
  res.json({ success: true, data: buildAvailableSlots(result.rows, booked.rows) });
});

router.get('/user/appointments', requireAuth('user'), async (req, res) => {
  const { status } = req.query;
  let q = `SELECT a.*,ast.display_name as astrologer_name,ast.city as astrologer_city
           FROM appointments a JOIN astrologers ast ON ast.id=a.astrologer_id WHERE a.user_id=$1`;
  const params = [req.auth.sub];
  if (status) { q += ` AND a.status=$2`; params.push(status); }
  q += ' ORDER BY a.scheduled_date DESC,a.scheduled_time DESC';
  const result = await pool.query(q, params);
  res.json({ success: true, data: result.rows.map(r => ({
    id: r.id, astrologerId: r.astrologer_id, astrologerName: r.astrologer_name, astrologerCity: r.astrologer_city,
    type: r.appointment_type, status: r.status, scheduledDate: r.scheduled_date, scheduledTime: r.scheduled_time,
    durationMinutes: r.duration_minutes, price: r.price, paymentStatus: r.payment_status,
    callStartedAt: r.call_started_at, callEndedAt: r.call_ended_at, notes: r.notes, createdAt: r.created_at
  }))});
});

router.get('/astrologer/appointments', requireAuth('astrologer'), async (req, res) => {
  const { status } = req.query;
  let q = `SELECT a.*,u.full_name as user_name FROM appointments a JOIN users u ON u.id=a.user_id WHERE a.astrologer_id=$1`;
  const params = [req.auth.sub];
  if (status) { q += ` AND a.status=$2`; params.push(status); }
  q += ' ORDER BY a.scheduled_date DESC,a.scheduled_time DESC';
  const result = await pool.query(q, params);
  res.json({ success: true, data: result.rows.map(r => ({
    id: r.id, userId: r.user_id, userName: r.user_name,
    type: r.appointment_type, status: r.status, scheduledDate: r.scheduled_date, scheduledTime: r.scheduled_time,
    durationMinutes: r.duration_minutes, price: r.price, paymentStatus: r.payment_status,
    callStartedAt: r.call_started_at, callEndedAt: r.call_ended_at, notes: r.notes, createdAt: r.created_at
  }))});
});

router.post('/user/appointments', requireAuth('user'), async (req, res) => {
  const { astrologerId, appointmentType, scheduledDate, scheduledTime, durationMinutes, notes } = req.body;
  if (!astrologerId || !scheduledDate || !scheduledTime) return fail(res, 'Astrologer, date, and time are required.');
  const requestedTime = String(scheduledTime);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(scheduledDate) || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(requestedTime)) {
    return fail(res, 'A valid appointment date and time are required.');
  }
  const duration = Number(durationMinutes || 30);
  if (duration !== 30) return fail(res, 'Appointments must use the published 30-minute slot duration.');
  const scheduleResult = await pool.query(
    `SELECT start_time,end_time FROM astrologer_schedule
     WHERE astrologer_id=$1 AND day_of_week=EXTRACT(DOW FROM $2::date)::int AND is_available=true`,
    [astrologerId, scheduledDate]
  );
  const appointmentStart = timeToMinutes(requestedTime);
  const appointmentEnd = appointmentStart + duration;
  const published = scheduleResult.rows.some(schedule => (
    appointmentStart >= timeToMinutes(schedule.start_time) &&
    appointmentEnd <= timeToMinutes(schedule.end_time) &&
    appointmentStart % 30 === 0
  ));
  if (!published) return fail(res, 'This appointment time is not published by the astrologer. Please select an available slot.');
  const priceResult = await pool.query('SELECT starting_call_price FROM astrologer_service_status WHERE astrologer_id=$1', [astrologerId]);
  const price = priceResult.rows[0]?.starting_call_price || 500;
  const existing = await pool.query(
    `SELECT id FROM appointments WHERE astrologer_id=$1 AND scheduled_date=$2 AND scheduled_time=$3 AND status NOT IN ('cancelled_by_user','cancelled_by_astrologer')`,
    [astrologerId, scheduledDate, scheduledTime]
  );
  if (existing.rows[0]) return fail(res, 'This time slot is already booked.');
  const result = await pool.query(
    `INSERT INTO appointments (user_id,astrologer_id,appointment_type,status,scheduled_date,scheduled_time,duration_minutes,price,notes)
     VALUES ($1,$2,$3,'pending_payment',$4,$5,$6,$7,$8) RETURNING id`,
    [req.auth.sub, astrologerId, appointmentType || 'video', scheduledDate, requestedTime, duration, price, notes || null]
  );
  res.status(201).json({ success: true, message: 'Appointment created.', data: { appointmentId: result.rows[0].id, price } });
});

router.post('/user/appointments/:appointmentId/pay', requireAuth('user'), async (req, res) => {
  const appt = await pool.query('SELECT * FROM appointments WHERE id=$1 AND user_id=$2', [req.params.appointmentId, req.auth.sub]);
  if (!appt.rows[0]) return fail(res, 'Appointment not found.', 404);
  const a = appt.rows[0];
  if (a.payment_status === 'paid') return fail(res, 'Already paid.');
  const walletResult = await pool.query(
    "SELECT id,available_balance FROM wallet_accounts WHERE owner_type='user' AND owner_id=$1", [req.auth.sub]
  );
  const wallet = walletResult.rows[0];
  if (!wallet || wallet.available_balance < a.price) return fail(res, 'Insufficient wallet balance. Please top up.', 400);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE wallet_accounts SET available_balance=available_balance-$1 WHERE id=$2', [a.price, wallet.id]);
    await client.query(
      "INSERT INTO wallet_transactions (wallet_id,owner_type,owner_id,transaction_type,service_type,service_id,amount,status,description) VALUES ($1,'user',$2,'debit','appointment',$3,$4,'completed','Appointment payment')",
      [wallet.id, req.auth.sub, a.id, a.price]
    );
    const roomId = `appt-${crypto.randomUUID().slice(0, 8)}`;
    await client.query(
      "UPDATE appointments SET payment_status='paid',payment_id=gen_random_uuid(),call_room_id=$1,status='confirmed' WHERE id=$2",
      [roomId, a.id]
    );
    await client.query('COMMIT');
    res.json({ success: true, message: 'Payment successful.', data: { callRoomId: roomId } });
  } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
});

router.post('/user/appointments/:appointmentId/cancel', requireAuth('user'), async (req, res) => {
  const appt = await pool.query('SELECT * FROM appointments WHERE id=$1 AND user_id=$2', [req.params.appointmentId, req.auth.sub]);
  if (!appt.rows[0]) return fail(res, 'Appointment not found.', 404);
  const a = appt.rows[0];
  if (['cancelled_by_user','cancelled_by_astrologer','completed'].includes(a.status)) return fail(res, 'Cannot cancel this appointment.');
  if (a.payment_status === 'paid') {
    const walletResult = await pool.query("SELECT id FROM wallet_accounts WHERE owner_type='user' AND owner_id=$1", [req.auth.sub]);
    if (walletResult.rows[0]) {
      await pool.query('UPDATE wallet_accounts SET available_balance=available_balance+$1 WHERE id=$2', [a.price, walletResult.rows[0].id]);
      await pool.query(
        "INSERT INTO wallet_transactions (wallet_id,owner_type,owner_id,transaction_type,service_type,service_id,amount,status,description) VALUES ($1,'user',$2,'credit','appointment_refund',$3,$4,'completed','Appointment cancellation refund')",
        [walletResult.rows[0].id, req.auth.sub, a.id, a.price]
      );
    }
  }
  await pool.query("UPDATE appointments SET status='cancelled_by_user',cancellation_reason=$1,cancelled_by='user',updated_at=NOW() WHERE id=$2",
    [req.body.reason || 'User cancelled', a.id]);
  res.json({ success: true, message: 'Appointment cancelled.' });
});

router.post('/astrologer/appointments/:appointmentId/cancel', requireAuth('astrologer'), async (req, res) => {
  const appt = await pool.query('SELECT * FROM appointments WHERE id=$1 AND astrologer_id=$2', [req.params.appointmentId, req.auth.sub]);
  if (!appt.rows[0]) return fail(res, 'Appointment not found.', 404);
  const a = appt.rows[0];
  if (a.payment_status === 'paid') {
    const walletResult = await pool.query("SELECT id FROM wallet_accounts WHERE owner_type='user' AND owner_id=$1", [a.user_id]);
    if (walletResult.rows[0]) {
      await pool.query('UPDATE wallet_accounts SET available_balance=available_balance+$1 WHERE id=$2', [a.price, walletResult.rows[0].id]);
      await pool.query(
        "INSERT INTO wallet_transactions (wallet_id,owner_type,owner_id,transaction_type,service_type,service_id,amount,status,description) VALUES ($1,'user',$2,'credit','appointment_refund',$3,$4,'completed','Astrologer cancelled appointment refund')",
        [walletResult.rows[0].id, a.user_id, a.id, a.price]
      );
    }
  }
  await pool.query("UPDATE appointments SET status='cancelled_by_astrologer',cancellation_reason=$1,cancelled_by='astrologer',updated_at=NOW() WHERE id=$2",
    [req.body.reason || 'Astrologer cancelled', a.id]);
  res.json({ success: true, message: 'Appointment cancelled.' });
});

router.post('/astrologer/appointments/:appointmentId/start-call', requireAuth('astrologer'), async (req, res) => {
  const appt = await pool.query('SELECT * FROM appointments WHERE id=$1 AND astrologer_id=$2', [req.params.appointmentId, req.auth.sub]);
  if (!appt.rows[0]) return fail(res, 'Appointment not found.', 404);
  if (appt.rows[0].status !== 'confirmed') return fail(res, 'Appointment is not confirmed.');
  await pool.query("UPDATE appointments SET call_started_at=NOW(),status='in_progress',updated_at=NOW() WHERE id=$1", [appt.rows[0].id]);
  res.json({ success: true, message: 'Call started.', data: { callRoomId: appt.rows[0].call_room_id } });
});

router.post('/astrologer/appointments/:appointmentId/end-call', requireAuth('astrologer'), async (req, res) => {
  const appt = await pool.query('SELECT * FROM appointments WHERE id=$1 AND astrologer_id=$2', [req.params.appointmentId, req.auth.sub]);
  if (!appt.rows[0]) return fail(res, 'Appointment not found.', 404);
  await pool.query("UPDATE appointments SET call_ended_at=NOW(),status='completed',updated_at=NOW() WHERE id=$1", [appt.rows[0].id]);
  res.json({ success: true, message: 'Call ended.' });
});

export default router;
