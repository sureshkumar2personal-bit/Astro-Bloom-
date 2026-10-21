import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Shell from '../../components/common/Shell';
import { getLiveSessions } from '../../api/liveApi';

const TOPICS = ['All', 'Sani Peyarchi', 'Guru Peyarchi', 'Marriage', 'Career', 'Numerology', 'Remedy'];
const STATUSES = ['All', 'live', 'scheduled'];

export default function LiveLobbyPage() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [topicFilter, setTopicFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => {
    const params = {};
    if (topicFilter !== 'All') params.topic = topicFilter;
    if (statusFilter !== 'All') params.status = statusFilter;
    setLoading(true);
    getLiveSessions(params)
      .then(r => setSessions(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [topicFilter, statusFilter]);

  const liveSessions = sessions.filter(s => s.status === 'live');
  const upcomingSessions = sessions.filter(s => s.status === 'scheduled');

  const accessBadge = (s) => {
    if (s.entryType === 'paid') return <span className="live-access-badge paid">Paid ₹{s.entryPrice}</span>;
    if (s.audienceType === 'subscribers_only') return <span className="live-access-badge subscribers">Subscribers</span>;
    if (s.audienceType === 'followers_only') return <span className="live-access-badge followers">Followers</span>;
    return <span className="live-access-badge free">Free</span>;
  };

  return (
    <Shell>
      <section className="live-lobby-page">
        <p className="eyebrow">LIVE SESSIONS</p>
        <h1>Explore Live Sessions</h1>

        <div className="live-filters">
          <div className="filter-row">
            <label>Status</label>
            <div className="filter-pills">
              {STATUSES.map(s => (
                <button key={s} className={statusFilter === s ? 'active' : ''} onClick={() => setStatusFilter(s)}>
                  {s === 'All' ? 'All' : s === 'live' ? '● Live Now' : 'Upcoming'}
                </button>
              ))}
            </div>
          </div>
          <div className="filter-row">
            <label>Topic</label>
            <div className="filter-pills">
              {TOPICS.map(t => (
                <button key={t} className={topicFilter === t ? 'active' : ''} onClick={() => setTopicFilter(t)}>{t}</button>
              ))}
            </div>
          </div>
        </div>

        {loading && <p className="subs-empty">Loading live sessions...</p>}

        {!loading && liveSessions.length > 0 && (
          <div className="live-section">
            <h2>● Live Now</h2>
            <div className="live-grid">
              {liveSessions.map(s => (
                <Link key={s.id} to={`/user/live/${s.id}`} className="live-session-card live-active">
                  <div className="lsc-top">
                    <span className="live-pulse">● LIVE</span>
                    <span className="lsc-viewers">{s.viewerCount} watching</span>
                  </div>
                  <h3>{s.title}</h3>
                  <p className="lsc-astro">{s.astrologerName}</p>
                  <div className="lsc-meta">
                    <span>{s.topic}</span>
                    <span>{s.language}</span>
                    {accessBadge(s)}
                  </div>
                  {s.questionMode !== 'no_questions' && (
                    <div className="lsc-question-info">
                      {s.questionMode === 'paid_question_slots' ? `Live Q: ₹${s.questionPrice}` : 'Free Questions'}
                      {s.maxQuestionSlots > 0 && ` · ${s.maxQuestionSlots - s.soldQuestionSlots} slots left`}
                    </div>
                  )}
                  <button className="btn-view">Join Live →</button>
                </Link>
              ))}
            </div>
          </div>
        )}

        {!loading && upcomingSessions.length > 0 && (
          <div className="live-section">
            <h2>Upcoming</h2>
            <div className="live-grid">
              {upcomingSessions.map(s => (
                <Link key={s.id} to={`/user/live/${s.id}`} className="live-session-card">
                  <div className="lsc-top">
                    <span className="lsc-scheduled">Scheduled</span>
                    <span className="lsc-time">{new Date(s.scheduledStartAt).toLocaleString()}</span>
                  </div>
                  <h3>{s.title}</h3>
                  <p className="lsc-astro">{s.astrologerName}</p>
                  <div className="lsc-meta">
                    <span>{s.topic}</span>
                    <span>{s.language}</span>
                    {accessBadge(s)}
                  </div>
                  <button className="btn-view">View Details →</button>
                </Link>
              ))}
            </div>
          </div>
        )}

        {!loading && sessions.length === 0 && (
          <div className="live-empty">
            <h2>No live sessions found</h2>
            <p>Check back later or explore astrologers to see their upcoming lives.</p>
            <Link className="btn-submit" to="/user/astrologers">Explore Astrologers →</Link>
          </div>
        )}
      </section>
    </Shell>
  );
}
