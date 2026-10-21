import { Router } from 'express';
import { pool } from '../db/pool.js';
import { fail } from '../utils/response.js';
import { requireAuth } from '../middleware/auth.js';
import upload from '../middleware/upload.js';

const router = Router();

// ===== USER PROFILE =====

// Get my full profile
router.get('/user/profile/full', requireAuth('user'), async (req, res) => {
  try {
    const [userRes, prefRes, profilesRes] = await Promise.all([
      pool.query(
        `SELECT u.id, u.full_name, u.email, u.mobile, u.status, u.created_at,
                p.gender, p.date_of_birth, p.birth_time, p.birth_place,
                pr.preferred_language
         FROM users u
         LEFT JOIN user_profiles p ON p.user_id = u.id
         LEFT JOIN user_preferences pr ON pr.user_id = u.id
         WHERE u.id = $1`, [req.auth.sub]
      ),
      pool.query(
        'SELECT preferred_language FROM user_preferences WHERE user_id = $1', [req.auth.sub]
      ),
      pool.query(
        `SELECT id, profile_name, relationship, gender, date_of_birth, birth_time, birth_place,
                rasi, nakshatra, pada, lagna, is_default, created_at
         FROM user_astrology_profiles WHERE user_id = $1 ORDER BY is_default DESC, created_at ASC`, [req.auth.sub]
      )
    ]);
    const u = userRes.rows[0];
    if (!u) return fail(res, 'Account not found.', 404);
    res.json({ success: true, data: {
      id: u.id, fullName: u.full_name, email: u.email, mobile: u.mobile,
      status: u.status, createdAt: u.created_at,
      profile: { gender: u.gender, dateOfBirth: u.date_of_birth, birthTime: u.birth_time, birthPlace: u.birth_place },
      preferredLanguage: prefRes.rows[0]?.preferred_language || 'English',
      astrologyProfiles: profilesRes.rows.map(r => ({
        id: r.id, profileName: r.profile_name, relationship: r.relationship,
        gender: r.gender, dateOfBirth: r.date_of_birth, birthTime: r.birth_time,
        birthPlace: r.birth_place, rasi: r.rasi, nakshatra: r.nakshatra,
        pada: r.pada, lagna: r.lagna, isDefault: r.is_default, createdAt: r.created_at
      }))
    }});
  } catch (err) { fail(res, 'Failed to load profile.', 500); }
});

// Update basic user profile
router.patch('/user/profile', requireAuth('user'), async (req, res) => {
  const { fullName, gender, dateOfBirth, birthTime, birthPlace, preferredLanguage } = req.body;
  try {
    if (fullName || gender || dateOfBirth || birthTime || birthPlace) {
      await pool.query(
        `INSERT INTO user_profiles (user_id, gender, date_of_birth, birth_time, birth_place)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id) DO UPDATE SET
           gender = COALESCE($2, user_profiles.gender),
           date_of_birth = COALESCE($3, user_profiles.date_of_birth),
           birth_time = COALESCE($4, user_profiles.birth_time),
           birth_place = COALESCE($5, user_profiles.birth_place),
           updated_at = NOW()`,
        [req.auth.sub, gender || null, dateOfBirth || null, birthTime || null, birthPlace || null]
      );
    }
    if (fullName) {
      await pool.query('UPDATE users SET full_name = $1, updated_at = NOW() WHERE id = $2', [fullName, req.auth.sub]);
    }
    if (preferredLanguage) {
      await pool.query(
        `INSERT INTO user_preferences (user_id, preferred_language)
         VALUES ($1, $2)
         ON CONFLICT (user_id) DO UPDATE SET preferred_language = $2, updated_at = NOW()`,
        [req.auth.sub, preferredLanguage]
      );
    }
    res.json({ success: true, message: 'Profile updated successfully.' });
  } catch (err) { fail(res, 'Failed to update profile.', 500); }
});

// Upload user profile photo (stores as base64 placeholder for MVP)
router.post('/user/profile/photo', requireAuth('user'), upload.single('photo'), async (req, res) => {
  if (!req.file) return fail(res, 'No photo uploaded.');
  try {
    const url = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64').slice(0, 100)}...`;
    await pool.query('UPDATE users SET profile_photo_url = $1, updated_at = NOW() WHERE id = $2', [url, req.auth.sub]);
    res.json({ success: true, message: 'Photo uploaded.', data: { url } });
  } catch (err) { fail(res, 'Failed to upload photo.', 500); }
});

// ===== USER ASTROLOGY / FAMILY PROFILES =====

