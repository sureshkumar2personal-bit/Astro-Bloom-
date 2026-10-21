import { useState } from 'react';
import { Link } from 'react-router-dom';
import { activateKillSwitch, restoreKillSwitch, getSecurityEvents } from '../../api/staffApi';
import { useEffect } from 'react';
import AstrologerLayout from '../../components/astrologer/AstrologerLayout';

export default function KillSwitchPage() {
  const [password, setPassword] = useState('');
  const [reason, setReason] = useState('');
  const [options, setOptions] = useState({ disableStaff: true, revokeSessions: true, lockWallet: false, lockContentPublishing: false, lockLiveScheduling: false, lockRefunds: false });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await getSecurityEvents({ limit: 50 });
        setEvents(res.data || []);
      } catch {}
      setEventsLoading(false);
    })();
  }, []);

  const handleActivate = async (e) => {
    e.preventDefault();
    if (!password) return setError('Password is required.');
    if (!reason.trim()) return setError('Reason is required.');
    if (!confirm('ACTIVATE KILL SWITCH? This will disable all staff access and revoke sessions immediately.')) return;
    setLoading(true);
    setError('');
    try {
      const res = await activateKillSwitch({ password, reason: reason.trim(), ...options });
      setResult(res.data);
      setPassword('');
      setReason('');
      const evRes = await getSecurityEvents({ limit: 50 });
      setEvents(evRes.data || []);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to activate kill switch.');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!password) return setError('Password is required to restore.');
    if (!confirm('Restore staff access? All previously disabled staff will be re-enabled.')) return;
    setLoading(true);
    setError('');
    try {
      await restoreKillSwitch({ password, reason: 'Owner restored staff access' });
      setResult({ restored: true });
      setPassword('');
      const evRes = await getSecurityEvents({ limit: 50 });
      setEvents(evRes.data || []);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to restore.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AstrologerLayout>
      <section className="staff-page">
      <div className="staff-header">
        <div>
          <h1>Kill Switch</h1>
          <p className="staff-subtitle">Emergency stop for all staff access. Use when you suspect misuse.</p>
        </div>
        <Link to="/astrologer/accounts" className="btn-outline">Back</Link>
      </div>

      {error && <div className="staff-error">{error}</div>}
      {result && !result.restored && (
        <div className="staff-success-box">
          <h2>Kill Switch Activated</h2>
          <p>All staff access has been emergency stopped.</p>
          <p>Disabled staff: <strong>{result.disabledStaffCount}</strong> | Revoked sessions: <strong>{result.revokedSessionCount}</strong></p>
        </div>
      )}
      {result?.restored && (
        <div className="staff-success-box">
          <h2>Staff Access Restored</h2>
          <p>All previously disabled staff accounts have been re-enabled.</p>
        </div>
      )}

      <div className="staff-kill-grid">
        <div className="staff-kill-panel">
          <h3>Activate Kill Switch</h3>
          <p className="staff-kill-warning">
            <strong>Warning:</strong> This will disable all staff access, revoke active sessions, and stop sensitive actions immediately. Your owner account will remain active.
          </p>
          <form onSubmit={handleActivate} className="staff-kill-form">
            <div className="staff-field">
              <label>Your Password *</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" />
            </div>
            <div className="staff-field">
              <label>Reason *</label>
              <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Suspected unauthorized access" rows={2} />
            </div>
            <div className="staff-kill-options">
              <label className="staff-perm-check"><input type="checkbox" checked={options.disableStaff} onChange={e => setOptions(o => ({ ...o, disableStaff: e.target.checked }))} /> Disable all staff accounts</label>
              <label className="staff-perm-check"><input type="checkbox" checked={options.revokeSessions} onChange={e => setOptions(o => ({ ...o, revokeSessions: e.target.checked }))} /> Revoke all staff sessions</label>
              <label className="staff-perm-check"><input type="checkbox" checked={options.lockWallet} onChange={e => setOptions(o => ({ ...o, lockWallet: e.target.checked }))} /> Lock wallet withdrawal</label>
              <label className="staff-perm-check"><input type="checkbox" checked={options.lockContentPublishing} onChange={e => setOptions(o => ({ ...o, lockContentPublishing: e.target.checked }))} /> Lock content publishing</label>
              <label className="staff-perm-check"><input type="checkbox" checked={options.lockLiveScheduling} onChange={e => setOptions(o => ({ ...o, lockLiveScheduling: e.target.checked }))} /> Lock live scheduling</label>
              <label className="staff-perm-check"><input type="checkbox" checked={options.lockRefunds} onChange={e => setOptions(o => ({ ...o, lockRefunds: e.target.checked }))} /> Lock refund actions</label>
            </div>
            <button type="submit" className="btn-danger" disabled={loading} style={{ marginTop: 16, width: '100%' }}>
              {loading ? 'Activating...' : 'Activate Kill Switch'}
            </button>
          </form>
        </div>

        <div className="staff-kill-panel">
          <h3>Restore Staff Access</h3>
          <p className="staff-kill-info">Re-enable all staff accounts that were disabled by the kill switch.</p>
          <div className="staff-field">
            <label>Your Password *</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" />
          </div>
          <button className="btn-purple" style={{ marginTop: 12, width: '100%' }} disabled={loading} onClick={handleRestore}>
            {loading ? 'Restoring...' : 'Restore All Staff'}
          </button>
        </div>
      </div>

      <div className="staff-section-title" style={{ marginTop: 32 }}>Security Event Log</div>
      {eventsLoading ? (
        <div className="staff-loading">Loading events...</div>
      ) : events.length === 0 ? (
        <div className="staff-empty"><p>No security events recorded yet.</p></div>
      ) : (
        <div className="staff-table-wrap">
          <table className="staff-table">
            <thead>
              <tr>
                <th>Event</th>
                <th>Triggered By</th>
                <th>Reason</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {events.map(ev => (
                <tr key={ev.id}>
                  <td><span className="staff-event-badge" data-type={ev.event_type}>{ev.event_type}</span></td>
                  <td>{ev.triggered_by_type}</td>
                  <td className="staff-event-reason">{ev.reason || '—'}</td>
                  <td>{new Date(ev.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
    </AstrologerLayout>
  );
}
