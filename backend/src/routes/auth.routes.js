import { Router } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { pool } from '../db/pool.js';
import { fail, asArray, find } from '../utils/response.js';
import { secret, refreshSecret, requireAuth } from '../middleware/auth.js';
import upload from '../middleware/upload.js';
import jwt from 'jsonwebtoken';

const router = Router();
const users = [], astrologers = [], sessions = [];
const uid = () => crypto.randomUUID();

function extractYear(email) {
  const match = email.match(/(\d{4})/);
  return match ? parseInt(match[1], 10) : null;
}
function getDomain(email) {
  const at = email.lastIndexOf('@');
  return at > -1 ? email.slice(at + 1).toLowerCase() : '';
}
function validateAstrologerEmail(email) {
  if (getDomain(email) !== 'asmail.com') return 'Astrologer email must use @asmail.com domain.';
  const year = extractYear(email);
  if (year === null || year < 2017 || year > 3000) return 'Astrologer email year must be between 2017 and 3000.';
  return null;
}
function validateUserEmail(email) {
  if (!email) return 'Email address is required.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a valid email address.';
  const domain = getDomain(email);
  if (domain === 'asmail.com') return 'This email is reserved for astrologer accounts.';
  return null;
}

const issue = async (person, actorType) => {
  const accessToken = jwt.sign({ sub: person.id, actorType, role: actorType, verificationStatus: person.verificationStatus }, secret, { expiresIn: '1h' });
  const refreshToken = jwt.sign({ sub: person.id, actorType }, refreshSecret, { expiresIn: '30d' });
  sessions.push({ id: uid(), actorId: person.id, actorType, refreshTokenHash: await bcrypt.hash(refreshToken, 10), revoked: false });
  return { accessToken, refreshToken };
};

router.post('/user/register', async (req, res) => {
  const fullName = req.body.fullName?.trim();
  const email = req.body.email?.trim().toLowerCase();
  const mobile = req.body.mobile?.trim() || null;
  const password = req.body.password;
  const confirmPassword = req.body.confirmPassword;
  const referralCode = req.body.referralCode?.trim() || null;
  const { terms } = req.body;
  if (!fullName || !email || !password || !confirmPassword) return fail(res, 'Please complete all required fields.');
  if (!terms) return fail(res, 'Please accept the terms and conditions.');
  if (password !== confirmPassword) return fail(res, 'Passwords do not match.');
  if (password.length < 8) return fail(res, 'Password must be at least 8 characters.');
  const err = validateUserEmail(email);
  if (err) return fail(res, err);
  const passwordHash = await bcrypt.hash(password, 12);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query('INSERT INTO users (full_name,mobile,email,password_hash,referral_code) VALUES ($1,$2,$3,$4,$5) RETURNING id,full_name,mobile,email,status', [fullName, mobile, email, passwordHash, referralCode]);
    const row = result.rows[0];
    const user = { id: row.id, fullName: row.full_name, mobile: row.mobile, email: row.email, status: row.status, passwordHash };
    await client.query('INSERT INTO user_profiles (user_id) VALUES ($1)', [row.id]);
    await client.query("INSERT INTO wallet_accounts (owner_type,owner_id,available_balance) VALUES ('user',$1,12000)", [row.id]);
    await client.query('COMMIT');
    users.push(user);
    res.status(201).json({ success: true, message: 'User registered successfully', data: { userId: user.id } });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') return fail(res, 'An account already exists with this email or mobile number.');
    throw error;
  } finally {
    client.release();
  }
});