// List all astrology profiles
router.get('/user/astrology-profiles', requireAuth('user'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, profile_name, relationship, gender, date_of_birth, birth_time, birth_place,
              rasi, nakshatra, pada, lagna, is_default, created_at, updated_at
       FROM user_astrology_profiles WHERE user_id = $1 ORDER BY is_default DESC, created_at ASC`,
      [req.auth.sub]
    );
    res.json({ success: true, data: result.rows.map(r => ({
      id: r.id, profileName: r.profile_name, relationship: r.relationship,
      gender: r.gender, dateOfBirth: r.date_of_birth, birthTime: r.birth_time,
      birthPlace: r.birth_place, rasi: r.rasi, nakshatra: r.nakshatra,
      pada: r.pada, lagna: r.lagna, isDefault: r.is_default,
      createdAt: r.created_at, updatedAt: r.updated_at
    }))});
  } catch (err) { fail(res, 'Failed to load astrology profiles.', 500); }
});

// Get single astrology profile
router.get('/user/astrology-profiles/:profileId', requireAuth('user'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, profile_name, relationship, gender, date_of_birth, birth_time, birth_place,
              latitude, longitude, timezone, rasi, nakshatra, pada, lagna, is_default, created_at, updated_at
       FROM user_astrology_profiles WHERE id = $1 AND user_id = $2`,
      [req.params.profileId, req.auth.sub]
    );
    if (!result.rows[0]) return fail(res, 'Profile not found.', 404);
    const r = result.rows[0];
    res.json({ success: true, data: {
      id: r.id, profileName: r.profile_name, relationship: r.relationship,
      gender: r.gender, dateOfBirth: r.date_of_birth, birthTime: r.birth_time,
      birthPlace: r.birth_place, latitude: r.latitude, longitude: r.longitude,
      timezone: r.timezone, rasi: r.rasi, nakshatra: r.nakshatra,
      pada: r.pada, lagna: r.lagna, isDefault: r.is_default,
      createdAt: r.created_at, updatedAt: r.updated_at
    }});
  } catch (err) { fail(res, 'Failed to load profile.', 500); }
});

// Add astrology / family profile
router.post('/user/astrology-profiles', requireAuth('user'), async (req, res) => {
  const { profileName, relationship, gender, dateOfBirth, birthTime, birthPlace,
          rasi, nakshatra, pada, lagna } = req.body;
  if (!profileName || !relationship) return fail(res, 'Profile name and relationship are required.');
  try {
    const result = await pool.query(
      `INSERT INTO user_astrology_profiles
        (user_id, profile_name, relationship, gender, date_of_birth, birth_time, birth_place, rasi, nakshatra, pada, lagna)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id, profile_name, relationship, gender, date_of_birth, birth_time, birth_place, rasi, nakshatra, pada, lagna, is_default, created_at`,
      [req.auth.sub, profileName, relationship, gender || null, dateOfBirth || null,
       birthTime || null, birthPlace || null, rasi || null, nakshatra || null, pada || null, lagna || null]
    );
    const r = result.rows[0];
    res.status(201).json({ success: true, message: 'Astrology profile created.', data: {
      id: r.id, profileName: r.profile_name, relationship: r.relationship,
      gender: r.gender, dateOfBirth: r.date_of_birth, birthTime: r.birth_time,
      birthPlace: r.birth_place, rasi: r.rasi, nakshatra: r.nakshatra,
      pada: r.pada, lagna: r.lagna, isDefault: r.is_default, createdAt: r.created_at
    }});
  } catch (err) { fail(res, 'Failed to create profile.', 500); }
});

