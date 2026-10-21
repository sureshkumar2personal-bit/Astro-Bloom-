import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getContentDetail, markContentViewed } from '../../api/contentApi';
import Shell from '../../components/common/Shell';

export default function UserContentDetailPage() {
  const { contentId } = useParams();
  const navigate = useNavigate();
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getContentDetail(contentId)
      .then(r => { setContent(r.data); markContentViewed(contentId).catch(() => {}); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [contentId]);

  if (loading) return <Shell><section className="page"><p style={{ color: '#6e6573', padding: 40 }}>Loading...</p></section></Shell>;
  if (error) return <Shell><section className="page"><div className="fc-error" style={{ margin: 40 }}>{error}</div><Link to="/user/contents/free-information">← Back</Link></section></Shell>;
  if (!content) return null;

  return (<Shell>
    <section className="page">
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <button onClick={() => navigate(-1)} className="btn-secondary" style={{ marginBottom: 20 }}>← Back</button>

        <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 14, padding: 32 }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <span className="fc-badge" style={{ background: 'var(--purple)' }}>{content.content_type.replace(/_/g, ' ')}</span>
            {content.astrology_category && <span className="fc-badge" style={{ background: 'var(--gold)' }}>{content.astrology_category}</span>}
            <span className="fc-badge" style={{ background: '#e8e4de' }}>{content.language}</span>
          </div>

          <h1 style={{ fontFamily: "'Playfair Display'", fontSize: 28, margin: '0 0 12px' }}>{content.title}</h1>

          <div style={{ display: 'flex', gap: 16, fontSize: 13, color: '#6e6573', marginBottom: 24 }}>
            <span>By <strong>{content.creator_name || 'Platform'}</strong></span>
            {content.published_at && <span>{new Date(content.published_at).toLocaleDateString()}</span>}
            {content.view_count > 0 && <span>{content.view_count} views</span>}
          </div>

          {content.short_description && (
            <p style={{ fontSize: 16, color: '#6e6573', lineHeight: 1.7, marginBottom: 24, fontStyle: 'italic', borderLeft: '3px solid var(--gold)', paddingLeft: 16 }}>
              {content.short_description}
            </p>
          )}

          <div style={{ fontSize: 15, lineHeight: 1.85, color: 'var(--ink)', whiteSpace: 'pre-wrap' }}>
            {content.body}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 24, flexWrap: 'wrap' }}>
          <Link to="/user/contents/free-information" className="btn-secondary">More Free Content</Link>
          <Link to="/user/ai-chat" className="btn-secondary">Ask AI About This</Link>
          <Link to="/user/astrologers" className="btn-secondary">Consult Astrologer</Link>
        </div>
      </div>
    </section>
  </Shell>);
}
