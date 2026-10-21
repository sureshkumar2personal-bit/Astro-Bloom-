import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getStaffList } from '../../api/staffApi';
import AstrologerLayout from '../../components/astrologer/AstrologerLayout';

const statusColors = { active: '#27ae60', invited: '#db9a40', disabled: '#c0392b', removed: '#817987', expired: '#817987' };

export default function AccountsManagementPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getStaffList();
      setData(res.data);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load staff.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const s = data?.summary || {};
  const staff = data?.staff || [];

  return (
    <AstrologerLayout>
      <section className="staff-page">
        <div className="staff-header">
          <div>
            <h1>Accounts Management</h1>
            <p className="staff-subtitle">Manage assistants, editors, permissions and security</p>
          </div>
          <div className="staff-actions-top">
            <Link to="/astrologer/accounts/add-staff" className="btn-purple">+ Add Staff</Link>
            <Link to="/astrologer/accounts/activity-logs" className="btn-outline">Activity Logs</Link>
            <Link to="/astrologer/accounts/kill-switch" className="btn-danger-sm">Kill Switch</Link>
          </div>
        </div>

        {error && <div className="staff-error">{error}</div>}

        <div className="staff-summary-cards">
          <div className="staff-card"><span className="staff-card-num">{s.totalStaff || 0}</span><span className="staff-card-label">Total Staff</span></div>
          <div className="staff-card staff-card-active"><span className="staff-card-num">{s.activeStaff || 0}</span><span className="staff-card-label">Active</span></div>
          <div className="staff-card staff-card-pending"><span className="staff-card-num">{s.pendingInvites || 0}</span><span className="staff-card-label">Pending Invites</span></div>
          <div className="staff-card staff-card-disabled"><span className="staff-card-num">{s.disabledStaff || 0}</span><span className="staff-card-label">Disabled</span></div>
          <div className="staff-card staff-card-alert"><span className="staff-card-num">{s.securityAlerts || 0}</span><span className="staff-card-label">Security Alerts (24h)</span></div>
        </div>

        {loading ? (
          <div className="staff-loading">Loading staff...</div>
        ) : staff.length === 0 ? (
          <div className="staff-empty">
            <p>No staff members yet.</p>
            <Link to="/astrologer/accounts/add-staff" className="btn-purple">+ Add Your First Staff Member</Link>
          </div>
        ) : (
          <div className="staff-table-wrap">
            <table className="staff-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email / Mobile</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Last Active</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {staff.map(s => (
                  <tr key={s.id}>
                    <td className="staff-name-cell">{s.full_name}</td>
                    <td>{s.email || s.mobile || '—'}</td>
                    <td><span className="staff-role-badge">{s.role_name}</span></td>
                    <td>
                      <span className="staff-status-dot" style={{ background: statusColors[s.status] || '#817987' }} />
                      {s.status}
                    </td>
                    <td>{s.last_login_at ? new Date(s.last_login_at).toLocaleDateString() : 'Never'}</td>
                    <td>
                      <div className="staff-row-actions">
                        <Link to={`/astrologer/accounts/staff/${s.id}`} className="staff-link-sm">View</Link>
                        {s.status === 'invited' && <span className="staff-invited-badge">Invite Sent</span>}
                      </div>
                    </td>
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
