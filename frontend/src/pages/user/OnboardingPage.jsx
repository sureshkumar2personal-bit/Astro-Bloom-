import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Shell from '../../components/common/Shell';
import Field from '../../components/common/Field';
import Notice from '../../components/common/Notice';
import { getMyProfile, updateMyProfile, updateMyPreferences } from '../../api/onboardingApi';

const ZODIAC = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
const INTERESTS = ['Career','Love','Finance','Health','Education','Family','Spirituality','Remedies','Marriage','Business'];

export default function OnboardingPage() {
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    fullName: '', gender: '', dateOfBirth: '', birthTime: '', birthPlace: '',
    zodiacSign: '', moonSign: '', preferredLanguage: 'English', interests: []
  });

  useEffect(() => {
    getMyProfile().then(r => {
      const d = r.data;
      setForm(prev => ({
        ...prev, fullName: d.fullName || '',
        gender: d.profile?.gender || '', dateOfBirth: d.profile?.dateOfBirth || '',
        birthTime: d.profile?.birthTime || '', birthPlace: d.profile?.birthPlace || '',
        zodiacSign: d.preferences?.zodiacSign || '', moonSign: d.preferences?.moonSign || '',
        preferredLanguage: d.preferences?.preferredLanguage || 'English', interests: d.preferences?.interests || []
      }));
    }).catch(() => {});
  }, []);

  const change = e => setForm({ ...form, [e.target.name]: e.target.value });
  const toggleInterest = i => setForm(prev => ({
    ...prev, interests: prev.interests.includes(i) ? prev.interests.filter(x => x !== i) : [...prev.interests, i]
  }));

  async function submit(e) {
    e.preventDefault(); setMsg(''); setSaving(true);
    try {
      await updateMyProfile({ fullName: form.fullName, gender: form.gender, dateOfBirth: form.dateOfBirth, birthTime: form.birthTime, birthPlace: form.birthPlace });
      await updateMyPreferences({ zodiacSign: form.zodiacSign, moonSign: form.moonSign, preferredLanguage: form.preferredLanguage, interests: form.interests });
      nav('/user/dashboard');
    } catch (err) { setMsg(err.message); }
    setSaving(false);
  }

  return <Shell>
    <section className="onboarding-page">
      <div className="onboarding-header">
        <p className="eyebrow">COMPLETE YOUR PROFILE</p>
        <h1>Let the stars know<br /><em>who you are.</em></h1>
        <p>A few details help us personalize your cosmic experience.</p>
      </div>
      <div className="onboarding-steps">
        <span className={step >= 1 ? 'active' : ''}>1 About You</span>
        <span className={step >= 2 ? 'active' : ''}>2 Birth Details</span>
        <span className={step >= 3 ? 'active' : ''}>3 Your Interests</span>
      </div>
      <form onSubmit={submit} className="onboarding-form">
        {step === 1 && <>
          <h2>About You</h2>
          <Field label="Full name" name="fullName" value={form.fullName} onChange={change} placeholder="Your full name" required />
          <label className="field"><span>Gender</span>
            <select name="gender" value={form.gender} onChange={change} className="cosmic-select">
              <option value="">Select</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option><option value="prefer_not_to_say">Prefer not to say</option>
            </select>
          </label>
          <label className="field"><span>Preferred language</span>
            <select name="preferredLanguage" value={form.preferredLanguage} onChange={change} className="cosmic-select">
              {['English','Tamil','Hindi','Telugu','Malayalam','Kannada'].map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </label>
        </>}
        {step === 2 && <>
          <h2>Birth Details</h2>
          <p className="muted">These help us generate accurate birth charts and predictions.</p>
          <Field label="Date of birth" type="date" name="dateOfBirth" value={form.dateOfBirth} onChange={change} required />
          <Field label="Time of birth" type="time" name="birthTime" value={form.birthTime} onChange={change} />
          <Field label="Place of birth" name="birthPlace" value={form.birthPlace} onChange={change} placeholder="City, State" />
          <label className="field"><span>Zodiac sign</span>
            <select name="zodiacSign" value={form.zodiacSign} onChange={change} className="cosmic-select">
              <option value="">Select</option>{ZODIAC.map(z => <option key={z} value={z}>{z}</option>)}
            </select>
          </label>
        </>}
        {step === 3 && <>
          <h2>Your Interests</h2>
          <p className="muted">Select topics you care about most.</p>
          <div className="interests-grid">
            {INTERESTS.map(i => (
              <button key={i} type="button" className={`interest-pill ${form.interests.includes(i) ? 'selected' : ''}`} onClick={() => toggleInterest(i)}>
                {form.interests.includes(i) ? '✓ ' : ''}{i}
              </button>
            ))}
          </div>
        </>}
        <Notice message={msg} />
        <div className="form-nav">
          {step > 1 && <button type="button" className="btn-back" onClick={() => setStep(step - 1)}>← Back</button>}
          {step < 3 ? <button type="button" className="primary" onClick={() => setStep(step + 1)}>Continue →</button> : <button className="primary" disabled={saving}>{saving ? 'Saving...' : 'Complete Profile →'}</button>}
        </div>
      </form>
    </section>
  </Shell>;
}
