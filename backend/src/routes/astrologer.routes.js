import { Router } from 'express';
import { pool } from '../db/pool.js';
import { fail, asArray } from '../utils/response.js';
import { requireAuth } from '../middleware/auth.js';
import upload from '../middleware/upload.js';

const router = Router();

// Screen 27: Get my profile
router.get('/profile/me', requireAuth('astrologer'), async (req, res) => {
  try {
    const aRes = await pool.query('SELECT * FROM astrologers WHERE id=$1', [req.auth.sub]);
    if (!aRes.rows.length) return fail(res, 'Account not found.', 404);
    const a = aRes.rows[0];
    const [langsRes, specsRes, certsRes] = await Promise.all([
      pool.query('SELECT language FROM astrologer_languages WHERE astrologer_id=$1', [req.auth.sub]),
      pool.query('SELECT specialization FROM astrologer_specializations WHERE astrologer_id=$1', [req.auth.sub]),
      pool.query('SELECT id,certificate_name,file_url,verification_status FROM astrologer_certificates WHERE astrologer_id=$1', [req.auth.sub])
    ]);
    const fields = [a.display_name, a.professional_title, a.experience_years, a.short_bio, a.long_bio, a.consultation_style, a.profile_photo_url];
    const filled = fields.filter(f => f && String(f).trim()).length;
    const completeness = Math.round((filled / 7) * 60 + (langsRes.rows.length > 0 ? 20 : 0) + (specsRes.rows.length > 0 ? 20 : 0));
    res.json({ success: true, data: {
      id: a.id, displayName: a.display_name, professionalTitle: a.professional_title,
      experienceYears: a.experience_years, shortBio: a.short_bio, longBio: a.long_bio,
      consultationStyle: a.consultation_style, profilePhotoUrl: a.profile_photo_url,
      profileStatus: a.profile_status, isProfilePublic: a.is_profile_public,
      languages: langsRes.rows.map(r => r.language),
      specializations: specsRes.rows.map(r => r.specialization),
      certificates: certsRes.rows.map(r => ({ id: r.id, certificateName: r.certificate_name, fileUrl: r.file_url, verificationStatus: r.verification_status })),
      profileCompleteness: completeness
    }});
  } catch (err) { fail(res, 'Failed to load profile.', 500); }
});

// Screen 27: Update profile
router.put('/profile/me', requireAuth('astrologer'), async (req, res) => {
  const { displayName, professionalTitle, experienceYears, shortBio, longBio, consultationStyle, languages, specializations } = req.body;
  if (!displayName || !professionalTitle) return fail(res, 'Display name and professional title are required.');
  let langs, specs;
  try { langs = asArray(languages); specs = asArray(specializations); } catch { return fail(res, 'Invalid languages or specializations.'); }
  if (!langs.length) return fail(res, 'At least one language is required.');
  if (!specs.length) return fail(res, 'At least one specialization is required.');
  try {
    await pool.query('UPDATE astrologers SET display_name=$1,professional_title=$2,experience_years=$3,short_bio=$4,long_bio=$5,consultation_style=$6,updated_at=NOW() WHERE id=$7',
      [displayName, professionalTitle, experienceYears || 0, shortBio || null, longBio || null, consultationStyle || null, req.auth.sub]);
    await pool.query('DELETE FROM astrologer_languages WHERE astrologer_id=$1', [req.auth.sub]);
    for (const lang of langs) await pool.query('INSERT INTO astrologer_languages (astrologer_id,language) VALUES ($1,$2)', [req.auth.sub, lang]);
    await pool.query('DELETE FROM astrologer_specializations WHERE astrologer_id=$1', [req.auth.sub]);
    for (const spec of specs) await pool.query('INSERT INTO astrologer_specializations (astrologer_id,specialization) VALUES ($1,$2)', [req.auth.sub, spec]);
    res.json({ success: true, message: 'Profile updated successfully' });
  } catch (err) { fail(res, 'Failed to update profile.', 500); }
});

// Screen 27: Upload photo
router.post('/profile/photo', requireAuth('astrologer'), upload.single('photo'), async (req, res) => {
  if (!req.file) return fail(res, 'No photo uploaded.');
  const url = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64').slice(0, 100)}...`;
  try {
    await pool.query('UPDATE astrologers SET profile_photo_url=$1,updated_at=NOW() WHERE id=$2', [url, req.auth.sub]);
    res.json({ success: true, message: 'Photo uploaded.', data: { url } });
  } catch (err) { fail(res, 'Failed to upload photo.', 500); }
});

// Screen 27: Upload certificate
router.post('/profile/certificates', requireAuth('astrologer'), upload.single('file'), async (req, res) => {
  if (!req.file) return fail(res, 'No file uploaded.');
  const { certificateName } = req.body;
  const fileUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64').slice(0, 100)}...`;
  try {
    const result = await pool.query('INSERT INTO astrologer_certificates (astrologer_id,certificate_name,file_url) VALUES ($1,$2,$3) RETURNING id,certificate_name,verification_status', [req.auth.sub, certificateName || 'Certificate', fileUrl]);
    res.status(201).json({ success: true, message: 'Certificate uploaded.', data: result.rows[0] });
  } catch (err) { fail(res, 'Failed to upload certificate.', 500); }
});

// Screen 27: Submit for review
router.post('/profile/submit-review', requireAuth('astrologer'), async (req, res) => {
  try {
    await pool.query("UPDATE astrologers SET profile_status='under_review',updated_at=NOW() WHERE id=$1", [req.auth.sub]);
    res.json({ success: true, message: 'Profile submitted for review.' });
  } catch (err) { fail(res, 'Failed to submit profile.', 500); }
});

// Astrologer Dashboard
router.get('/dashboard', requireAuth('astrologer'), async (req, res) => {
  const { users: _, astrologers: astrologerList } = await import('./auth.routes.js');
  const astrologer = astrologerList.find(x => x.id === req.auth.sub);
  if (!astrologer) return fail(res, 'Account not found.', 404);
  if (astrologer.verificationStatus !== 'approved') return fail(res, 'Only approved astrologers can access this dashboard.', 403);
  res.json({ success: true, data: {
    astrologer: { id: astrologer.id, displayName: astrologer.displayName, verificationStatus: astrologer.verificationStatus, profileCompletion: 85 },
    workSummary: { pendingQuestions: 12, overdueQuestions: 2, appointmentRequests: 4, upcomingAppointments: 3, emergencyRequests: 1, generalDisputes: 1, textDisputes: 0, pendingAtonements: 3 },
    businessSummary: { todayEarnings: 2450, availableWallet: 12500, pendingSettlement: 4200, followers: 1200, subscribers: 340, textQuestionSales: 60, liveRevenue: 9900 },
    serviceStatus: { profilePublished: true, textCampaignActive: true, appointmentSlotsAvailable: true, emergencyAvailable: false, liveNow: false, contentPending: true },
    todaySchedule: [{ time: '10:30 AM', title: 'Video consultation \u00b7 Priya S.' }, { time: '6:00 PM', title: 'Live: Mercury Retrograde' }],
    alerts: ['2 text questions are overdue', '1 emergency request needs attention']
  }});
});

export default router;
