import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAstrologerContents, publishContent, unpublishContent, deleteContent } from '../../api/contentApi';
import AstrologerLayout from '../../components/astrologer/AstrologerLayout';

const STATUSES = ['draft', 'scheduled', 'published', 'unpublished', 'rejected'];
const CONTENT_TYPES = ['public_prediction', 'follower_update', 'subscriber_perk', 'monthly_prediction', 'festival_content', 'transit_content', 'live_announcement', 'atonement_notification', 'educational_content', 'selected_user_message'];
const AUDIENCES = ['public', 'followers', 'all_subscribers', 'silver_subscribers', 'gold_subscribers', 'platinum_subscribers', 'selected_users'];

function statusBadge(s) {
  const colors = { draft: '#928994', scheduled: '#db9a40', published: '#27ae60', unpublished: '#e67e22', rejected: '#c0392b', deleted: '#999' };
  return <span className="fc-badge" style={{ background: colors[s] || '#999' }}>{s}</span>;
}

export default function AstrologerContentListPage() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ status: '', contentType: '', audienceType: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    const params = { page, limit: 15 };
    if (filters.status) params.status = filters.status;
    if (filters.contentType) params.contentType = filters.contentType;
    if (filters.audienceType) params.audienceType = filters.audienceType;
    getAstrologerContents(params).then(r => { setItems(r.data.items); setTotal(r.data.total); }).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, [page, filters]);

  async function handleAction(action, id) {
    try {
      if (action === 'publish') await publishContent(id, { publishNow: true, notifyUsers: true });
      else if (action === 'unpublish') await unpublishContent(id);
      else if (action === 'delete') await deleteContent(id);
      setItems(prev => prev.map(i => i.id === id ? { ...i, status: action === 'delete' ? 'deleted' : action === 'publish' ? 'published' : 'unpublished' } : i));
    } catch (e) { setError(e.message); }
  }

  return (
    <AstrologerLayout>
      <section className="page">
        <div className="page-header-block">
          <p className="eyebrow">CONTENT MANAGEMENT</p>
          <h1>My Content</h1>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: '#6e6573' }}>{total} items</span>
            <Link to="/astrologer/contents/create" className="btn-primary" style={{ marginLeft: 'auto' }}>+ Create Content</Link>
          </div>
        </div>
        <div className="fc-row" style={{ gap: 10, marginBottom: 20 }}>
          <select value={filters.status} onChange={e => { setFilters({ ...filters, status: e.target.value }); setPage(1); }}>
            <option value="">All Status</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filters.contentType} onChange={e => { setFilters({ ...filters, contentType: e.target.value }); setPage(1); }}>
            <option value="">All Types</option>
            {CONTENT_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
          </select>
          <select value={filters.audienceType} onChange={e => { setFilters({ ...filters, audienceType: e.target.value }); setPage(1); }}>
            <option value="">All Audience</option>
            {AUDIENCES.map(a => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
        {error && <p className="fc-error">{error}</p>}
        {loading ? <p style={{ color: '#6e6573' }}>Loading...</p> : (
          <div className="fc-table-wrap">
            <table className="fc-table">
              <thead><tr><th>Title</th><th>Type</th><th>Audience</th><th>Status</th><th>Views</th><th>Created</th><th>Actions</th></tr></thead>
              <tbody>
                {items.map(c => (
                  <tr key={c.id}>
                    <td style={{ maxWidth: 250 }}><strong>{c.title}</strong><br /><small style={{ color: '#928994' }}>{c.astrology_category || c.language}</small></td>
                    <td><small>{c.content_type.replace(/_/g, ' ')}</small></td>
                    <td><small>{c.audience_type.replace(/_/g, ' ')}</small></td>
                    <td>{statusBadge(c.status)}</td>
                    <td>{c.view_count}</td>
                    <td><small>{new Date(c.created_at).toLocaleDateString()}</small></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {c.status === 'draft' && <Link to={`/astrologer/contents/edit/${c.id}`} style={{ fontSize: 12 }}>Edit</Link>}
                        {c.status === 'draft' && <button className="btn-sm" onClick={() => handleAction('publish', c.id)}>Publish</button>}
                        {c.status === 'published' && <button className="btn-sm btn-warn" onClick={() => handleAction('unpublish', c.id)}>Unpublish</button>}
                        {['draft', 'unpublished', 'rejected'].includes(c.status) && <button className="btn-sm btn-danger" onClick={() => handleAction('delete', c.id)}>Delete</button>}
                        <Link to={`/astrologer/contents/${c.id}/analytics`} style={{ fontSize: 12 }}>Analytics</Link>
                      </div>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#928994' }}>No content found</td></tr>}
              </tbody>
            </table>
          </div>
        )}
        {total > 15 && (
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 20 }}>
            <button className="btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
            <span style={{ fontSize: 13, padding: '4px 12px' }}>Page {page}</span>
            <button className="btn-sm" disabled={items.length < 15} onClick={() => setPage(p => p + 1)}>Next →</button>
          </div>
        )}
      </section>
    </AstrologerLayout>
  );
}
