import { Router } from 'express';
import { pool } from '../db/pool.js';
import { fail } from '../utils/response.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Screen 8: List / Explore Astrologers
router.get('/astrologers', async (req, res) => {
  const { search, specialization, language, minRating, onlineStatus, appointmentAvailable, emergencyAvailable, liveNow, questionAvailable, minExperience, maxPrice, page = 1, limit = 20, sortBy = 'rating' } = req.query;
  const p = Math.max(1, parseInt(page)), l = Math.min(50, Math.max(1, parseInt(limit) || 20)), offset = (p - 1) * l;
  let where = ["a.account_status = 'active'", "a.verification_status = 'approved'", "a.profile_status = 'published'", "a.is_profile_public = true"];
  const params = []; let idx = 1;
  if (search) { where.push(`(a.display_name ILIKE $${idx} OR a.professional_title ILIKE $${idx})`); params.push(`%${search}%`); idx++; }
  if (specialization) { where.push(`EXISTS (SELECT 1 FROM astrologer_specializations sp WHERE sp.astrologer_id = a.id AND sp.specialization = $${idx})`); params.push(specialization); idx++; }
  if (language) { where.push(`EXISTS (SELECT 1 FROM astrologer_languages al WHERE al.astrologer_id = a.id AND al.language = $${idx})`); params.push(language); idx++; }
  if (minRating) { where.push(`a.average_rating >= $${idx}`); params.push(parseFloat(minRating)); idx++; }
  if (minExperience) { where.push(`a.experience_years >= $${idx}`); params.push(parseInt(minExperience)); idx++; }
  if (onlineStatus) { where.push(`s.online_status = $${idx}`); params.push(onlineStatus); idx++; }
  if (appointmentAvailable === 'true') where.push('s.appointment_available = true');
  if (emergencyAvailable === 'true') where.push('s.emergency_available = true');
  if (liveNow === 'true') where.push('s.live_now = true');
  if (questionAvailable === 'true') where.push('s.question_available = true');
  if (maxPrice) { where.push(`s.starting_question_price <= $${idx}`); params.push(parseFloat(maxPrice)); idx++; }
  const orderBy = sortBy === 'experience' ? 'a.experience_years DESC' : sortBy === 'reviews' ? 'a.review_count DESC' : 'a.average_rating DESC, a.review_count DESC';
  const sql = `SELECT a.id,a.display_name,a.professional_title,a.profile_photo_url,a.average_rating,a.review_count,a.experience_years,a.short_bio,s.online_status,s.appointment_available,s.emergency_available,s.live_now,s.question_available,s.starting_question_price,s.starting_call_price FROM astrologers a LEFT JOIN astrologer_service_status s ON s.astrologer_id = a.id WHERE ${where.join(' AND ')} ORDER BY ${orderBy} LIMIT $${idx} OFFSET $${idx + 1}`;
  params.push(l, offset);
  const countSql = `SELECT COUNT(*) FROM astrologers a LEFT JOIN astrologer_service_status s ON s.astrologer_id = a.id WHERE ${where.join(' AND ')}`;
  try {
    const [rows, count, langs, specs, activeCampaigns] = await Promise.all([
      pool.query(sql, params),
      pool.query(countSql, params.slice(0, -2)),
      pool.query('SELECT astrologer_id, array_agg(language) as languages FROM astrologer_languages GROUP BY astrologer_id'),
      pool.query('SELECT astrologer_id, array_agg(specialization) as specializations FROM astrologer_specializations GROUP BY astrologer_id'),
      pool.query("SELECT astrologer_id, id as campaign_id, campaign_name, price, submission_mode, answer_mode, available_slots FROM question_campaigns WHERE status='active' AND (end_at IS NULL OR end_at > NOW())")
    ]);
    const langMap = Object.fromEntries(langs.rows.map(r => [r.astrologer_id, r.languages]));
    const specMap = Object.fromEntries(specs.rows.map(r => [r.astrologer_id, r.specializations]));
    const campMap = {};
    for (const c of activeCampaigns.rows) {
      if (!campMap[c.astrologer_id]) campMap[c.astrologer_id] = [];
      campMap[c.astrologer_id].push({ campaignId: c.campaign_id, campaignName: c.campaign_name, price: parseFloat(c.price), submissionMode: c.submission_mode, answerMode: c.answer_mode, availableSlots: c.available_slots });
    }
    const items = rows.rows.map(r => ({
      id: r.id, displayName: r.display_name, professionalTitle: r.professional_title,
      profilePhotoUrl: r.profile_photo_url, averageRating: parseFloat(r.average_rating),
      reviewCount: r.review_count, experienceYears: r.experience_years, shortBio: r.short_bio,
      specializations: specMap[r.id] || [], languages: langMap[r.id] || [],
      onlineStatus: r.online_status, appointmentAvailable: r.appointment_available,
      emergencyAvailable: r.emergency_available, liveNow: r.live_now, questionAvailable: r.question_available,
      startingQuestionPrice: r.starting_question_price ? parseFloat(r.starting_question_price) : null,
      startingCallPrice: r.starting_call_price ? parseFloat(r.starting_call_price) : null,
      questionOffer: (campMap[r.id] || [])[0] || null
    }));
    res.json({ success: true, data: { items, pagination: { page: p, limit: l, total: parseInt(count.rows[0].count) } } });
  } catch (err) { fail(res, 'Failed to fetch astrologers.', 500); }
});

