import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getMyPerksContents } from '../../api/contentApi';

export default function UserPerksPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyPerksContents().then(r => setItems(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <section className="page">
      <div className="page-header-block">
        <p className="eyebrow">SUBSCRIBER PERKS</p>
        <h1>My Perks & Benefits</h1>
        <p className="subtitle">Content and benefits available from your active subscriptions</p>
      </div>
      {loading ? <p style={{ color: '#6e6573' }}>Loading...</p> : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#928994' }}>
          <p style={{ fontSize: 40, margin: 0 }}>🎁</p>
          <p>No subscriber perks available yet.</p>
          <p style={{ fontSize: 13 }}>Subscribe to an astrologer to unlock exclusive content and monthly predictions.</p>
          <Link to="/user/astrologers" className="btn-primary" style={{ display: 'inline-block', marginTop: 16 }}>Explore Astrologers</Link>
        </div>
      ) : (
        <div className="fc-grid">
          {items.map(c => (
            <Link to={`/user/contents/${c.id}`} key={c.id} className="fc-card">
              <span className="fc-icon">🎁</span>
              <h3>{c.title}</h3>
              {c.short_description && <p>{c.short_description}</p>}
              <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#928994', marginTop: 'auto' }}>
                <span>{c.content_type.replace(/_/g, ' ')}</span>
                <span>{c.audience_type.replace(/_/g, ' ')}</span>
                <span>{c.language}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                <small style={{ color: '#6e6573' }}>By {c.creator_name || 'Platform'}</small>
                <span className="fc-arrow">→</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
