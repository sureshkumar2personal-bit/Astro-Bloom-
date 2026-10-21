import { Router } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { pool } from '../db/pool.js';
import { fail } from '../utils/response.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/user/profile', requireAuth('user'), async (req, res) => {
  const result = await pool.query(
    `SELECT u.id,u.full_name,u.email,u.mobile,u.status,u.created_at,
            p.gender,p.date_of_birth,p.birth_time,p.birth_place,
            pr.zodiac_sign,pr.moon_sign,pr.ascendant,pr.preferred_language,pr.interests,
            pr.notification_email,pr.notification_push,pr.notification_sms
     FROM users u
     LEFT JOIN user_profiles p ON p.user_id=u.id
     LEFT JOIN user_preferences pr ON pr.user_id=u.id
     WHERE u.id=$1`, [req.auth.sub]
  );
  if (!result.rows[0]) return fail(res, 'Account not found.', 404);
  const row = result.rows[0];
  res.json({ success: true, data: {
    id: row.id, fullName: row.full_name, email: row.email, mobile: row.mobile,
    status: row.status, createdAt: row.created_at,
    profile: { gender: row.gender, dateOfBirth: row.date_of_birth, birthTime: row.birth_time, birthPlace: row.birth_place },
    preferences: { zodiacSign: row.zodiac_sign, moonSign: row.moon_sign, ascendant: row.ascendant, preferredLanguage: row.preferred_language, interests: row.interests || [],
      notifications: { email: row.notification_email, push: row.notification_push, sms: row.notification_sms } }
  }});
});

router.put('/user/profile', requireAuth('user'), async (req, res) => {
  const { fullName, gender, dateOfBirth, birthTime, birthPlace } = req.body;
  if (fullName) await pool.query('UPDATE users SET full_name=$1,updated_at=NOW() WHERE id=$2', [fullName, req.auth.sub]);
  await pool.query(
    `INSERT INTO user_profiles (user_id,gender,date_of_birth,birth_time,birth_place)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (user_id) DO UPDATE SET gender=COALESCE($2,gender),date_of_birth=COALESCE($3,date_of_birth),
     birth_time=COALESCE($4,birth_time),birth_place=COALESCE($5,birth_place),updated_at=NOW()`,
    [req.auth.sub, gender || null, dateOfBirth || null, birthTime || null, birthPlace || null]
  );
  res.json({ success: true, message: 'Profile updated successfully.' });
});

router.put('/user/preferences', requireAuth('user'), async (req, res) => {
  const { zodiacSign, moonSign, ascendant, preferredLanguage, interests, notifications } = req.body;
  const n = notifications || {};
  await pool.query(
    `INSERT INTO user_preferences (user_id,zodiac_sign,moon_sign,ascendant,preferred_language,interests,notification_email,notification_push,notification_sms)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     ON CONFLICT (user_id) DO UPDATE SET
     zodiac_sign=COALESCE($2,zodiac_sign),moon_sign=COALESCE($3,moon_sign),ascendant=COALESCE($4,ascendant),
     preferred_language=COALESCE($5,preferred_language),interests=COALESCE($6,interests),
     notification_email=COALESCE($7,notification_email),notification_push=COALESCE($8,notification_push),
     notification_sms=COALESCE($9,notification_sms),updated_at=NOW()`,
    [req.auth.sub, zodiacSign || null, moonSign || null, ascendant || null,
     preferredLanguage || 'English', interests || [], n.email ?? true, n.push ?? true, n.sms ?? false]
  );
  res.json({ success: true, message: 'Preferences saved.' });
});

router.post('/user/verify-otp', requireAuth('user'), async (req, res) => {
  const { target, otp } = req.body;
  if (!target || !otp) return fail(res, 'Target and OTP are required.');
  const result = await pool.query(
    'SELECT id FROM otp_verifications WHERE target=$1 AND otp_code=$2 AND verified=false AND expires_at>NOW()',
    [target, otp]
  );
  if (!result.rows[0]) return fail(res, 'Invalid or expired OTP.', 400);
  await pool.query('UPDATE otp_verifications SET verified=true WHERE id=$1', [result.rows[0].id]);
  res.json({ success: true, message: 'Verification successful.' });
});

router.post('/user/send-otp', requireAuth('user'), async (req, res) => {
  const { target, purpose } = req.body;
  if (!target) return fail(res, 'Target (email or mobile) is required.');
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await pool.query('DELETE FROM otp_verifications WHERE target=$1 AND purpose=$2 AND verified=false', [target, purpose || 'verification']);
  await pool.query(
    'INSERT INTO otp_verifications (target,otp_code,purpose,expires_at) VALUES ($1,$2,$3,$4)',
    [target, otp, purpose || 'verification', expiresAt]
  );
  res.json({ success: true, message: 'OTP sent successfully.', data: { otp } });
});

router.get('/astrologer/onboarding', requireAuth('astrologer'), async (req, res) => {
  const result = await pool.query(
    `SELECT a.id,a.display_name,a.account_status,a.verification_status,a.experience_years,a.short_bio,
            a.consultation_style,a.city,a.profile_status,a.is_profile_public,
            (SELECT json_agg(language) FROM astrologer_languages WHERE astrologer_id=a.id) as languages,
            (SELECT json_agg(specialization) FROM astrologer_specializations WHERE astrologer_id=a.id) as specializations,
            (SELECT json_agg(json_build_object('type',document_type,'name',original_name)) FROM astrologer_documents WHERE astrologer_id=a.id) as documents
     FROM astrologers a WHERE a.id=$1`, [req.auth.sub]
  );
  if (!result.rows[0]) return fail(res, 'Account not found.', 404);
  const row = result.rows[0];
  res.json({ success: true, data: {
    id: row.id, displayName: row.display_name, accountStatus: row.account_status,
    verificationStatus: row.verification_status, experienceYears: row.experience_years,
    shortBio: row.short_bio, consultationStyle: row.consultation_style, city: row.city,
    profileStatus: row.profile_status, isProfilePublic: row.is_profile_public,
    languages: row.languages || [], specializations: row.specializations || [], documents: row.documents || []
  }});
});

router.put('/astrologer/onboarding', requireAuth('astrologer'), async (req, res) => {
  const { shortBio, consultationStyle, city, experienceYears, profileStatus, isProfilePublic, languages, specializations } = req.body;
  await pool.query(
    `UPDATE astrologers SET short_bio=COALESCE($1,short_bio),consultation_style=COALESCE($2,consultation_style),
     city=COALESCE($3,city),experience_years=COALESCE($4,experience_years),
     profile_status=COALESCE($5,profile_status),is_profile_public=COALESCE($6,is_profile_public),updated_at=NOW() WHERE id=$7`,
    [shortBio || null, consultationStyle || null, city || null, experienceYears || null, profileStatus || null, isProfilePublic ?? null, req.auth.sub]
  );
  if (languages?.length) {
    await pool.query('DELETE FROM astrologer_languages WHERE astrologer_id=$1', [req.auth.sub]);
    for (const lang of languages) await pool.query('INSERT INTO astrologer_languages (astrologer_id,language) VALUES ($1,$2)', [req.auth.sub, lang]);
  }
  if (specializations?.length) {
    await pool.query('DELETE FROM astrologer_specializations WHERE astrologer_id=$1', [req.auth.sub]);
    for (const spec of specializations) await pool.query('INSERT INTO astrologer_specializations (astrologer_id,specialization) VALUES ($1,$2)', [req.auth.sub, spec]);
  }
  res.json({ success: true, message: 'Onboarding profile updated.' });
});

export default router;
