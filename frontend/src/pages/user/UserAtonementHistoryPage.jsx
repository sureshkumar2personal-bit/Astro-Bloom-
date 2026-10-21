import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getUserAtonements } from '../../api/atonementApi';

const STATUSES = ['prescribed', 'notified', 'pending_user_action', 'payment_pending', 'paid', 'in_progress', 'proof_uploaded', 'completed', 'cancelled', 'expired', 'disputed', 'refunded'];
const REMEDY_TYPES = ['mantra_chanting', 'temple_visit', 'donation', 'fasting', 'pooja', 'homam', 'digital_atonement', 'festival_pariharam', 'dosham_remedy', 'sani_pariharam', 'rahu_ketu_pariharam', 'sevvai_remedy', 'marriage_delay_remedy', 'career_obstacle_remedy', 'family_peace_remedy'];
const SOURCE_TYPES = ['text_question', 'appointment', 'emergency_call', 'live_session', 'ai_chat', 'free_calculation', 'platform_event', 'manual'];

const STATUS_COLORS = {
  prescribed: '#928994', notified: '#5c3b8b', pending_user_action: '#db9a40', payment_pending: '#e67e22',
  paid: '#27ae60', in_progress: '#3498db', proof_uploaded: '#8e44ad', completed: '#27ae60',
  cancelled: '#999', expired: '#c0392b', disputed: '#e74c3c', refunded: '#e67e22'
};

function formatLabel(s) { return s.replace(/_/g, ' '); }

export default function UserAtonementHistoryPage() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ status: '', remedyType: '', sourceType: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = { page, limit: 15 };
    if (filters.status) params.status = filters.status;
    if (filters.remedyType) params.remedyType = filters.remedyType;
    if (filters.sourceType) params.sourceType = filters.sourceType;
    getUserAtonements(params)
      .then(r => { setItems(r.data.items); setTotal(r.data.total); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, filters]);

  const pendingCount = items.filter(i => ['prescribed', 'notified', 'pending_user_action', 'payment_pending'].includes(i.status)).length;
  const completedCount = items.filter(i => i.status === 'completed').length;
  const paidCount = items.filter(i => i.is_paid && i.payment_status === 'paid').length;

  return (
    <section className="page">
      <div className="page-header-block">
        <p className="eyebrow">ATONEMENT / REMEDY</p>
        <h1>My Remedies & Pariharam</h1>
        <p className="subtitle">Track all remedies prescribed by your astrologers</p>
      </div>

      <div className="atonement-summary-row">
        <div className="atonement-summary-card"><small>Total</small><b>{total}</b></div>
        <div className="atonement-summary-card" style={{ borderColor: '#db9a40' }}><small>Pending</small><b style={{ color: '#db9a40' }}>{pendingCount}</b></div>
        <div className="atonement-summary-card" style={{ borderColor: '#27ae60' }}><small>Completed</small><b style={{ color: '#27ae60' }}>{completedCount}</b></div>
        <div className="atonement-summary-card" style={{ borderColor: '#5c3b8b' }}><small>Paid</small><b style={{ color: '#5c3b8b' }}>{paidCount}</b></div>
      </div>

      <div className="atonement-filters">
        <select value={filters.status} onChange={e => { setFilters({ ...filters, status: e.target.value }); setPage(1); }}>
          <option value="">All Status</option>
          {STATUSES.map(s => <option key={s} value={s}>{formatLabel(s)}</option>)}
        </select>
        <select value={filters.remedyType} onChange={e => { setFilters({ ...filters, remedyType: e.target.value }); setPage(1); }}>
          <option value="">All Remedy Types</option>
          {REMEDY_TYPES.map(r => <option key={r} value={r}>{formatLabel(r)}</option>)}
        </select>
        <select value={filters.sourceType} onChange={e => { setFilters({ ...filters, sourceType: e.target.value }); setPage(1); }}>
          <option value="">All Sources</option>
          {SOURCE_TYPES.map(s => <option key={s} value={s}>{formatLabel(s)}</option>)}
        </select>
      </div>

      {loading ? <p style={{ color: '#6e6573', padding: 20 }}>Loading...</p> : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#928994' }}>
          <p style={{ fontSize: 40, margin: 0 }}>🙏</p>
          <p>No remedies prescribed yet.</p>
          <p style={{ fontSize: 13 }}>Remedies from consultations will appear here.</p>
        </div>
      ) : (
        <div className="atonement-list">
          {items.map(a => (
            <Link to={`/user/atonements/${a.id}`} key={a.id} className="atonement-card">
              <div className="atonement-card-header">
                <div>
                  <h3>{a.title}</h3>
                  <small style={{ color: '#6e6573' }}>By {a.astrologer_name || 'Platform'} · {formatLabel(a.source_type)}</small>
                </div>
                <span className="atonement-status-badge" style={{ background: STATUS_COLORS[a.status] || '#999' }}>{formatLabel(a.status)}</span>
              </div>
              <p className="atonement-card-reason">{a.astrology_reason || 'Remedy recommended based on your horoscope analysis.'}</p>
              <div className="atonement-card-meta">
                <span className="atonement-type-tag">{formatLabel(a.remedy_type)}</span>
                {a.is_paid && <span className="atonement-price-tag">₹{Number(a.price).toFixed(0)}</span>}
                {!a.is_paid && <span className="atonement-free-tag">Free</span>}
                {a.expected_completion_date && <span className="atonement-date-tag">Due: {new Date(a.expected_completion_date).toLocaleDateString()}</span>}
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
  );
}