// Update astrology profile
router.patch('/user/astrology-profiles/:profileId', requireAuth('user'), async (req, res) => {
  const { profileName, relationship, gender, dateOfBirth, birthTime, birthPlace,
          rasi, nakshatra, pada, lagna } = req.body;
  try {
    const existing = await pool.query(
      'SELECT id FROM user_astrology_profiles WHERE id = $1 AND user_id = $2',
      [req.params.profileId, req.auth.sub]
    );
    if (!existing.rows[0]) return fail(res, 'Profile not found.', 404);

    // Track birth detail changes for edit history
    const oldProfile = await pool.query(
      'SELECT date_of_birth, birth_time, birth_place FROM user_astrology_profiles WHERE id = $1',
      [req.params.profileId]
    );
    const old = oldProfile.rows[0];
    const historyEntries = [];
    if (dateOfBirth && old.date_of_birth?.toISOString().slice(0, 10) !== dateOfBirth) {
      historyEntries.push({ field: 'date_of_birth', old: old.date_of_birth?.toISOString().slice(0, 10), new: dateOfBirth });
    }
    if (birthTime && old.birth_time !== birthTime) {
      historyEntries.push({ field: 'birth_time', old: old.birth_time, new: birthTime });
    }
    if (birthPlace && old.birth_place !== birthPlace) {
      historyEntries.push({ field: 'birth_place', old: old.birth_place, new: birthPlace });
    }

    await pool.query(
      `UPDATE user_astrology_profiles SET
        profile_name = COALESCE($1, profile_name), relationship = COALESCE($2, relationship),
        gender = COALESCE($3, gender), date_of_birth = COALESCE($4, date_of_birth),
        birth_time = COALESCE($5, birth_time), birth_place = COALESCE($6, birth_place),
        rasi = COALESCE($7, rasi), nakshatra = COALESCE($8, nakshatra),
        pada = COALESCE($9, pada), lagna = COALESCE($10, lagna), updated_at = NOW()
       WHERE id = $11 AND user_id = $12`,
      [profileName || null, relationship || null, gender || null, dateOfBirth || null,
       birthTime || null, birthPlace || null, rasi || null, nakshatra || null,
       pada || null, lagna || null, req.params.profileId, req.auth.sub]
    );

    // Save edit history for birth detail changes
    for (const h of historyEntries) {
      await pool.query(
        'INSERT INTO user_profile_edit_history (user_id, astrology_profile_id, field_name, old_value, new_value) VALUES ($1, $2, $3, $4, $5)',
        [req.auth.sub, req.params.profileId, h.field, h.old, h.new]
      );
    }

    res.json({ success: true, message: 'Profile updated.' });
  } catch (err) { fail(res, 'Failed to update profile.', 500); }
});

// Delete astrology profile
router.delete('/user/astrology-profiles/:profileId', requireAuth('user'), async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM user_astrology_profiles WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.profileId, req.auth.sub]
    );
    if (!result.rows[0]) return fail(res, 'Profile not found.', 404);
    res.json({ success: true, message: 'Profile deleted.' });
  } catch (err) { fail(res, 'Failed to delete profile.', 500); }
});

// Set default astrology profile
router.patch('/user/astrology-profiles/:profileId/default', requireAuth('user'), async (req, res) => {
  try {
    const existing = await pool.query(
      'SELECT id FROM user_astrology_profiles WHERE id = $1 AND user_id = $2',
      [req.params.profileId, req.auth.sub]
    );
    if (!existing.rows[0]) return fail(res, 'Profile not found.', 404);
    await pool.query('UPDATE user_astrology_profiles SET is_default = false WHERE user_id = $1', [req.auth.sub]);
    await pool.query('UPDATE user_astrology_profiles SET is_default = true WHERE id = $1', [req.params.profileId]);
    res.json({ success: true, message: 'Default profile set.' });
  } catch (err) { fail(res, 'Failed to set default.', 500); }
});

