import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getMyFullProfile, setDefaultAstrologyProfile, deleteAstrologyProfile } from '../../api/userProfileApi';

export default function UserProfilePage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getMyFullProfile()
      .then(r => setProfile(r.data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <section className="upage"><p className="upage-loading">Loading your profile...</p></section>;
  if (error) return <section className="upage"><div className="upage-error">{error}</div></section>;
  if (!profile) return null;

  const p = profile;
  const aps = p.astrologyProfiles || [];

  return (
    <section className="upage">
      <div className="upage-header">
        <div>
          <p className="upage-eyebrow">MY PROFILE</p>
          <h1>Your Profile</h1>
        </div>
        <Link to="/user/profile/edit" className="upage-edit-btn">Edit Profile</Link>
      </div>

      <div className="upage-grid">
        <div className="upage-card upage-basic">
          <div className="upage-avatar">{p.fullName?.charAt(0) || '✦'}</div>
          <div className="upage-basic-info">
            <h2>{p.fullName}</h2>
            <p className="upage-meta">{p.mobile}{p.email ? ` · ${p.email}` : ''}</p>
            <div className="upage-tags">
              {p.profile?.gender && <span className="upage-tag">{p.profile.gender}</span>}
              {p.preferredLanguage && <span className="upage-tag">{p.preferredLanguage}</span>}
              <span className="upage-tag upage-tag-active">{p.status}</span>
            </div>
          </div>
        </div>

        {p.profile && (p.profile.dateOfBirth || p.profile.birthTime || p.profile.birthPlace) && (
          <div className="upage-card upage-birth">
            <h3>Birth Details</h3>
            <div className="upage-detail-grid">
              {p.profile.dateOfBirth && <div><span>Date of Birth</span><b>{p.profile.dateOfBirth}</b></div>}
              {p.profile.birthTime && <div><span>Birth Time</span><b>{p.profile.birthTime}</b></div>}
              {p.profile.birthPlace && <div><span>Birth Place</span><b>{p.profile.birthPlace}</b></div>}
            </div>
          </div>
        )}
      </div>

      <div className="upage-section">
        <div className="upage-section-header">
          <h2>Astrology / Family Profiles</h2>
          <p className="upage-section-desc">Saved horoscope profiles for self and family members. Use these when asking questions, booking appointments, or chatting with AI.</p>
          <Link to="/user/profile/family/add" className="upage-add-btn">+ Add Family Member</Link>
        </div>

        {aps.length === 0 ? (
          <div className="upage-empty">
            <p>No astrology profiles yet.</p>
            <p>Create your first profile with birth details to get personalized insights.</p>
            <Link to="/user/profile/family/add" className="upage-add-btn">Create Your Profile</Link>
          </div>
        ) : (
          <div className="upage-profile-list">
            {aps.map(ap => (
              <div key={ap.id} className={`upage-profile-card ${ap.isDefault ? 'upage-default' : ''}`}>
                <div className="upage-pc-header">
                  <div>
                    <h3>{ap.profileName}</h3>
                    <span className="upage-relationship">{ap.relationship}</span>
                  </div>
                  {ap.isDefault && <span className="upage-default-badge">★ Default</span>}
                </div>
                <div className="upage-pc-details">
                  {ap.gender && <span>{ap.gender}</span>}
                  {ap.dateOfBirth && <span>DOB: {ap.dateOfBirth}</span>}
                  {ap.birthTime && <span>Time: {ap.birthTime}</span>}
                  {ap.birthPlace && <span>Place: {ap.birthPlace}</span>}
                </div>
                {(ap.rasi || ap.nakshatra || ap.pada || ap.lagna) && (
                  <div className="upage-pc-horoscope">
                    {ap.rasi && <div><span>Rasi</span><b>{ap.rasi}</b></div>}
                    {ap.nakshatra && <div><span>Nakshatra</span><b>{ap.nakshatra}</b></div>}
                    {ap.pada && <div><span>Pada</span><b>{ap.pada}</b></div>}
                    {ap.lagna && <div><span>Lagna</span><b>{ap.lagna}</b></div>}
                  </div>
                )}
                <div className="upage-pc-actions">
                  <Link to={`/user/profile/family/${ap.id}/edit`} className="upage-pc-btn">Edit</Link>
                  {!ap.isDefault && (
                    <button className="upage-pc-btn upage-pc-default" onClick={async () => {
                      try {
                        await setDefaultAstrologyProfile(ap.id);
                        setProfile(prev => ({
                          ...prev,
                          astrologyProfiles: prev.astrologyProfiles.map(a => ({ ...a, isDefault: a.id === ap.id }))
                        }));
                      } catch (e) { alert(e.message); }
                    }}>Set Default</button>
                  )}
                  <Link to={`/user/free-calculations/birth-chart?profileId=${ap.id}`} className="upage-pc-btn">Birth Chart</Link>
                  <button className="upage-pc-btn upage-pc-delete" onClick={async () => {
                    if (!confirm(`Delete ${ap.profileName}'s profile?`)) return;
                    try {
                      await deleteAstrologyProfile(ap.id);
                      setProfile(prev => ({ ...prev, astrologyProfiles: prev.astrologyProfiles.filter(a => a.id !== ap.id) }));
                    } catch (e) { alert(e.message); }
                  }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
