import { useEffect, useState } from 'react';
import Shell from '../../components/common/Shell';
import { getAudienceUsers, getUserCrmDetail } from '../../api/audienceApi';

export default function AstrologerAudienceHandlingPage() {
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState({});
  const [crmUser, setCrmUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAudienceUsers(filter)
      .then(r => setUsers(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filter]);

  async function viewCrm(userId) {
    const res = await getUserCrmDetail(userId);
    setCrmUser(res.data);
  }

  if (loading) return <Shell><section className="audience-page"><h1>Audience Handling</h1><p>Loading...</p></section></Shell>;

  return (
    <Shell>
      <section className="audience-page">
        <p className="eyebrow">AUDIENCE</p>
        <h1>Audience Handling</h1>

        <div className="audience-filters">
          <button className={!filter.type ? 'active' : ''} onClick={() => setFilter({})}>All</button>
          <button className={filter.type === 'followers' ? 'active' : ''} onClick={() => setFilter({ type: 'followers' })}>Followers</button>
          <button className={filter.type === 'subscribers' ? 'active' : ''} onClick={() => setFilter({ type: 'subscribers' })}>Subscribers</button>
        </div>

        <div className="audience-list">
          {users.map(u => (
            <div key={u.userId} className="subs-row" onClick={() => viewCrm(u.userId)}>
              <div className="subs-info">
                <b>{u.displayName}</b>
                <span>{u.relationshipType === 'subscriber' ? u.planName : 'Follower'} {u.benefitsUsed ? `· ${u.benefitsUsed} free Q used` : ''}</span>
              </div>
              <span className="subs-type">{u.relationshipType}</span>
            </div>
          ))}
          {users.length === 0 && <p className="subs-empty">No audience members found.</p>}
        </div>

        {crmUser && (
          <div className="crm-panel">
            <div className="crm-header"><h2>{crmUser.fullName}</h2><button onClick={() => setCrmUser(null)}>✕</button></div>
            <div className="crm-stats">
              <span>₹{crmUser.totalSpent} spent</span>
              <span>{crmUser.email || '—'}</span>
              <span>{crmUser.questions.length} questions</span>
            </div>
            {crmUser.subscriptions.length > 0 && (
              <div className="crm-section">
                <h3>Subscriptions</h3>
                {crmUser.subscriptions.map(s => (
                  <div key={s.id} className="crm-row">{s.planName} · {s.status} · expires {new Date(s.expiresAt).toLocaleDateString()}</div>
                ))}
              </div>
            )}
            {crmUser.perks.length > 0 && (
              <div className="crm-section">
                <h3>Perks</h3>
                {crmUser.perks.map(p => (
                  <div key={p.id} className="crm-row">{p.title} · {p.usedCount}/{p.totalCount} used</div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </Shell>
  );
}
