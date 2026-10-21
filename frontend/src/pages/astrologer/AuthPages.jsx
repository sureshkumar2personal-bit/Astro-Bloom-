import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Field from '../../components/common/Field';
import Notice from '../../components/common/Notice';
import Shell from '../../components/common/Shell';
import { apiPost, saveSession } from '../../api/client';
import { validateAstrologerEmail } from '../../utils/emailValidation';

const REG_SPECS = ['Vedic Astrology', 'KP Astrology', 'Tarot', 'Numerology', 'Vastu', 'Marriage Matching', 'Career Astrology', 'Remedy Guidance'];

export function AstrologerRegister() {
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({ fullName: '', displayName: '', mobile: '', email: '', password: '', confirmPassword: '', city: '', experienceYears: '', shortBio: '', consultationStyle: '', languages: ['English'], specializations: [] });
  const change = e => setForm({ ...form, [e.target.name]: e.target.value });

  async function submit(e) {
    e.preventDefault(); setMsg('');
    const emailErr = validateAstrologerEmail(form.email);
    if (emailErr) { setMsg(emailErr); return; }
    try { await apiPost('/auth/astrologer/register', form); nav('/astrologer/login'); }
    catch (err) { setMsg(err.message); }
  }

  return (<Shell>
    <section className="apply-wrap">
      <div className="apply-intro">
        <p className="eyebrow">ASTROLOGER PARTNERSHIP</p>
        <h1>Share your gift.<br /><em>Guide their path.</em></h1>
        <p>Join a thoughtful community of trusted practitioners bringing ancient wisdom to modern lives.</p>
        <div className="apply-stats"><span><b>10k+</b> seekers guided</span><span><b>4.9/5</b> practitioner rating</span><span><b>100%</b> secure payouts</span></div>
      </div>
      <section className="apply-card">
        <div className="steps">
          <span className={step >= 1 ? 'active' : ''}>1 <i>About you</i></span>
          <span className={step >= 2 ? 'active' : ''}>2 <i>Your practice</i></span>
          <span className={step >= 3 ? 'active' : ''}>3 <i>Review</i></span>
        </div>
        <form onSubmit={submit}>
          {step === 1 && <>
            <h2>Tell us about yourself</h2>
            <p className="muted">This helps us create your professional profile.</p>
            <div className="split"><Field label="Full name" name="fullName" value={form.fullName} onChange={change} required /><Field label="Display name" name="displayName" value={form.displayName} onChange={change} required /></div>
            <div className="split"><Field label="Mobile number" name="mobile" value={form.mobile} onChange={change} required /><Field label="Email address" type="email" name="email" value={form.email} onChange={change} required /></div>
            <div className="split"><Field label="Password" type="password" name="password" value={form.password} onChange={change} required /><Field label="Confirm password" type="password" name="confirmPassword" value={form.confirmPassword} onChange={change} required /></div>
          </>}
          {step === 2 && <>
            <h2>Your practice</h2>
            <div className="split"><Field label="City" name="city" value={form.city} onChange={change} /><Field label="Years of experience" name="experienceYears" type="number" value={form.experienceYears} onChange={change} required /></div>
            <label className="field"><span>Short bio</span><textarea name="shortBio" value={form.shortBio} onChange={change} rows={3} required placeholder="Tell us about your practice..." /></label>
            <label className="field"><span>Consultation style</span><textarea name="consultationStyle" value={form.consultationStyle} onChange={change} rows={2} placeholder="How do you approach consultations?" /></label>
            <label className="field"><span>Languages</span></label>
            <div className="chips">{['Tamil', 'English', 'Hindi', 'Telugu', 'Malayalam', 'Kannada'].map(l => <button type="button" key={l} className={form.languages.includes(l) ? 'selected' : ''} onClick={() => setForm({ ...form, languages: form.languages.includes(l) ? form.languages.filter(v => v !== l) : [...form.languages, l] })}>{form.languages.includes(l) ? '✓ ' : ''}{l}</button>)}</div>
            <label className="field"><span>Specializations</span></label>
            <div className="chips">{REG_SPECS.map(s => <button type="button" key={s} className={form.specializations.includes(s) ? 'selected' : ''} onClick={() => setForm({ ...form, specializations: form.specializations.includes(s) ? form.specializations.filter(v => v !== s) : [...form.specializations, s] })}>{form.specializations.includes(s) ? '✓ ' : ''}{s}</button>)}</div>
          </>}
          {step === 3 && <>
            <h2>Review &amp; submit</h2>
            <div className="review-box"><p><b>{form.displayName}</b> · {form.experienceYears} years · {form.city || 'Not specified'}</p><p>{form.shortBio}</p><p className="muted">Languages: {form.languages.join(', ')}</p><p className="muted">Specializations: {form.specializations.join(', ')}</p></div>
          </>}
          <Notice message={msg} />
          <div className="form-nav">
            {step > 1 && <button type="button" className="btn-back" onClick={() => setStep(step - 1)}>← Back</button>}
            {step < 3 ? <button type="button" className="primary" onClick={() => setStep(Math.min(3, step + 1))}>Continue →</button> : <button className="primary">Submit application →</button>}
          </div>
        </form>
        <p className="switch" style={{ marginTop: 20 }}><Link to="/register">← Back to role selection</Link></p>
      </section>
    </section>
  </Shell>);
}

export function AstrologerLogin() {
  const nav = useNavigate();
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [rememberMe, setRememberMe] = useState(false);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault(); setMsg('');
    const id = form.identifier.trim();
    if (!id || !form.password) { setMsg('Please fill in all fields.'); return; }
    if (id.includes('@')) { const err = validateAstrologerEmail(id); if (err) { setMsg(err); return; } }
    setLoading(true);
    try {
      const r = await apiPost('/auth/astrologer/login', { identifier: id, password: form.password });
      if (r.success) { saveSession(r.data, rememberMe); nav('/astrologer/dashboard'); }
      else setMsg('Unable to sign in. Please try again.');
    } catch (e) {
      setMsg('Invalid email/mobile number or password.');
    }
    finally { setLoading(false); }
  }

  return (<Shell>
    <section className="apply-wrap" style={{ placeItems: 'center' }}>
      <section className="apply-card" style={{ maxWidth: 480, width: '100%' }}>
        <div className="card-head"><p className="eyebrow">ASTROLOGER SIGN IN</p><h2>Welcome back</h2><p>Access your practitioner portal.</p></div>
        <form onSubmit={submit} noValidate>
          <Field label="Email or mobile number" name="identifier" autoComplete="username" value={form.identifier} onChange={e => setForm({ ...form, identifier: e.target.value })} required />
          <Field label="Password" type="password" name="password" autoComplete="current-password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
          <div className="forgot"><label className="check"><input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} /> Remember me</label><Link to="/astrologer/forgot-password">Forgot password?</Link></div>
          <Notice message={msg} />
          <button className="primary" disabled={loading}>{loading ? 'Signing in...' : 'Sign in to portal'} <b>→</b></button>
        </form>
        <p className="switch">Ready to share your gift? <Link to="/astrologer/register">Apply as an astrologer</Link></p>
        <p className="switch" style={{ marginTop: 12 }}><Link to="/register">← Back to role selection</Link></p>
      </section>
    </section>
  </Shell>);
}