// Screen 10: Individual Astrologer Profile
router.get('/astrologers/:astrologerId', async (req, res) => {
  const { astrologerId } = req.params;
  try {
    const astroRes = await pool.query(
      "SELECT * FROM astrologers WHERE id=$1 AND account_status='active' AND verification_status='approved' AND profile_status='published' AND is_profile_public=true", [astrologerId]);
    if (!astroRes.rows.length) return fail(res, 'Astrologer profile not found.', 404);
    const a = astroRes.rows[0];
    const [langsRes, specsRes, certsRes, svcRes, revSummary, campRes] = await Promise.all([
      pool.query('SELECT language FROM astrologer_languages WHERE astrologer_id=$1', [astrologerId]),
      pool.query('SELECT specialization FROM astrologer_specializations WHERE astrologer_id=$1', [astrologerId]),
      pool.query("SELECT certificate_name,verification_status FROM astrologer_certificates WHERE astrologer_id=$1 AND verification_status=$2", [astrologerId, 'approved']),
      pool.query('SELECT * FROM astrologer_service_status WHERE astrologer_id=$1', [astrologerId]),
      pool.query('SELECT COALESCE(AVG(rating),0) as avg_rating,COUNT(*) as total FROM astrologer_reviews WHERE astrologer_id=$1', [astrologerId]),
      pool.query("SELECT id,campaign_name,price,submission_mode,answer_mode,deadline_hours,available_slots FROM question_campaigns WHERE astrologer_id=$1 AND status='active' AND (end_at IS NULL OR end_at > NOW())", [astrologerId])
    ]);
    const svc = svcRes.rows[0] || {};
    res.json({ success: true, data: {
      id: a.id, displayName: a.display_name, professionalTitle: a.professional_title,
      profilePhotoUrl: a.profile_photo_url, averageRating: parseFloat(revSummary.rows[0].avg_rating) || parseFloat(a.average_rating),
      reviewCount: parseInt(revSummary.rows[0].total) || a.review_count,
      experienceYears: a.experience_years, shortBio: a.short_bio, longBio: a.long_bio,
      consultationStyle: a.consultation_style, city: a.city,
      completedConsultations: a.completed_consultations,
      languages: langsRes.rows.map(r => r.language),
      specializations: specsRes.rows.map(r => r.specialization),
      certificates: certsRes.rows.map(r => ({ certificateName: r.certificate_name, verificationStatus: r.verification_status })),
      serviceStatus: { onlineStatus: svc.online_status || 'offline', appointmentAvailable: svc.appointment_available || false, emergencyAvailable: svc.emergency_available || false, liveNow: svc.live_now || false, questionAvailable: svc.question_available || false },
      pricing: { startingQuestionPrice: svc.starting_question_price ? parseFloat(svc.starting_question_price) : null, startingCallPrice: svc.starting_call_price ? parseFloat(svc.starting_call_price) : null },
      actions: { canBuyQuestion: svc.question_available || false, canBookAppointment: svc.appointment_available || false, canEmergencyCall: svc.emergency_available || false, canFollow: true, canSubscribe: true, canJoinLive: svc.live_now || false },
      questionOffers: campRes.rows.map(c => ({ campaignId: c.id, campaignName: c.campaign_name, price: parseFloat(c.price), submissionMode: c.submission_mode, answerMode: c.answer_mode, deadlineHours: c.deadline_hours, availableSlots: c.available_slots }))
    }});
  } catch (err) { fail(res, 'Failed to fetch profile.', 500); }
});

