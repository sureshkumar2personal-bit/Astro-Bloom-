import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getFreeInformationContents, getContentDetail, markContentViewed } from '../../api/contentApi';
import Shell from '../../components/common/Shell';

const CATEGORIES = ['Daily Rasi Palan', 'Weekly Rasi Palan', 'Monthly Rasi Palan', 'Sani Peyarchi', 'Guru Peyarchi', 'Rahu-Ketu Peyarchi', 'Festival Guidance', 'Transit Updates', 'Astrology Learning', ''];

export default function UserFreeInformationPage() {
  const [items, setItems] = useState([]);
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (category) params.category = category;
    getFreeInformationContents(params).then(r => setItems(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [category]);

  return (<Shell>
    <section className="page">
      <div className="page-header-block">
        <p className="eyebrow">FREE INFORMATION</p>
        <h1>Free Predictions & Astrology Content</h1>
        <p className="subtitle">Daily, weekly, monthly predictions and transit updates — all free to read</p>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
        <button className="btn-sm" onClick={() => setCategory('')} style={!category ? { background: 'var(--purple)', color: '#fff' } : {}}>All</button>
        {CATEGORIES.filter(Boolean).map(c => (
          <button key={c} className="btn-sm" onClick={() => setCategory(c)} style={category === c ? { background: 'var(--purple)', color: '#fff' } : {}}>{c}</button>
        ))}
      </div>
      {loading ? <p style={{ color: '#6e6573' }}>Loading...</p> : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#928994' }}>
          <p style={{ fontSize: 40, margin: 0 }}>📖</p>
          <p>No free content available yet. Check back soon!</p>
        </div>
      ) : (
        <div className="fc-grid">
          {items.map(c => (
            <Link to={`/user/contents/${c.id}`} key={c.id} className="fc-card">
              <span className="fc-icon">📄</span>
              <h3>{c.title}</h3>
              {c.short_description && <p>{c.short_description}</p>}
              <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#928994', marginTop: 'auto' }}>
                <span>{c.content_type.replace(/_/g, ' ')}</span>
                <span>{c.language}</span>
                {c.astrology_category && <span>{c.astrology_category}</span>}
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
  </Shell>);
}
