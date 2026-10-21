import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Shell from '../../components/common/Shell';
import Field from '../../components/common/Field';
import Notice from '../../components/common/Notice';
import { getAstrologerOnboarding, updateAstrologerOnboarding } from '../../api/onboardingApi';
import { ALL_SPECIALIZATIONS, ALL_LANGUAGES } from '../../utils/constants';

export default function AstrologerOnboardingPage() {
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ shortBio: '', consultationStyle: '', city: '', experienceYears: '', languages: [], specializations: [], profileStatus: 'draft' });

  useEffect(() => {
    getAstrologerOnboarding().then(r => {
      const d = r.data;
      setForm(prev => ({
        ...prev, shortBio: d.shortBio || '', consultationStyle: d.consultationStyle || '',
        city: d.city || '', experienceYears: d.experienceYears || '',
        languages: d.languages || [], specializations: d.specializations || [],
        profileStatus: d.profileStatus || 'draft'
      }));
    }).catch(() => {});
  }, []);

  const change = e => setForm({ ...form, [e.target.name]: e.target.value });
  const toggleLang = l => setForm(prev => ({ ...prev, languages: prev.languages.includes(l) ? prev.languages.filter(x => x !== l) : [...prev.languages, l] }));
  const toggleSpec = s => setForm(prev => ({ ...prev, specializations: prev.specializations.includes(s) ? prev.specializations.filter(x => x !== s) : [...prev.specializations, s] }));

  async function submit(e) {
    e.preventDefault(); setMsg(''); setSaving(true);
    try {
      await updateAstrologerOnboarding({ ...form, profileStatus: 'complete' });
      nav('/astrologer/dashboard');
    } catch (err) { setMsg(err.message); }
    setSaving(false);
  }

  return <Shell>
    <section className="onboarding-page">
      <div className="onboarding-header">
        <p className="eyebrow">ASTROLOGER ONBOARDING</p>
        <h1>Complete your<br /><em>practitioner profile.</em></h1>
        <p>A complete profile builds trust with seekers.</p>
      </div>
      <div className="onboarding-steps">
        <span className={step >= 1 ? 'active' : ''}>1 About Practice</span>
        <span className={step >= 2 ? 'active' : ''}>2 Languages & Skills</span>
        <span className={step >= 3 ? 'active' : ''}>3 Review</span>
      </div>
      <form onSubmit={submit} className="onboarding-form">
        {step === 1 && <>
          <h2>Your Practice</h2>
          <Field label="City" name="city" value={form.city} onChange={change} placeholder="Your city" />
          <Field label="Years of experience" type="number" name="experienceYears" value={form.experienceYears} onChange={change} required />
          <label className="field"><span>Short bio</span><textarea name="shortBio" value={form.shortBio} onChange={change} rows={4} required placeholder="Tell seekers about your practice and approach..." /></label>
          <label className="field"><span>Consultation style</span><textarea name="consultationStyle" value={form.consultationStyle} onChange={change} rows={3} placeholder="How do you approach consultations?" /></label>
        </>}
        {step === 2 && <>
          <h2>Languages & Specializations</h2>
          <label className="field"><span>Languages</span></label>
          <div className="chips">{ALL_LANGUAGES.map(l => <button type="button" key={l} className={form.languages.includes(l) ? 'selected' : ''} onClick={() => toggleLang(l)}>{form.languages.includes(l) ? '✓ ' : ''}{l}</button>)}</div>
          <label className="field"><span>Specializations</span></label>
          <div className="chips">{ALL_SPECIALIZATIONS.map(s => <button type="button" key={s} className={form.specializations.includes(s) ? 'selected' : ''} onClick={() => toggleSpec(s)}>{form.specializations.includes(s) ? '✓ ' : ''}{s}</button>)}</div>
        </>}
        {step === 3 && <>
          <h2>Review Profile</h2>
          <div className="review-box">
            <p><b>{form.city || 'City not set'}</b> · {form.experienceYears || 0} years experience</p>
            <p>{form.shortBio || 'No bio set'}</p>
            {form.consultationStyle && <p className="muted">Style: {form.consultationStyle}</p>}
            <p className="muted">Languages: {form.languages.join(', ') || 'None selected'}</p>
            <p className="muted">Specializations: {form.specializations.join(', ') || 'None selected'}</p>
          </div>
        </>}
        <Notice message={msg} />
        <div className="form-nav">
          {step > 1 && <button type="button" className="btn-back" onClick={() => setStep(step - 1)}>← Back</button>}
          {step < 3 ? <button type="button" className="primary" onClick={() => setStep(step + 1)}>Continue →</button> : <button className="primary" disabled={saving}>{saving ? 'Saving...' : 'Complete Onboarding →'}</button>}
        </div>
      </form>
      <Link className="outline-link" to="/astrologer/dashboard" style={{ textAlign: 'center', display: 'block', marginTop: 16 }}>Skip for now</Link>
    </section>
  </Shell>;
}
