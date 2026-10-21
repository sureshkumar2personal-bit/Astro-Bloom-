import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getActivityLogs } from '../../api/staffApi';
import AstrologerLayout from '../../components/astrologer/AstrologerLayout';

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ staffId: '', actionKey: '', moduleKey: '', from: '', to: '' });

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (filters.staffId) params.staffId = filters.staffId;
      if (filters.actionKey) params.actionKey = filters.actionKey;
      if (filters.moduleKey) params.moduleKey = filters.moduleKey;
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;
      params.limit = 200;
      const res = await getActivityLogs(params);
      setLogs(res.data.logs || []);
      setStaffList(res.data.staff || []);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load activity logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleFilter = (key, val) => {
    setFilters(f => ({ ...f, [key]: val }));
  };

  return (
    <AstrologerLayout>
      <section className="staff-page">
        <div className="staff-header">
          <div>
            <h1>Activity Logs</h1>
            <p className="staff-subtitle">Track all staff and owner actions across your account.</p>
          </div>
          <Link to="/astrologer/accounts" className="btn-outline">Back</Link>
        </div>

        {error && <div className="staff-error">{error}</div>}

        <div className="staff-filters">
          <select value={filters.staffId} onChange={e => handleFilter('staffId', e.target.value)}>
            <option value="">All Staff</option>
            {staffList.map(s => <option key={s.id} value={s.id}>{s.full_name} ({s.role_name})</option>)}
          </select>
          <input value={filters.actionKey} onChange={e => handleFilter('actionKey', e.target.value)} placeholder="Action (e.g. staff_created)" />
          <input value={filters.moduleKey} onChange={e => handleFilter('moduleKey', e.target.value)} placeholder="Module (e.g. content)" />
          <input type="date" value={filters.from} onChange={e => handleFilter('from', e.target.value)} />
          <input type="date" value={filters.to} onChange={e => handleFilter('to', e.target.value)} />
          <button className="btn-purple btn-sm" onClick={load} disabled={loading}>
            {loading ? 'Loading...' : 'Apply'}
          </button>
        </div>

        {loading ? (
          <div className="staff-loading">Loading logs...</div>
        ) : logs.length === 0 ? (
          <div className="staff-empty"><p>No activity logs found.</p></div>
        ) : (
          <div className="staff-table-wrap">
            <table className="staff-table">
              <thead>
                <tr>
                  <th>Actor</th>
                  <th>Type</th>
                  <th>Action</th>
                  <th>Module</th>
                  <th>Status</th>
                  <th>IP</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(l => (
                  <tr key={l.id}>
                    <td>{l.staff_name || 'Owner'}</td>
                    <td><span className="staff-actor-badge" data-type={l.actor_type}>{l.actor_type}</span></td>
                    <td className="staff-log-action-cell">{l.action_key}</td>
                    <td>{l.module_key}</td>
                    <td><span className="staff-log-status" data-status={l.status}>{l.status}</span></td>
                    <td className="staff-ip-cell">{l.ip_address || '—'}</td>
                    <td>{new Date(l.created_at).toLocaleString()}</td>
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
