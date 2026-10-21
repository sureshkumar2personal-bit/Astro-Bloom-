import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Shell from '../../components/common/Shell';
import Notice from '../../components/common/Notice';
import { getUserSessions, revokeSession, revokeAllSessions } from '../../api/sessionApi';

export default function ActiveSessionsPage() {
  const [sessions, setSessions] = useState([]);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => { setLoading(true); getUserSessions().then(r => setSessions(r.data)).catch(() => {}).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  async function handleRevoke(id) {
    try { await revokeSession(id); setMsg('Session revoked.'); load(); } catch (err) { setMsg(err.message); }
  }

  async function handleRevokeAll() {
    try { await revokeAllSessions(); setMsg('All other sessions revoked.'); load(); } catch (err) { setMsg(err.message); }
  }

  function formatDate(d) { return d ? new Date(d).toLocaleString() : 'Unknown'; }

  return <Shell>
    <section className="sessions-page">
      <div className="sessions-header"><h1>Active Sessions</h1><p>Manage devices where you're signed in.</p></div>
      <Notice message={msg} />
      <div className="sessions-actions">
        <button className="btn-revoke-all" onClick={handleRevokeAll}>Revoke all other sessions</button>
      </div>
      {loading ? <p>Loading sessions...</p> : sessions.length === 0 ? <div className="sessions-empty"><p>No active sessions found.</p></div> : (
        <div className="sessions-list">
          {sessions.map(s => (
            <div key={s.id} className="session-card">
              <div className="session-info">
                <span className="session-device">{s.deviceInfo || 'Unknown device'}</span>
                <span className="session-ip">{s.ipAddress || 'IP unknown'}</span>
                <span className="session-date">Last active: {formatDate(s.lastActiveAt)}</span>
                <span className="session-created">Signed in: {formatDate(s.createdAt)}</span>
              </div>
              <button className="btn-revoke" onClick={() => handleRevoke(s.id)}>Revoke</button>
            </div>
          ))}
        </div>
      )}
      <Link className="outline-link" to="/user/dashboard">← Back to Dashboard</Link>
    </section>
  </Shell>;
}
