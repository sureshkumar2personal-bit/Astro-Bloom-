import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyFullProfile, updateUserProfile } from '../../api/userProfileApi';

const LANGUAGES = ['Tamil', 'Hindi', 'English', 'Telugu', 'Kannada', 'Malayalam', 'Marathi', 'Bengali', 'Gujarati', 'Punjabi', 'Sanskrit'];

export default function UserProfileEditPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: '', gender: '', dateOfBirth: '', birthTime: '', birthPlace: '', preferredLanguage: 'English'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    getMyFullProfile()
      .then(r => {
        const d = r.data;
        setForm({
          fullName: d.fullName || '',
          gender: d.profile?.gender || '',
          dateOfBirth: d.profile?.dateOfBirth ? d.profile.dateOfBirth.slice(0, 10) : '',
          birthTime: d.profile?.birthTime || '',
          birthPlace: d.profile?.birthPlace || '',
          preferredLanguage: d.preferredLanguage || 'English'
        });
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const change = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    setError('');
    try {
      await updateUserProfile(form);
      setMsg('Profile updated successfully.');
      setTimeout(() => navigate('/user/profile'), 1500);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <section className="upage"><p className="upage-loading">Loading profile...</p></section>;

  return (
    <section className="upage">
      <div className="upage-header">
        <div>
          <p className="upage-eyebrow">EDIT PROFILE</p>
          <h1>Edit Your Profile</h1>
        </div>
      </div>

      {msg && <div className="upage-success">{msg}</div>}
      {error && <div className="upage-error">{error}</div>}

      <form onSubmit={handleSave} className="upage-form">
        <div className="upage-form-section">
          <h2>Personal Information</h2>
          <div className="upage-field">
            <label>Full Name *</label>
            <input type="text" name="fullName" value={form.fullName} onChange={change} required />
          </div>
          <div className="upage-field">
            <label>Gender</label>
            <select name="gender" value={form.gender} onChange={change}>
              <option value="">Select...</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="upage-field">
            <label>Preferred Language</label>
            <select name="preferredLanguage" value={form.preferredLanguage} onChange={change}>
              {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
        </div>

        <div className="upage-form-section">
          <h2>Birth Details</h2>
          <p className="upage-section-note">Used for astrology calculations. You can also set these per family profile.</p>
          <div className="upage-field-row">
            <div className="upage-field">
              <label>Date of Birth</label>
              <input type="date" name="dateOfBirth" value={form.dateOfBirth} onChange={change} />
            </div>
            <div className="upage-field">
              <label>Birth Time</label>
              <input type="time" name="birthTime" value={form.birthTime} onChange={change} />
            </div>
          </div>
          <div className="upage-field">
            <label>Birth Place</label>
            <input type="text" name="birthPlace" value={form.birthPlace} onChange={change} placeholder="e.g. Chennai, Tamil Nadu" />
          </div>
        </div>

        <div className="upage-form-actions">
          <button type="submit" className="upage-save-btn" disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button type="button" className="upage-cancel-btn" onClick={() => navigate('/user/profile')}>
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}
