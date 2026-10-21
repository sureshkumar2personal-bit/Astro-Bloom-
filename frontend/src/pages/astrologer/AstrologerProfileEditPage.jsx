import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Shell from '../../components/common/Shell';
import Field from '../../components/common/Field';
import Notice from '../../components/common/Notice';
import ProfileCompletenessCard from '../../components/astrologers/ProfileCompletenessCard';
import CertificateUploader from '../../components/astrologers/CertificateUploader';
import { useProfileForm } from '../../hooks/useProfileForm';
import { ALL_SPECIALIZATIONS, ALL_LANGUAGES } from '../../utils/constants';
import { apiAuthPost } from '../../api/client';

export default function AstrologerProfileEditPage() {
  const nav = useNavigate();
  const {
    form, change, toggleLang, toggleSpec, certs, completeness,
    profileStatus, msg, loading, saving, save, handleCertUpload
  } = useProfileForm();
  const [photoUploading, setPhotoUploading] = useState(false);
  const [svcForm, setSvcForm] = useState({
    questionAvailable: false, appointmentAvailable: false,
    emergencyAvailable: false, liveAvailable: false
  });
  const [svcMsg, setSvcMsg] = useState('');

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoUploading(true);
    try {
      const fd = new FormData();
      fd.append('photo', file);
      await apiAuthPost('/astrologer/profile/photo', fd);
      alert('Photo uploaded successfully.');
    } catch (err) { alert(err.message); }
    finally { setPhotoUploading(false); }
  };

  if (loading) return <Shell><section className="profile-edit-page"><p className="eyebrow">LOADING YOUR PROFILE</p></section></Shell>;

  return (
    <Shell>
      <section className="profile-edit-page">
        <div className="edit-header">
          <div>
            <p className="eyebrow">PROFILE MANAGEMENT</p>
            <h1>Edit your profile</h1>
            <p>Complete your profile to attract more seekers.</p>
          </div>
          <div className="edit-header-actions">
            <span className={`status-badge status-${profileStatus}`}>
              {profileStatus === 'published' ? 'Published' : profileStatus === 'under_review' ? 'Under Review' : 'Draft'}
            </span>
            <button className="btn-preview" onClick={() => nav('/astrologer/profile/preview')}>Preview as User →</button>
          </div>
        </div>

        <ProfileCompletenessCard completeness={completeness} />

        <div className="edit-layout">
          <div className="edit-form">
            {/* Photo Upload */}
            <div className="edit-section">
              <h2>Profile Photo</h2>
              <div className="edit-photo-row">
                <div className="edit-photo-placeholder">✦</div>
                <label className="edit-photo-upload">
                  {photoUploading ? 'Uploading...' : 'Change Photo'}
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} hidden disabled={photoUploading} />
                </label>
              </div>
            </div>

            <div className="edit-section">
              <h2>Basic Information</h2>
              <div className="split">
                <Field label="Display Name" name="displayName" value={form.displayName} onChange={change} required />
                <Field label="Professional Title" name="professionalTitle" value={form.professionalTitle} onChange={change} required />
              </div>
              <div className="split">
                <Field label="Experience (years)" name="experienceYears" type="number" value={form.experienceYears} onChange={change} />
                <Field label="City" name="city" value={form.city || ''} onChange={change} placeholder="e.g. Chennai" />
              </div>
            </div>

            <div className="edit-section">
              <h2>Bio</h2>
              <label className="field">
                <span>Short Bio</span>
                <textarea name="shortBio" value={form.shortBio} onChange={change} rows={3} placeholder="A brief introduction to your practice..." />
              </label>
              <label className="field">
                <span>Long Bio / About Me</span>
                <textarea name="longBio" value={form.longBio} onChange={change} rows={6} placeholder="Tell seekers about your experience, approach, and what makes you unique..." />
              </label>
            </div>

            <div className="edit-section">
              <h2>Consultation Style</h2>
              <Field name="consultationStyle" value={form.consultationStyle} onChange={change} placeholder="e.g., Traditional Parasari with practical remedies" />
            </div>

            <div className="edit-section">
              <h2>Languages</h2>
              <div className="chips">
                {ALL_LANGUAGES.map(l => (
                  <button type="button" key={l} className={form.languages.includes(l) ? 'selected' : ''} onClick={() => toggleLang(l)}>
                    {form.languages.includes(l) ? '✓ ' : ''}{l}
                  </button>
                ))}
              </div>
            </div>

            <div className="edit-section">
              <h2>Specializations</h2>
              <div className="chips">
                {ALL_SPECIALIZATIONS.map(s => (
                  <button type="button" key={s} className={form.specializations.includes(s) ? 'selected' : ''} onClick={() => toggleSpec(s)}>
                    {form.specializations.includes(s) ? '✓ ' : ''}{s}
                  </button>
                ))}
              </div>
            </div>

            <CertificateUploader certificates={certs} onUpload={handleCertUpload} />

            <Notice message={msg} />

            <div className="edit-actions">
              <button className="btn-save" disabled={saving} onClick={() => save(true)}>Save Draft</button>
              <button className="btn-submit" disabled={saving} onClick={() => save(false)}>Submit for Review</button>
              <button className="btn-preview" onClick={() => nav('/astrologer/profile/preview')}>Preview as User →</button>
            </div>
          </div>
        </div>
      </section>
    </Shell>
  );
}
