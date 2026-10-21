import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getUserDisputes } from '../../api/disputeApi';

const STATUS_LABELS = {
  open: 'Open', astrologer_reviewing: 'Under Review', astrologer_responded: 'Astrologer Responded',
  user_reply: 'Your Reply', escalated: 'Escalated', admin_reviewing: 'Admin Reviewing',
  resolved: 'Resolved', refunded: 'Refunded', rejected: 'Rejected', closed: 'Closed'
};
const STATUS_COLORS = {
  open: '#db9a40', astrologer_reviewing: '#3498db', astrologer_responded: '#27ae60',
  user_reply: '#8e44ad', escalated: '#e74c3c', admin_reviewing: '#e67e22',
  resolved: '#27ae60', refunded: '#3498db', rejected: '#c0392b', closed: '#817987'
};

export default function UserDisputeListPage() {
  const [data, setData] = useState({ disputes: [], summary: {} });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter) params.status = filter;
      const res = await getUserDisputes(params);
      setData(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filter]);

  const s = data.summary || {};
  const disputes = data.disputes || [];

  return (
    <section className="disp-page">
      <div className="disp-header">
        <div>
          <h1>My Disputes</h1>
          <p className="disp-subtitle">Track and manage your dispute requests</p>
        </div>
      </div>

      <div className="disp-summary-row">
        {Object.entries(STATUS_LABELS).map(([key, label]) => (
          s[key] ? (
            <button key={key} className={`disp-summary-chip ${filter === key ? 'active' : ''}`}
              style={{ borderColor: STATUS_COLORS[key] }}
              onClick={() => setFilter(filter === key ? '' : key)}>
              {label} <span>{s[key]}</span>
            </button>
          ) : null
        ))}
        {filter && <button className="disp-clear-btn" onClick={() => setFilter('')}>Clear</button>}
      </div>

      {loading ? (
        <div className="disp-loading">Loading disputes...</div>
      ) : disputes.length === 0 ? (
        <div className="disp-empty">
          <p>No disputes found.</p>
          <Link to="/user/questions" className="btn-purple">View My Questions</Link>
        </div>
      ) : (
        <div className="disp-list">
          {disputes.map(d => (
            <Link key={d.id} to={`/user/disputes/${d.id}`} className="disp-card">
              <div className="disp-card-top">
                <span className="disp-card-code">{d.question_code || 'Q-?'}</span>
                <span className="disp-status-badge" style={{ background: STATUS_COLORS[d.status] || '#817987' }}>
                  {STATUS_LABELS[d.status] || d.status}
                </span>
              </div>
              <h3 className="disp-card-title">{d.question_title || 'Untitled Question'}</h3>
              <p className="disp-card-reason">Reason: {d.reason}</p>
              <div className="disp-card-meta">
                <span>Astrologer: {d.astrologer_name}</span>
                <span>{new Date(d.created_at).toLocaleDateString()}</span>
              </div>
              {d.resolution && (
                <div className="disp-card-resolution">
                  Resolution: <strong>{d.resolution}</strong>
                  {d.refund_amount > 0 && <> — Refund: ₹{d.refund_amount}</>}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
