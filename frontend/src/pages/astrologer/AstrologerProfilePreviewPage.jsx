import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAstrologerProfileFull } from '../../api/userProfileApi';
import AstrologerLayout from '../../components/astrologer/AstrologerLayout';

export default function AstrologerProfilePreviewPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAstrologerProfileFull()
      .then(r => setProfile(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <AstrologerLayout><section className="upage"><p className="upage-loading">Loading preview...</p></section></AstrologerLayout>;
  if (!profile) return <AstrologerLayout><section className="upage"><p>Failed to load profile.</p></section></AstrologerLayout>;

  const p = profile;

  return (
    <AstrologerLayout>
      <section className="upage">
      <div className="upage-header">
        <div>
          <p className="upage-eyebrow">PROFILE PREVIEW</p>
          <h1>How users see your profile</h1>
        </div>
        <button className="upage-edit-btn" onClick={() => navigate('/astrologer/profile/edit')}>Back to Editor</button>
      </div>

      <div className="upage-preview-banner">
        <span>This is a preview. Changes you save in the editor will appear here.</span>
      </div>

      <div className="upage-preview-card">
        <div className="upage-preview-header">
          <div className="upage-preview-avatar">{p.displayName?.charAt(0) || '✦'}</div>
          <div className="upage-preview-info">
            <div className="upage-preview-name-row">
              <h2>{p.displayName}</h2>
              {p.verificationStatus === 'approved' && <span className="upage-verified-badge">✓ Verified</span>}
            </div>
            <p className="upage-preview-title">{p.professionalTitle}</p>
            <div className="upage-preview-meta">
              <span>{p.experienceYears} years experience</span>
              {p.city && <><span className="upage-sep">·</span><span>{p.city}</span></>}
            </div>
          </div>
        </div>

        {p.shortBio && (
          <div className="upage-preview-section">
            <h3>About</h3>
            <p>{p.shortBio}</p>
            {p.longBio && <p className="upage-preview-longbio">{p.longBio}</p>}
          </div>
        )}

        {p.consultationStyle && (
          <div className="upage-preview-section">
            <h3>Consultation Style</h3>
            <p>{p.consultationStyle}</p>
          </div>
        )}

        {p.languages?.length > 0 && (
          <div className="upage-preview-section">
            <h3>Languages</h3>
            <div className="upage-preview-tags">
              {p.languages.map((l, i) => <span key={i} className="upage-preview-tag">{typeof l === 'string' ? l : l.language}</span>)}
            </div>
          </div>
        )}

        {p.specializations?.length > 0 && (
          <div className="upage-preview-section">
            <h3>Specializations</h3>
            <div className="upage-preview-tags">
              {p.specializations.map((s, i) => <span key={i} className="upage-preview-tag upage-spec-tag">{s}</span>)}
            </div>
          </div>
        )}

        {p.certificates?.length > 0 && (
          <div className="upage-preview-section">
            <h3>Certificates</h3>
            {p.certificates.map((c, i) => (
              <div key={i} className="upage-preview-cert">
                <span className="upage-cert-icon">📜</span>
                <span>{c.certificateName || c.certificate_name}</span>
                <span className={`upage-cert-status upage-cert-${c.verificationStatus || c.verification_status}`}>
                  {c.verificationStatus || c.verification_status}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="upage-preview-services">
          <h3>Available Services</h3>
          <div className="upage-preview-service-grid">
            {p.serviceAvailability?.questionAvailable && <div className="upage-service-on">Text Questions</div>}
            {p.serviceAvailability?.appointmentAvailable && <div className="upage-service-on">Appointments</div>}
            {p.serviceAvailability?.emergencyAvailable && <div className="upage-service-on">Emergency Calls</div>}
            {p.serviceAvailability?.liveAvailable && <div className="upage-service-on">Live Streaming</div>}
            {p.serviceAvailability?.subscriptionAvailable && <div className="upage-service-on">Subscriptions</div>}
          </div>
        </div>
      </div>
    </section>
    </AstrologerLayout>
  );
}