router.post('/user/login', async (req, res) => {
  let user = find(users, req.body.identifier);
  if (!user) {
    const result = await pool.query('SELECT id,full_name,mobile,email,password_hash,status FROM users WHERE mobile=$1 OR email=$1', [req.body.identifier]);
    const row = result.rows[0];
    if (row) { user = { id: row.id, fullName: row.full_name, mobile: row.mobile, email: row.email, passwordHash: row.password_hash, status: row.status }; users.push(user); }
  }
  if (!user || !await bcrypt.compare(req.body.password || '', user.passwordHash)) return fail(res, 'Invalid email/mobile number or password.', 401);
  if (user.status !== 'active') return fail(res, 'This account is not active.', 403);
  user.lastLoginAt = new Date();
  await pool.query('UPDATE users SET last_login_at=NOW(),updated_at=NOW() WHERE id=$1', [user.id]);
  const tokens = await issue(user, 'user');
  res.json({ success: true, message: 'Login successful', data: { ...tokens, user: { id: user.id, fullName: user.fullName, mobile: user.mobile }, redirectTo: '/user/dashboard' } });
});

router.post('/astrologer/register', upload.fields([{ name: 'identityProof', maxCount: 1 }, { name: 'astrologyCertificate', maxCount: 1 }]), async (req, res) => {
  const { fullName, displayName, mobile, email, password, confirmPassword, experienceYears, shortBio, city, consultationStyle } = req.body;
  let languages, specializations;
  try { languages = asArray(req.body.languages); specializations = asArray(req.body.specializations); } catch { return fail(res, 'Languages and specializations are invalid.'); }
  if (!fullName || !displayName || !mobile || !email || !password || !experienceYears || !shortBio) return fail(res, 'Please complete all required professional details.');
  const astroErr = validateAstrologerEmail(email);
  if (astroErr) return fail(res, astroErr);
  if (password !== confirmPassword) return fail(res, 'Passwords do not match.');
  if (password.length < 8) return fail(res, 'Password must be at least 8 characters.');
  if (!languages.length || !specializations.length) return fail(res, 'Select at least one language and specialization.');
  if (find(astrologers, mobile) || find(astrologers, email)) return fail(res, 'An application already exists with this email or mobile number.');
  try {
    const existing = await pool.query('SELECT id FROM astrologers WHERE email=$1 OR mobile=$2', [email, mobile]);
    if (existing.rows.length > 0) return fail(res, 'An application already exists with this email or mobile number.');
  } catch {}
  const passwordHash = await bcrypt.hash(password, 12);
  const astrologerId = uid();
  try {
    await pool.query(
      `INSERT INTO astrologers (id,full_name,display_name,email,mobile,password_hash,city,experience_years,short_bio,consultation_style,account_status,verification_status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [astrologerId, fullName, displayName, email, mobile, passwordHash, city || null, parseInt(experienceYears) || 0, shortBio, consultationStyle || null, 'active', 'approved']
    );
    for (const lang of languages) {
      await pool.query('INSERT INTO astrologer_languages (astrologer_id,language) VALUES ($1,$2)', [astrologerId, lang]);
    }
    for (const spec of specializations) {
      await pool.query('INSERT INTO astrologer_specializations (astrologer_id,specialization) VALUES ($1,$2)', [astrologerId, spec]);
    }
    const documents = Object.entries(req.files || {}).flatMap(([type, files]) => files.map(file => ({ id: uid(), type, originalName: file.originalname, mimeType: file.mimetype, size: file.size, uploadedAt: new Date() })));
    for (const doc of documents) {
      await pool.query('INSERT INTO astrologer_documents (astrologer_id,document_type,original_name,mime_type,file_size) VALUES ($1,$2,$3,$4,$5)', [astrologerId, doc.type, doc.originalName, doc.mimeType, doc.size]);
    }
    await pool.query("INSERT INTO astrologer_service_status (astrologer_id,online_status,appointment_available,emergency_available,live_now,question_available,starting_question_price,starting_call_price) VALUES ($1,'offline',false,false,false,false,0,0)", [astrologerId]);
  } catch (err) {
    if (err.code === '23505') return fail(res, 'An application already exists with this email or mobile number.');
    throw err;
  }
  const astrologer = { id: astrologerId, fullName, displayName, email, mobile, passwordHash, city, experienceYears, shortBio, consultationStyle, languages, specializations, accountStatus: 'active', verificationStatus: 'approved', createdAt: new Date() };
  astrologers.push(astrologer);
  res.status(201).json({ success: true, message: 'Astrologer account created successfully', data: { astrologerId, accountStatus: 'active', verificationStatus: 'approved', documentsUploaded: (req.files ? Object.values(req.files).flat().length : 0) } });
});

router.post('/astrologer/login', async (req, res) => {
  let astrologer = find(astrologers, req.body.identifier);
  if (!astrologer) {
    const result = await pool.query("SELECT id,full_name,display_name,email,mobile,password_hash,account_status,verification_status FROM astrologers WHERE mobile=$1 OR email=$1", [req.body.identifier]);
    const row = result.rows[0];
    if (row) {
      astrologer = { id: row.id, fullName: row.full_name, displayName: row.display_name, email: row.email, mobile: row.mobile, passwordHash: row.password_hash, accountStatus: row.account_status, verificationStatus: row.verification_status };
      astrologers.push(astrologer);
    }
  }
  if (!astrologer || !await bcrypt.compare(req.body.password || '', astrologer.passwordHash)) return fail(res, 'Invalid email/mobile number or password.', 401);
  astrologer.lastLoginAt = new Date();
  const tokens = await issue(astrologer, 'astrologer');
  res.json({ success: true, message: 'Login successful', data: { ...tokens, astrologer: { id: astrologer.id, displayName: astrologer.displayName, accountStatus: astrologer.accountStatus, verificationStatus: astrologer.verificationStatus }, redirectTo: '/astrologer/dashboard' } });
});

router.get('/user/me', requireAuth('user'), (req, res) => {
  const user = users.find(x => x.id === req.auth.sub);
  if (!user) return fail(res, 'Account not found.', 404);
  res.json({ success: true, data: { id: user.id, fullName: user.fullName, email: user.email, mobile: user.mobile, status: user.status } });
});

router.get('/astrologer/me', requireAuth('astrologer'), (req, res) => {
  const astrologer = astrologers.find(x => x.id === req.auth.sub);
  if (!astrologer) return fail(res, 'Account not found.', 404);
  res.json({ success: true, data: { id: astrologer.id, displayName: astrologer.displayName, email: astrologer.email, accountStatus: astrologer.accountStatus, verificationStatus: astrologer.verificationStatus, documents: astrologer.documents } });
});

router.post('/refresh-token', async (req, res) => {
  try {
    const payload = jwt.verify(req.body.refreshToken, refreshSecret);
    const people = payload.actorType === 'user' ? users : payload.actorType === 'astrologer' ? astrologers : null;
    if (!people) return fail(res, 'Refresh token is invalid.', 401);
    const person = people.find(x => x.id === payload.sub);
    const candidates = sessions.filter(x => x.actorId === payload.sub && x.actorType === payload.actorType && !x.revoked);
    const active = (await Promise.all(candidates.map(x => bcrypt.compare(req.body.refreshToken, x.refreshTokenHash)))).some(Boolean);
    if (!person || !active) return fail(res, 'Refresh token is invalid.', 401);
    const tokens = await issue(person, payload.actorType);
    res.json({ success: true, message: 'Token refreshed', data: tokens });
  } catch { return fail(res, 'Refresh token is invalid or expired.', 401); }
});

router.post('/logout', requireAuth('user'), (req, res) => {
  sessions.filter(x => x.actorId === req.auth.sub).forEach(x => x.revoked = true);
  res.json({ success: true, message: 'Logged out successfully' });
});

router.post('/astrologer/logout', requireAuth('astrologer'), (req, res) => {
  sessions.filter(x => x.actorId === req.auth.sub).forEach(x => x.revoked = true);
  res.json({ success: true, message: 'Logged out successfully' });
});

export { users, astrologers };
export default router;
