import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getStaffDetail, updatePermissions, disableStaff, enableStaff, removeStaff } from '../../api/staffApi';
import AstrologerLayout from '../../components/astrologer/AstrologerLayout';

const MODULES = [
  { key: 'dashboard', label: 'Dashboard', actions: ['view'] },
  { key: 'profile', label: 'Profile', actions: ['view', 'edit'] },
  { key: 'text_questions', label: 'Text Questions', actions: ['view', 'create', 'edit', 'delete', 'publish'] },
  { key: 'appointments', label: 'Appointments', actions: ['view', 'create', 'edit', 'cancel'] },
  { key: 'content', label: 'Content', actions: ['view', 'create', 'edit', 'delete', 'publish'] },
  { key: 'live_streaming', label: 'Live Streaming', actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'wallet', label: 'Wallet', actions: ['view', 'withdraw'], sensitive: true },
  { key: 'disputes', label: 'Disputes', actions: ['view', 'create', 'edit'] },
  { key: 'atonement', label: 'Atonement', actions: ['view', 'create', 'edit', 'publish'] },
  { key: 'staff_management', label: 'Staff Management', actions: ['view', 'create', 'edit', 'delete'], sensitive: true },
  { key: 'audience', label: 'Audience', actions: ['view', 'edit'] },
  { key: 'analytics', label: 'Analytics', actions: ['view'] },
  { key: 'messages', label: 'Messages', actions: ['view', 'create'] },
  { key: 'notifications', label: 'Notifications', actions: ['view'] },
];

const statusColors = { active: '#27ae60', invited: '#db9a40', disabled: '#c0392b', removed: '#817987', expired: '#817987' };

