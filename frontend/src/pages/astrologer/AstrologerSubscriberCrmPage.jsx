import { useEffect, useState } from 'react';
import Shell from '../../components/common/Shell';
import { getAudienceUsers, getUserCrmDetail } from '../../api/audienceApi';

export default function AstrologerSubscriberCrmPage() {
  const [users, setUsers] = useState([]);
  const [crmUser, setCrmUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAudienceUsers({ type: 'subscribers' })
      .then(r => setUsers(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function viewCrm(userId) {
    const res = await getUserCrmDetail(userId);
    setCrmUser(res.data);
  }

  if (loading) return <Shell><section className="audience-page"><h1>Subscriber CRM</h1><p>Loading...</p></section></Shell>;

  return (
    <Shell>
      <section className="audience-page">
        <p className="eyebrow">CRM</p>
        <h1>Subscriber CRM</h1>

        <div className="audience-list">
          {users.map(u => (
            <div key={u.userId} className="subs-row" onClick={() => viewCrm(u.userId)}>
              <div className="subs-info">
                <b>{u.displayName}</b>
                <span>{u.planName} · {u.benefitsUsed || '—'} free Q used</span>
              </div>
              <span className="subs-type">{u.status}</span>
            </div>
          ))}
          {users.length === 0 && <p className="subs-empty">No subscribers yet.</p>}
        </div>

        {crmUser && (
          <div className="crm-panel">
            <div className="crm-header"><h2>{crmUser.fullName}</h2><button onClick={() => setCrmUser(null)}>✕</button></div>
            <div className="crm-stats">
              <span>₹{crmUser.totalSpent} spent</span>
              <span>Email: {crmUser.email || '—'}</span>
              <span>{crmUser.questions.length} questions</span>
            </div>
            {crmUser.subscriptions.length > 0 && (
              <div className="crm-section">
                <h3>Subscription History</h3>
                {crmUser.subscriptions.map(s => (
                  <div key={s.id} className="crm-row">{s.planName} · {s.status} · expires {new Date(s.expiresAt).toLocaleDateString()}</div>
                ))}
              </div>
            )}
            {crmUser.questions.length > 0 && (
              <div className="crm-section">
                <h3>Questions</h3>
                {crmUser.questions.map(q => (
                  <div key={q.id} className="crm-row">{q.questionCode} — {q.title || 'Untitled'} · {q.status}</div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </Shell>
  );
}
