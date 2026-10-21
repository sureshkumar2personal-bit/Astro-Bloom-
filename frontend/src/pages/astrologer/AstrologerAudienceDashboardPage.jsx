import { useEffect, useState } from 'react';
import Shell from '../../components/common/Shell';
import { getAudienceDashboard, getAudienceUsers, getUserCrmDetail } from '../../api/audienceApi';

export default function AstrologerAudienceDashboardPage() {
  const [dash, setDash] = useState(null);
  const [users, setUsers] = useState([]);
  const [crmUser, setCrmUser] = useState(null);
  const [userFilter, setUserFilter] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getAudienceDashboard(), getAudienceUsers()])
      .then(([d, u]) => { setDash(d.data); setUsers(u.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    getAudienceUsers(userFilter).then(r => setUsers(r.data)).catch(() => {});
  }, [userFilter]);

  async function viewCrm(userId) {
    const res = await getUserCrmDetail(userId);
    setCrmUser(res.data);
  }

  if (loading) return <Shell><section className="audience-page"><h1>Audience</h1><p>Loading...</p></section></Shell>;
  if (!dash) return <Shell><section className="audience-page"><h1>Error</h1></section></Shell>;

  return (
    <Shell>
      <section className="audience-page">
        <p className="eyebrow">AUDIENCE</p>
        <h1>Audience Dashboard</h1>

        <div className="dash-stats">
          <div className="dash-stat"><span>👥</span><small>Total Followers</small><b>{dash.totalFollowers}</b></div>
          <div className="dash-stat"><span>⭐</span><small>Total Subscribers</small><b>{dash.totalSubscribers}</b></div>
          <div className="dash-stat"><span>📈</span><small>New This Month</small><b>{dash.newFollowersThisMonth + dash.newSubscribersThisMonth}</b></div>
          <div className="dash-stat"><span>🎁</span><small>Pending Perks</small><b>{dash.pendingPerks}</b></div>
        </div>

        {Object.keys(dash.planDistribution).length > 0 && (
          <div className="profile-section">
            <h2>Plan Distribution</h2>
            {Object.entries(dash.planDistribution).map(([code, count]) => (
              <div key={code} className="subs-row"><div className="subs-info"><b>{code}</b><span>{count} active subscriber{count !== 1 ? 's' : ''}</span></div></div>
            ))}
          </div>
        )}

        <div className="profile-section">
          <h2>Audience Members</h2>
          <div className="audience-filters">
            <button className={!userFilter.type ? 'active' : ''} onClick={() => setUserFilter({})}>All</button>
            <button className={userFilter.type === 'followers' ? 'active' : ''} onClick={() => setUserFilter({ type: 'followers' })}>Followers</button>
            <button className={userFilter.type === 'subscribers' ? 'active' : ''} onClick={() => setUserFilter({ type: 'subscribers' })}>Subscribers</button>
          </div>
          <div className="audience-list">
            {users.map(u => (
              <div key={u.userId} className="subs-row" onClick={() => viewCrm(u.userId)}>
                <div className="subs-info">
                  <b>{u.displayName}</b>
                  <span>{u.relationshipType === 'subscriber' ? u.planName : 'Follower'} · {u.benefitsUsed || ''}</span>
                </div>
                <span className="subs-type">{u.relationshipType}</span>
              </div>
            ))}
            {users.length === 0 && <p className="subs-empty">No audience members found.</p>}
          </div>
        </div>

        {crmUser && (
          <div className="crm-panel">
            <div className="crm-header"><h2>CRM — {crmUser.fullName}</h2><button onClick={() => setCrmUser(null)}>✕ Close</button></div>
            <div className="crm-stats">
              <span>Total Spent: ₹{crmUser.totalSpent}</span>
              <span>Email: {crmUser.email || '—'}</span>
            </div>
            {crmUser.subscriptions.length > 0 && (
              <div className="crm-section"><h3>Subscriptions</h3>
                {crmUser.subscriptions.map(s => <div key={s.id} className="crm-row">{s.planName} — {s.status} · expires {new Date(s.expiresAt).toLocaleDateString()}</div>)}
              </div>
            )}
            {crmUser.questions.length > 0 && (
              <div className="crm-section"><h3>Recent Questions</h3>
                {crmUser.questions.map(q => <div key={q.id} className="crm-row">{q.questionCode} — {q.title || 'Untitled'} · {q.status}</div>)}
              </div>
            )}
          </div>
        )}
      </section>
    </Shell>
  );
}
