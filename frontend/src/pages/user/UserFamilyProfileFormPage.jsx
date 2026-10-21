import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getAstrologyProfile, createAstrologyProfile, updateAstrologyProfile } from '../../api/userProfileApi';

const RELATIONSHIPS = ['self', 'spouse', 'child', 'father', 'mother', 'brother', 'sister', 'other'];
const RASIS = ['Mesham', 'Rishabham', 'Mithunam', 'Katakam', 'Simham', 'Kanyam', 'Tulam', 'Vrischikam', 'Dhanus', 'Makaram', 'Kumbham', 'Meenam'];
const NAKSHATRAS = ['Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra', 'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni', 'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha', 'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha', 'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati'];

export default function UserFamilyProfileFormPage() {
  const navigate = useNavigate();
  const { profileId } = useParams();
  const isEdit = Boolean(profileId);
  const [form, setForm] = useState({
    profileName: '', relationship: 'self', gender: '', dateOfBirth: '',
    birthTime: '', birthPlace: '', rasi: '', nakshatra: '', pada: '', lagna: ''
  });
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isEdit) return;
    getAstrologyProfile(profileId)
      .then(r => {
        const d = r.data;
        setForm({
          profileName: d.profileName || '', relationship: d.relationship || 'self',
          gender: d.gender || '', dateOfBirth: d.dateOfBirth ? d.dateOfBirth.slice(0, 10) : '',
          birthTime: d.birthTime || '', birthPlace: d.birthPlace || '',
          rasi: d.rasi || '', nakshatra: d.nakshatra || '',
          pada: d.pada || '', lagna: d.lagna || ''
        });
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [profileId, isEdit]);

  const change = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    setError('');
    if (!form.profileName.trim()) { setError('Profile name is required.'); setSaving(false); return; }
    if (!form.relationship) { setError('Relationship is required.'); setSaving(false); return; }
    try {
      if (isEdit) {
        await updateAstrologyProfile(profileId, form);
        setMsg('Profile updated successfully.');
      } else {
        await createAstrologyProfile(form);
        setMsg('Profile created successfully.');
      }
      setTimeout(() => navigate('/user/profile'), 1200);
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
          <p className="upage-eyebrow">{isEdit ? 'EDIT' : 'ADD'} FAMILY PROFILE</p>
          <h1>{isEdit ? 'Edit' : 'Add'} Astrology Profile</h1>
        </div>
      </div>

      {msg && <div className="upage-success">{msg}</div>}
      {error && <div className="upage-error">{error}</div>}

      <form onSubmit={handleSave} className="upage-form">
        <div className="upage-form-section">
          <h2>Basic Details</h2>
          <div className="upage-field-row">
            <div className="upage-field">
              <label>Profile Name *</label>
              <input type="text" name="profileName" value={form.profileName} onChange={change}
                placeholder="e.g. Meera, Ravi" required />
            </div>
            <div className="upage-field">
              <label>Relationship *</label>
              <select name="relationship" value={form.relationship} onChange={change} required>
                {RELATIONSHIPS.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
              </select>
            </div>
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
        </div>

        <div className="upage-form-section">
          <h2>Birth Details</h2>
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

        <div className="upage-form-section">
          <h2>Horoscope Details <span className="upage-optional">(optional)</span></h2>
          <p className="upage-section-note">Leave blank to auto-calculate from birth details, or enter manually.</p>
          <div className="upage-field-row">
            <div className="upage-field">
              <label>Rasi</label>
              <select name="rasi" value={form.rasi} onChange={change}>
                <option value="">Select...</option>
                {RASIS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="upage-field">
              <label>Nakshatra</label>
              <select name="nakshatra" value={form.nakshatra} onChange={change}>
                <option value="">Select...</option>
                {NAKSHATRAS.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
          <div className="upage-field-row">
            <div className="upage-field">
              <label>Pada</label>
              <select name="pada" value={form.pada} onChange={change}>
                <option value="">Select...</option>
                {[1,2,3,4].map(p => <option key={p} value={String(p)}>{p}</option>)}
              </select>
            </div>
            <div className="upage-field">
              <label>Lagna</label>
              <select name="lagna" value={form.lagna} onChange={change}>
                <option value="">Select...</option>
                {RASIS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="upage-form-actions">
          <button type="submit" className="upage-save-btn" disabled={saving}>
            {saving ? 'Saving...' : isEdit ? 'Update Profile' : 'Create Profile'}
          </button>
          <button type="button" className="upage-cancel-btn" onClick={() => navigate('/user/profile')}>
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}
