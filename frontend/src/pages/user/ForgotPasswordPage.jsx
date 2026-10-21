import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Shell from '../../components/common/Shell';
import Field from '../../components/common/Field';
import Notice from '../../components/common/Notice';
import { forgotPassword, resetPassword, astrologerForgotPassword, astrologerResetPassword } from '../../api/sessionApi';

export default function ForgotPasswordPage({ astrologer = false }) {
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [msg, setMsg] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  async function handleRequest(e) {
    e.preventDefault(); setMsg('');
    try {
      const fn = astrologer ? astrologerForgotPassword : forgotPassword;
      const r = await fn({ identifier });
      if (r.data?.resetToken) setResetToken(r.data.resetToken);
      setStep(2);
      setMsg('If an account exists, you can now reset your password.');
    } catch (err) { setMsg(err.message); }
  }

  async function handleReset(e) {
    e.preventDefault(); setMsg('');
    try {
      const fn = astrologer ? astrologerResetPassword : resetPassword;
      await fn({ token: resetToken, newPassword, confirmPassword });
      nav(astrologer ? '/astrologer/login' : '/user/login', { state: { message: 'Password reset successfully. Please sign in.' } });
    } catch (err) { setMsg(err.message); }
  }

  const basePath = astrologer ? '/astrologer' : '/user';

  return <Shell>
    <section className="forgot-page">
      <div className="forgot-card">
        {step === 1 ? <>
          <div className="card-head"><p className="eyebrow">RESET PASSWORD</p><h2>Forgot your password?</h2><p>Enter your email or mobile and we'll help you get back in.</p></div>
          <form onSubmit={handleRequest}>
            <Field label="Email or mobile number" value={identifier} onChange={e => setIdentifier(e.target.value)} placeholder="you@example.com" required />
            <Notice message={msg} />
            <button className="primary">Send reset instructions →</button>
          </form>
        </> : <>
          <div className="card-head"><p className="eyebrow">NEW PASSWORD</p><h2>Create a new password</h2><p>Enter the reset code and your new password below.</p></div>
          <form onSubmit={handleReset}>
            <Field label="Reset code" value={resetToken} onChange={e => setResetToken(e.target.value)} placeholder="Paste reset code" required />
            <Field label="New password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min. 8 characters" required />
            <Field label="Confirm password" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repeat password" required />
            <Notice message={msg} />
            <button className="primary">Reset password →</button>
          </form>
        </>}
        <p className="switch"><Link to={`${basePath}/login`}>← Back to sign in</Link></p>
      </div>
    </section>
  </Shell>;
}