export default function StaffDetailPage() {
  const { staffId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingPerms, setEditingPerms] = useState(false);
  const [permissions, setPermissions] = useState({});
  const [permLoading, setPermLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await getStaffDetail(staffId);
      setData(res.data);
      const permMap = {};
      MODULES.forEach(m => {
        permMap[m.key] = {};
        m.actions.forEach(a => { permMap[m.key][a] = false; });
      });
      (res.data.permissions || []).forEach(p => {
        if (permMap[p.module_key]) permMap[p.module_key][p.action_key] = p.is_allowed;
      });
      setPermissions(permMap);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load staff details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [staffId]);

  const togglePerm = (mk, ak) => {
    setPermissions(prev => ({ ...prev, [mk]: { ...(prev[mk] || {}), [ak]: !prev[mk]?.[ak] } }));
  };

  const savePermissions = async () => {
    setPermLoading(true);
    setError('');
    try {
      const permArray = [];
      Object.entries(permissions).forEach(([mk, actions]) => {
        Object.entries(actions).forEach(([ak, allowed]) => {
          permArray.push({ moduleKey: mk, actionKey: ak, isAllowed: allowed });
        });
      });
      await updatePermissions(staffId, { permissions: permArray });
      setEditingPerms(false);
      await load();
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to update permissions.');
    } finally {
      setPermLoading(false);
    }
  };

  const handleAction = async (action) => {
    if (!confirm(`Are you sure you want to ${action} this staff member?`)) return;
    setActionLoading(action);
    setError('');
    try {
      if (action === 'disable') await disableStaff(staffId);
      else if (action === 'enable') await enableStaff(staffId);
      else if (action === 'remove') { await removeStaff(staffId); navigate('/astrologer/accounts'); return; }
      await load();
    } catch (e) {
      setError(e.response?.data?.message || `Failed to ${action} staff.`);
    } finally {
      setActionLoading('');
    }
  };

  if (loading) return <AstrologerLayout><section className="staff-page"><div className="staff-loading">Loading staff details...</div></section></AstrologerLayout>;
  if (error && !data) return <AstrologerLayout><section className="staff-page"><div className="staff-error">{error}</div></section></AstrologerLayout>;

  const s = data?.staff || {};
  const logs = data?.recentLogs || [];
  const sessions = data?.sessions || [];

  return (
    <AstrologerLayout>
      <section className="staff-page">
      <div className="staff-header">
        <div>
          <h1>{s.full_name}</h1>
          <p className="staff-subtitle">
            <span className="staff-role-badge">{s.role_name}</span>
            <span className="staff-status-dot" style={{ background: statusColors[s.status] || '#817987', marginLeft: 10 }} />
            {s.status}
          </p>
        </div>
        <div className="staff-actions-top">
          <Link to="/astrologer/accounts" className="btn-outline">Back</Link>
        </div>
      </div>

      {error && <div className="staff-error">{error}</div>}

      <div className="staff-detail-grid">
        <div className="staff-detail-card">
          <h3>Contact</h3>
          <p><strong>Email:</strong> {s.email || '—'}</p>
          <p><strong>Mobile:</strong> {s.mobile || '—'}</p>
          <p><strong>Last Login:</strong> {s.last_login_at ? new Date(s.last_login_at).toLocaleString() : 'Never'}</p>
          <p><strong>Created:</strong> {new Date(s.created_at).toLocaleDateString()}</p>
          <p><strong>Access Expires:</strong> {s.access_expires_at ? new Date(s.access_expires_at).toLocaleDateString() : 'Never'}</p>
        </div>

        <div className="staff-detail-card">
          <h3>Actions</h3>
          <div className="staff-detail-actions">
            {s.status === 'active' && (
              <button className="btn-danger-sm" disabled={actionLoading === 'disable'} onClick={() => handleAction('disable')}>
                {actionLoading === 'disable' ? 'Disabling...' : 'Disable'}
              </button>
            )}
            {s.status === 'disabled' && (
              <button className="btn-purple" disabled={actionLoading === 'enable'} onClick={() => handleAction('enable')}>
                {actionLoading === 'enable' ? 'Enabling...' : 'Enable'}
              </button>
            )}
            <button className="btn-danger" disabled={actionLoading === 'remove'} onClick={() => handleAction('remove')}>
              {actionLoading === 'remove' ? 'Removing...' : 'Remove'}
            </button>
          </div>
        </div>
      </div>

      <div className="staff-section-title" style={{ marginTop: 28 }}>Permissions</div>
      <div className="staff-perm-header">
        <span>{editingPerms ? 'Editing permissions — check/uncheck and save' : 'Current permissions'}</span>
        {!editingPerms ? (
          <button className="btn-outline btn-sm" onClick={() => setEditingPerms(true)}>Edit Permissions</button>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-outline btn-sm" onClick={() => setEditingPerms(false)}>Cancel</button>
            <button className="btn-purple btn-sm" disabled={permLoading} onClick={savePermissions}>
              {permLoading ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}
      </div>
      <div className="staff-perm-table-wrap">
        <table className="staff-perm-table">
          <thead>
            <tr>
              <th>Module</th>
              {['view', 'create', 'edit', 'delete', 'publish', 'cancel', 'withdraw'].map(a => (
                <th key={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MODULES.map(m => (
              <tr key={m.key} className={m.sensitive ? 'staff-perm-sensitive' : ''}>
                <td className="staff-perm-module">{m.label} {m.sensitive && <span className="staff-perm-badge">Sensitive</span>}</td>
                {['view', 'create', 'edit', 'delete', 'publish', 'cancel', 'withdraw'].map(a => (
                  <td key={a}>
                    {m.actions.includes(a) ? (
                      editingPerms ? (
                        <label className="staff-perm-check">
                          <input type="checkbox" checked={!!permissions[m.key]?.[a]} onChange={() => togglePerm(m.key, a)} />
                        </label>
                      ) : (
                        <span className={permissions[m.key]?.[a] ? 'staff-perm-yes' : 'staff-perm-no'}>
                          {permissions[m.key]?.[a] ? '✓' : '✕'}
                        </span>
                      )
                    ) : <span className="staff-perm-na">—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {logs.length > 0 && (
        <>
          <div className="staff-section-title" style={{ marginTop: 28 }}>Recent Activity</div>
          <div className="staff-logs-preview">
            {logs.map((l, i) => (
              <div key={i} className="staff-log-item">
                <span className="staff-log-action">{l.action_key}</span>
                <span className="staff-log-module">{l.module_key}</span>
                <span className="staff-log-status" data-status={l.status}>{l.status}</span>
                <span className="staff-log-time">{new Date(l.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {sessions.length > 0 && (
        <>
          <div className="staff-section-title" style={{ marginTop: 28 }}>Sessions</div>
          <div className="staff-sessions-list">
            {sessions.map((ss, i) => (
              <div key={i} className="staff-session-item">
                <span>{ss.ip_address || 'Unknown IP'}</span>
                <span>{ss.device_info || 'Unknown device'}</span>
                <span className={ss.revoked_at ? 'staff-session-revoked' : 'staff-session-active'}>
                  {ss.revoked_at ? 'Revoked' : 'Active'}
                </span>
                <span>{new Date(ss.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </>
      )}
      </section>
    </AstrologerLayout>
  );
}
