import { useState, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Field from '../../components/common/Field';
import Notice from '../../components/common/Notice';
import { apiPost, saveSession } from '../../api/client';
import { validateUserEmail } from '../../utils/emailValidation';

export function UserRegister() {
  const nav = useNavigate();
  const fullNameRef = useRef(null);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmPasswordRef = useRef(null);
  const termsRef = useRef(null);
  const [form, setForm] = useState({ fullName: '', mobile: '', email: '', password: '', confirmPassword: '', referralCode: '', terms: false });
  const [msg, setMsg] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  function change(e) {
    const { name, type, checked, value } = e.target;
    setForm(current => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
    setFieldErrors(current => {
      const next = { ...current };
      delete next[name];
      return next;
    });
  }

  async function submit(e) {
    e.preventDefault();
    setMsg('');
    setFieldErrors({});

    const values = {
      fullName: form.fullName.trim(),
      email: form.email.trim().toLowerCase(),
      mobile: form.mobile.trim(),
      password: form.password,
      confirmPassword: form.confirmPassword,
      referralCode: form.referralCode.trim(),
      terms: form.terms,
    };
    const errors = {};
    if (!values.fullName) errors.fullName = 'Full name is required.';
    if (!values.email) errors.email = 'Email address is required.';
    else {
      const emailError = validateUserEmail(values.email);
      if (emailError) errors.email = emailError;
    }
    if (!values.password) errors.password = 'Password is required.';
    else if (values.password.length < 8) errors.password = 'Password must be at least 8 characters.';
    if (!values.confirmPassword) errors.confirmPassword = 'Please confirm your password.';
    else if (values.password !== values.confirmPassword) errors.confirmPassword = 'Passwords do not match.';
    if (!values.terms) errors.terms = 'You must accept the Terms & Conditions and Privacy Policy.';

    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      const firstInvalid = errors.fullName ? fullNameRef : errors.email ? emailRef : errors.password ? passwordRef : errors.confirmPassword ? confirmPasswordRef : termsRef;
      firstInvalid.current?.focus();
      return;
    }

    setLoading(true);
    try {
      await apiPost('/auth/user/register', values);
      nav('/user/login', { replace: true, state: { message: 'Your account is ready. Please sign in.', email: values.email } });
    } catch (err) {
      setMsg(err.message || 'We could not create your account. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="card-head"><p className="eyebrow">CREATE ACCOUNT</p><h2>Welcome, seeker</h2><p>Your story is written in the stars. Let's begin.</p></div>
      <form onSubmit={submit} noValidate>
        <div className="split"><Field ref={fullNameRef} label="Full name" name="fullName" autoComplete="name" value={form.fullName} onChange={change} placeholder="Your full name" error={fieldErrors.fullName} required /><Field label="Mobile number · optional" type="tel" name="mobile" autoComplete="tel" value={form.mobile} onChange={change} placeholder="98765 43210" error={fieldErrors.mobile} /></div>
        <Field ref={emailRef} label="Email address" type="email" name="email" autoComplete="email" value={form.email} onChange={change} placeholder="you@example.com" error={fieldErrors.email} required />
        <div className="split"><Field ref={passwordRef} label="Password" type="password" name="password" autoComplete="new-password" value={form.password} onChange={change} placeholder="Min. 8 characters" error={fieldErrors.password} required /><Field ref={confirmPasswordRef} label="Confirm password" type="password" name="confirmPassword" autoComplete="new-password" value={form.confirmPassword} onChange={change} placeholder="Repeat password" error={fieldErrors.confirmPassword} required /></div>
        <Field label="Referral code  ·  optional" name="referralCode" value={form.referralCode} onChange={change} placeholder="Enter code if you have one" />
        <label className="check"><input ref={termsRef} type="checkbox" name="terms" checked={form.terms} onChange={change} aria-invalid={fieldErrors.terms ? 'true' : undefined} aria-describedby={fieldErrors.terms ? 'terms-error' : undefined} /> I agree to the Terms &amp; Conditions and Privacy Policy.</label>
        {fieldErrors.terms && <div className="field-error" id="terms-error" role="alert">{fieldErrors.terms}</div>}
        <Notice message={msg} />
        <button className="primary" disabled={loading}>{loading ? 'Creating account...' : 'Create account'} <b>→</b></button>
      </form>
      <p className="switch">Already have an account? <Link to="/user/login">Sign in</Link></p>
      <p className="switch" style={{ marginTop: 10 }}><Link to="/register">← Back to role selection</Link></p>
    </div>
  );
}

export function UserLogin() {
  const nav = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ identifier: location.state?.email || '', password: '' });
  const [rememberMe, setRememberMe] = useState(false);
  const [msg, setMsg] = useState(location.state?.message || '');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const idRef = useRef(null);
  const pwRef = useRef(null);

  function clearField(name) {
    setFieldErrors(prev => { const n = { ...prev }; delete n[name]; return n; });
  }

  async function submit(e) {
    e.preventDefault(); setMsg(''); setFieldErrors({});
    const id = form.identifier.trim();
    const errors = {};
    if (!id) errors.identifier = 'Email or mobile number is required.';
    if (!form.password) errors.password = 'Password is required.';
    if (id.includes('@')) { const err = validateUserEmail(id); if (err) errors.identifier = err; }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      const first = errors.identifier ? idRef : pwRef;
      first.current?.focus();
      return;
    }
    setLoading(true);
    try {
      const r = await apiPost('/auth/user/login', { identifier: id, password: form.password });
      saveSession(r.data, rememberMe);
      nav(r.data.redirectTo || '/user/dashboard');
    } catch (err) {
      if (err.message.includes('not active')) setMsg('This account is not active.');
      else setMsg('Invalid email/mobile number or password.');
    }
    finally { setLoading(false); }
  }

  return (
    <div>
      <div className="card-head"><p className="eyebrow">SIGN IN</p><h2>Welcome back</h2><p>Enter your details to continue.</p></div>
      <form onSubmit={submit} noValidate>
        <Field ref={idRef} label="Email or mobile number" name="identifier" autoComplete="username" value={form.identifier} onChange={e => { setForm({ ...form, identifier: e.target.value }); clearField('identifier'); }} placeholder="you@example.com" error={fieldErrors.identifier} required />
        <Field ref={pwRef} label="Password" type="password" name="password" autoComplete="current-password" value={form.password} onChange={e => { setForm({ ...form, password: e.target.value }); clearField('password'); }} placeholder="Your password" error={fieldErrors.password} required />
        <div className="forgot"><label className="check"><input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} /> Remember me</label><Link to="/user/forgot-password">Forgot password?</Link></div>
        <Notice message={msg} />
        <button className="primary" disabled={loading}>{loading ? 'Signing in...' : 'Sign in'} <b>→</b></button>
      </form>
      <p className="switch">New to CosmicConnect? <Link to="/user/register">Create an account</Link></p>
      <div className="pro-link">Are you an astrologer? <Link to="/astrologer/login">Sign in to your portal →</Link></div>
    </div>
  );
}
