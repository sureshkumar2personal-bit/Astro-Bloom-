import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAtonementDashboard, getAstrologerAtonements } from '../../api/atonementApi';
import AstrologerLayout from '../../components/astrologer/AstrologerLayout';

const STATUSES = ['prescribed', 'notified', 'pending_user_action', 'payment_pending', 'paid', 'in_progress', 'proof_uploaded', 'completed', 'cancelled', 'expired', 'disputed', 'refunded'];
const REMEDY_TYPES = ['mantra_chanting', 'temple_visit', 'donation', 'fasting', 'pooja', 'homam', 'digital_atonement', 'festival_pariharam', 'dosham_remedy', 'sani_pariharam', 'rahu_ketu_pariharam', 'sevvai_remedy', 'marriage_delay_remedy', 'career_obstacle_remedy', 'family_peace_remedy'];

const STATUS_COLORS = {
  prescribed: '#928994', notified: '#5c3b8b', pending_user_action: '#db9a40', payment_pending: '#e67e22',
  paid: '#27ae60', in_progress: '#3498db', proof_uploaded: '#8e44ad', completed: '#27ae60',
  cancelled: '#999', expired: '#c0392b', disputed: '#e74c3c', refunded: '#e67e22'
};

function formatLabel(s) { return (s || '').replace(/_/g, ' '); }

export default function AtonementDashboardPage() {
  const [dash, setDash] = useState(null);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ status: '', remedyType: '', search: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAtonementDashboard().then(r => setDash(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = { page, limit: 15 };
    if (filters.status) params.status = filters.status;
    if (filters.remedyType) params.remedyType = filters.remedyType;
    if (filters.search) params.search = filters.search;
    getAstrologerAtonements(params)
      .then(r => { setItems(r.data.items); setTotal(r.data.total); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, filters]);

  return (
    <AstrologerLayout>
      <section className="page">
        <div className="page-header-block">
          <p className="eyebrow">ATONEMENT DASHBOARD</p>
          <h1>Remedy & Pariharam Dashboard</h1>
        </div>

        {dash && (
          <div className="atonement-summary-row">
            <div className="atonement-summary-card"><small>Total Prescribed</small><b>{dash.total}</b></div>
            <div className="atonement-summary-card" style={{ borderColor: '#db9a40' }}><small>Pending</small><b style={{ color: '#db9a40' }}>{dash.pending}</b></div>
            <div className="atonement-summary-card" style={{ borderColor: '#27ae60' }}><small>Completed</small><b style={{ color: '#27ae60' }}>{dash.completed}</b></div>
            <div className="atonement-summary-card" style={{ borderColor: '#5c3b8b' }}><small>Paid</small><b style={{ color: '#5c3b8b' }}>{dash.paid}</b></div>
            <div className="atonement-summary-card" style={{ borderColor: '#e74c3c' }}><small>Disputed</small><b style={{ color: '#e74c3c' }}>{dash.disputed}</b></div>
            <div className="atonement-summary-card" style={{ borderColor: '#27ae60' }}><small>Revenue</small><b style={{ color: '#27ae60' }}>₹{Number(dash.revenue).toLocaleString()}</b></div>
          </div>
        )}

        <div className="atonement-action-bar">
          <Link to="/astrologer/atonements/new" className="btn-primary">+ Prescribe Remedy</Link>
          <Link to="/astrologer/atonements/revenue" className="btn-secondary">Revenue</Link>
          <Link to="/astrologer/atonements/discount-codes" className="btn-secondary">Discount Codes</Link>
        </div>

        <div className="atonement-filters">
          <select value={filters.status} onChange={e => { setFilters({ ...filters, status: e.target.value }); setPage(1); }}>
            <option value="">All Status</option>
            {STATUSES.map(s => <option key={s} value={s}>{formatLabel(s)}</option>)}
          </select>
          <select value={filters.remedyType} onChange={e => { setFilters({ ...filters, remedyType: e.target.value }); setPage(1); }}>
            <option value="">All Types</option>
            {REMEDY_TYPES.map(r => <option key={r} value={r}>{formatLabel(r)}</option>)}
          </select>
          <input placeholder="Search user or title..." value={filters.search} onChange={e => { setFilters({ ...filters, search: e.target.value }); setPage(1); }} />
        </div>

        {loading ? <p style={{ color: '#6e6573', padding: 20 }}>Loading...</p> : items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#928994' }}>
            <p style={{ fontSize: 40, margin: 0 }}>📋</p>
            <p>No remedies prescribed yet.</p>
          </div>
        ) : (
          <div className="atonement-list">
            {items.map(a => (
              <Link to={`/astrologer/atonements/${a.id}`} key={a.id} className="atonement-card">
                <div className="atonement-card-header">
                  <div>
                    <h3>{a.title}</h3>
                    <small style={{ color: '#6e6573' }}>User: {a.user_name || 'Unknown'} · {formatLabel(a.source_type)}</small>
                  </div>
                  <span className="atonement-status-badge" style={{ background: STATUS_COLORS[a.status] || '#999' }}>{formatLabel(a.status)}</span>
                </div>
                <div className="atonement-card-meta">
                  <span className="atonement-type-tag">{formatLabel(a.remedy_type)}</span>
                  {a.is_paid && <span className="atonement-price-tag">₹{Number(a.price).toFixed(0)}</span>}
                  {!a.is_paid && <span className="atonement-free-tag">Free</span>}
                  <small style={{ color: '#928994' }}>{new Date(a.created_at).toLocaleDateString()}</small>
                </div>
              </Link>
            ))}
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