// Get edit history for an astrology profile
router.get('/user/astrology-profiles/:profileId/history', requireAuth('user'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, field_name, old_value, new_value, edited_at
       FROM user_profile_edit_history
       WHERE user_id = $1 AND astrology_profile_id = $2
       ORDER BY edited_at DESC`,
      [req.auth.sub, req.params.profileId]
    );
    res.json({ success: true, data: result.rows.map(r => ({
      id: r.id, fieldName: r.field_name, oldValue: r.old_value,
      newValue: r.new_value, editedAt: r.edited_at
    }))});
  } catch (err) { fail(res, 'Failed to load edit history.', 500); }
});

// ===== ASTROLOGER PROFILE (ENHANCED) =====

// Get my profile (enhanced)
router.get('/astrologer/profile', requireAuth('astrologer'), async (req, res) => {
  try {
    const aRes = await pool.query('SELECT * FROM astrologers WHERE id = $1', [req.auth.sub]);
    if (!aRes.rows.length) return fail(res, 'Account not found.', 404);
    const a = aRes.rows[0];
    const [langsRes, specsRes, certsRes, docsRes, svcRes] = await Promise.all([
      pool.query('SELECT language, proficiency FROM astrologer_languages WHERE astrologer_id = $1', [req.auth.sub]),
      pool.query('SELECT specialization FROM astrologer_specializations WHERE astrologer_id = $1', [req.auth.sub]),
      pool.query('SELECT id, certificate_name, file_url, verification_status, admin_note FROM astrologer_certificates WHERE astrologer_id = $1', [req.auth.sub]),
      pool.query('SELECT id, document_type, original_name, mime_type, file_size, created_at FROM astrologer_documents WHERE astrologer_id = $1 ORDER BY created_at DESC', [req.auth.sub]),
      pool.query('SELECT * FROM astrologer_service_status WHERE astrologer_id = $1', [req.auth.sub])
    ]);
    const svc = svcRes.rows[0] || {};
    res.json({ success: true, data: {
      id: a.id, fullName: a.full_name, displayName: a.display_name,
      professionalTitle: a.professional_title, email: a.email, mobile: a.mobile,
      experienceYears: a.experience_years, shortBio: a.short_bio, longBio: a.long_bio,
      consultationStyle: a.consultation_style, city: a.city,
      profilePhotoUrl: a.profile_photo_url, profileStatus: a.profile_status,
      isProfilePublic: a.is_profile_public, verificationStatus: a.verification_status,
      accountStatus: a.account_status,
      languages: langsRes.rows, specializations: specsRes.rows.map(r => r.specialization),
      certificates: certsRes.rows, documents: docsRes.rows,
      serviceAvailability: {
        questionAvailable: svc.question_available || false,
        appointmentAvailable: svc.appointment_available || false,
        emergencyAvailable: svc.emergency_available || false,
        liveAvailable: svc.live_now || false,
        subscriptionAvailable: true
      }
    }});
  } catch (err) { fail(res, 'Failed to load profile.', 500); }
});

// Update astrologer profile (PATCH - granular)
router.patch('/astrologer/profile', requireAuth('astrologer'), async (req, res) => {
  const { displayName, professionalTitle, experienceYears, shortBio, longBio,
          consultationStyle, city, profileVisibility } = req.body;
  try {
    const sets = []; const vals = []; let idx = 1;
    if (displayName) { sets.push(`display_name = $${idx}`); vals.push(displayName); idx++; }
    if (professionalTitle) { sets.push(`professional_title = $${idx}`); vals.push(professionalTitle); idx++; }
    if (experienceYears !== undefined) { sets.push(`experience_years = $${idx}`); vals.push(experienceYears); idx++; }
    if (shortBio !== undefined) { sets.push(`short_bio = $${idx}`); vals.push(shortBio); idx++; }
    if (longBio !== undefined) { sets.push(`long_bio = $${idx}`); vals.push(longBio); idx++; }
    if (consultationStyle !== undefined) { sets.push(`consultation_style = $${idx}`); vals.push(consultationStyle); idx++; }
    if (city) { sets.push(`city = $${idx}`); vals.push(city); idx++; }
    if (profileVisibility) { sets.push(`is_profile_public = $${idx}`); vals.push(profileVisibility === 'visible'); idx++; }
    if (sets.length) {
      sets.push(`updated_at = NOW()`);
      vals.push(req.auth.sub);
      await pool.query(`UPDATE astrologers SET ${sets.join(', ')} WHERE id = $${idx}`, vals);
    }
    res.json({ success: true, message: 'Profile updated.' });
  } catch (err) { fail(res, 'Failed to update profile.', 500); }
});

// Update astrologer specializations
router.put('/astrologer/profile/specializations', requireAuth('astrologer'), async (req, res) => {
  const { specializations } = req.body;
  if (!Array.isArray(specializations) || !specializations.length) return fail(res, 'At least one specialization is required.');
  try {
    await pool.query('DELETE FROM astrologer_specializations WHERE astrologer_id = $1', [req.auth.sub]);
    for (const spec of specializations) {
      await pool.query('INSERT INTO astrologer_specializations (astrologer_id, specialization) VALUES ($1, $2)', [req.auth.sub, spec]);
    }
    await pool.query('UPDATE astrologers SET updated_at = NOW() WHERE id = $1', [req.auth.sub]);
    res.json({ success: true, message: 'Specializations updated.' });
  } catch (err) { fail(res, 'Failed to update specializations.', 500); }
});

// Update astrologer languages
router.put('/astrologer/profile/languages', requireAuth('astrologer'), async (req, res) => {
  const { languages } = req.body;
  if (!Array.isArray(languages) || !languages.length) return fail(res, 'At least one language is required.');
  try {
    await pool.query('DELETE FROM astrologer_languages WHERE astrologer_id = $1', [req.auth.sub]);
    for (const lang of languages) {
      const name = typeof lang === 'string' ? lang : lang.language;
      const prof = typeof lang === 'string' ? null : lang.proficiency;
      await pool.query('INSERT INTO astrologer_languages (astrologer_id, language, proficiency) VALUES ($1, $2, $3)', [req.auth.sub, name, prof || null]);
    }
    await pool.query('UPDATE astrologers SET updated_at = NOW() WHERE id = $1', [req.auth.sub]);
    res.json({ success: true, message: 'Languages updated.' });
  } catch (err) { fail(res, 'Failed to update languages.', 500); }
});

// Upload astrologer document
router.post('/astrologer/profile/documents', requireAuth('astrologer'), upload.single('file'), async (req, res) => {
  if (!req.file) return fail(res, 'No file uploaded.');
  const { documentType } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO astrologer_documents (astrologer_id, document_type, original_name, mime_type, file_size)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, document_type, original_name, mime_type, file_size, created_at`,
      [req.auth.sub, documentType || 'certificate', req.file.originalname, req.file.mimetype, req.file.size]
    );
    res.status(201).json({ success: true, message: 'Document uploaded.', data: result.rows[0] });
  } catch (err) { fail(res, 'Failed to upload document.', 500); }
});