// Screen 10: Astrologer Reviews
router.get('/astrologers/:astrologerId/reviews', async (req, res) => {
  const { astrologerId } = req.params;
  const p = Math.max(1, parseInt(req.query.page) || 1), l = Math.min(50, parseInt(req.query.limit) || 10), offset = (p - 1) * l;
  try {
    const [rows, count] = await Promise.all([
      pool.query('SELECT id,rating,review_text,service_type,created_at FROM astrologer_reviews WHERE astrologer_id=$1 ORDER BY created_at DESC LIMIT $2 OFFSET $3', [astrologerId, l, offset]),
      pool.query('SELECT COUNT(*) FROM astrologer_reviews WHERE astrologer_id=$1', [astrologerId])
    ]);
    res.json({ success: true, data: { items: rows.rows.map(r => ({ id: r.id, rating: r.rating, reviewText: r.review_text, serviceType: r.service_type, createdAt: r.created_at })), pagination: { page: p, limit: l, total: parseInt(count.rows[0].count) } } });
  } catch (err) { fail(res, 'Failed to fetch reviews.', 500); }
});

// User Dashboard
router.get('/dashboard', requireAuth('user'), (req, res) => {
  res.json({ success: true, data: {
    wallet: { availableBalance: 850, holdBalance: 199, refundProcessing: 0 },
    questions: { freeRemaining: 2, purchasedRemaining: 3, pending: 1, answered: 5, disputed: 0 },
    subscriptions: { activeCount: 2, expiringSoonCount: 1 },
    appointments: { upcomingCount: 1, nextAppointment: { astrologerName: 'Dr. Ravi', callType: 'Video', dateTime: '2026-07-25T19:30:00' } },
    aiChat: { freeUsed: 3, freeLimit: 5, paidBalance: 0 },
    atonement: { pendingCount: 1, latestNotification: 'Amavasai pariharam reminder' },
    live: { liveNowCount: 2, upcomingCount: 4 },
    banners: [{ title: 'Sani Peyarchi Special', text: 'Know how Saturn transit affects your Rasi.', action: 'Read prediction' }, { title: 'Free Birth Chart', text: 'Generate your Rasi, Nakshatra and Lagna.', action: 'Calculate now' }],
    topAstrologers: [{ id: '44bd21c1-be3a-41cc-86a5-d4a93f6ea856', name: 'Dr. Ravi', specialty: 'Vedic Astrology · Marriage', rating: 4.9, experience: '12 years', language: 'Tamil, English', price: 299, status: 'Online' }, { id: '63ad9421-2a5f-4afd-8bae-435b120b7486', name: 'Meera Joshi', specialty: 'Tarot · Career Guidance', rating: 4.8, experience: '8 years', language: 'Hindi, English', price: 249, status: 'Online' }]
  }});
});

export default router;
