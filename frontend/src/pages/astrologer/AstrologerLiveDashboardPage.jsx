import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Shell from '../../components/common/Shell';
import { getAstrologerLiveSessions, cancelLiveSession } from '../../api/astrologerLiveApi';

export default function AstrologerLiveDashboardPage() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const params = {};
    if (filter !== 'all') params.status = filter;
    getAstrologerLiveSessions(params)
      .then(r => setSessions(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filter]);

  async function handleCancel(id) {
    if (!confirm('Cancel this live session? Paid users will be refunded.')) return;
    await cancelLiveSession(id);
    setSessions(prev => prev.map(s => s.id === id ? { ...s, status: 'cancelled' } : s));
  }

  const statusColor = (status) => {
    const colors = { draft: '#817987', scheduled: '#c4860a', live: '#b44040', ended: '#3a7a3a', cancelled: '#9e9599' };
    return colors[status] || '#817987';
  };

  if (loading) return <Shell><section className="live-dashboard-page"><h1>Live Sessions</h1><p>Loading...</p></section></Shell>;

  return (
    <Shell>
      <section className="live-dashboard-page">
        <div className="live-dash-header">
          <div>
            <p className="eyebrow">LIVE STREAMING</p>
            <h1>Live Sessions</h1>
          </div>
          <Link className="btn-submit" to="/astrologer/live/create">+ Create Live Session</Link>
        </div>

        <div className="live-filters">
          <div className="filter-pills">
            {[{ k: 'all', l: 'All' }, { k: 'scheduled', l: 'Scheduled' }, { k: 'live', l: 'Live' }, { k: 'ended', l: 'Ended' }, { k: 'cancelled', l: 'Cancelled' }].map(f => (
              <button key={f.k} className={filter === f.k ? 'active' : ''} onClick={() => setFilter(f.k)}>{f.l}</button>
            ))}
          </div>
        </div>

        <div className="live-sessions-list">
          {sessions.map(s => (
            <div key={s.id} className="live-dash-card">
              <div className="ldc-top">
                <span className="ldc-status" style={{ color: statusColor(s.status) }}>● {s.status}</span>
                <span className="ldc-time">{new Date(s.scheduledStartAt).toLocaleString()}</span>
              </div>
              <h3>{s.title}</h3>
              <div className="ldc-meta">
                <span>{s.topic}</span>
                <span>{s.language}</span>
                <span>{s.audienceType.replace('_', ' ')}</span>
                {s.entryType === 'paid' && <span>₹{s.entryPrice}</span>}
                {s.questionMode !== 'no_questions' && <span>Q: {s.questionMode === 'paid_question_slots' ? `₹${s.questionPrice}` : 'Free'}</span>}
              </div>
              <div className="ldc-actions">
                {s.status === 'scheduled' && (
                  <>
                    <Link className="btn-view" to={`/astrologer/live/${s.id}/room`}>Start Live →</Link>
                    <button className="subs-cancel" onClick={() => handleCancel(s.id)}>Cancel</button>
                  </>
                )}
                {s.status === 'live' && (
                  <Link className="btn-submit" to={`/astrologer/live/${s.id}/room`}>Go to Room →</Link>
                )}
                {s.status === 'ended' && (
                  <span className="ldc-ended">Ended {s.actualEndAt ? new Date(s.actualEndAt).toLocaleString() : ''}</span>
                )}
              </div>
            </div>
          ))}
          {sessions.length === 0 && <p className="subs-empty">No live sessions found.</p>}
        </div>
      </section>
    </Shell>
  );
}