// Get edit history for astrologer profile
router.get('/astrologer/profile/history', requireAuth('astrologer'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, field_name, old_value, new_value, edit_status, edited_at
       FROM astrologer_profile_edit_history WHERE astrologer_id = $1 ORDER BY edited_at DESC LIMIT 50`,
      [req.auth.sub]
    );
    res.json({ success: true, data: result.rows.map(r => ({
      id: r.id, fieldName: r.field_name, oldValue: r.old_value,
      newValue: r.new_value, editStatus: r.edit_status, editedAt: r.edited_at
    }))});
  } catch (err) { fail(res, 'Failed to load history.', 500); }
});

// ===== PUBLIC ASTROLOGER PROFILE (for users) =====
router.get('/user/astrologers/:astrologerId/profile', requireAuth('user'), async (req, res) => {
  try {
    const aRes = await pool.query(
      `SELECT * FROM astrologers WHERE id = $1 AND account_status = 'active' AND verification_status = 'approved' AND is_profile_public = true`,
      [req.params.astrologerId]
    );
    if (!aRes.rows.length) return fail(res, 'Profile not found.', 404);
    const a = aRes.rows[0];
    const [langsRes, specsRes, certsRes, svcRes, revRes, campRes] = await Promise.all([
      pool.query('SELECT language, proficiency FROM astrologer_languages WHERE astrologer_id = $1', [req.params.astrologerId]),
      pool.query('SELECT specialization FROM astrologer_specializations WHERE astrologer_id = $1', [req.params.astrologerId]),
      pool.query("SELECT certificate_name, verification_status FROM astrologer_certificates WHERE astrologer_id = $1 AND verification_status = 'approved'", [req.params.astrologerId]),
      pool.query('SELECT * FROM astrologer_service_status WHERE astrologer_id = $1', [req.params.astrologerId]),
      pool.query('SELECT COALESCE(AVG(rating), 0) as avg_rating, COUNT(*) as total FROM astrologer_reviews WHERE astrologer_id = $1', [req.params.astrologerId]),
      pool.query("SELECT id, campaign_name, price, submission_mode, answer_mode, deadline_hours, available_slots FROM question_campaigns WHERE astrologer_id = $1 AND status = 'active' AND (end_at IS NULL OR end_at > NOW())", [req.params.astrologerId])
    ]);
    const svc = svcRes.rows[0] || {};
    res.json({ success: true, data: {
      id: a.id, displayName: a.display_name, professionalTitle: a.professional_title,
      profilePhotoUrl: a.profile_photo_url, averageRating: parseFloat(revRes.rows[0].avg_rating),
      reviewCount: parseInt(revRes.rows[0].total), experienceYears: a.experience_years,
      shortBio: a.short_bio, longBio: a.long_bio, consultationStyle: a.consultation_style,
      city: a.city, completedConsultations: a.completed_consultations,
      languages: langsRes.rows, specializations: specsRes.rows.map(r => r.specialization),
      certificates: certsRes.rows,
      serviceStatus: { onlineStatus: svc.online_status || 'offline', appointmentAvailable: svc.appointment_available, emergencyAvailable: svc.emergency_available, liveNow: svc.live_now, questionAvailable: svc.question_available },
      pricing: { startingQuestionPrice: svc.starting_question_price ? parseFloat(svc.starting_question_price) : null, startingCallPrice: svc.starting_call_price ? parseFloat(svc.starting_call_price) : null },
      actions: { canBuyQuestion: svc.question_available, canBookAppointment: svc.appointment_available, canEmergencyCall: svc.emergency_available, canFollow: true, canSubscribe: true, canJoinLive: svc.live_now },
      questionOffers: campRes.rows.map(c => ({ campaignId: c.id, campaignName: c.campaign_name, price: parseFloat(c.price), submissionMode: c.submission_mode, answerMode: c.answer_mode, deadlineHours: c.deadline_hours, availableSlots: c.available_slots }))
    }});
  } catch (err) { fail(res, 'Failed to load profile.', 500); }
});

export default router;
