import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createStaff } from '../../api/staffApi';
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

const PRESET_ROLES = {
  'Content Editor': { content: { view: true, create: true, edit: true, publish: false }, dashboard: { view: true }, profile: { view: true } },
  'Appointment Manager': { appointments: { view: true, create: true, edit: true, cancel: true }, dashboard: { view: true }, profile: { view: true } },
  'Live Manager': { live_streaming: { view: true, create: true, edit: true, delete: false }, dashboard: { view: true }, profile: { view: true } },
  'Support Staff': { disputes: { view: true, create: true, edit: true }, messages: { view: true, create: true }, dashboard: { view: true }, profile: { view: true } },
  'Finance Viewer': { wallet: { view: true }, analytics: { view: true }, dashboard: { view: true }, profile: { view: true } },
  'Custom': {},
};

export default function AddStaffPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: '', email: '', mobile: '', roleName: 'Content Editor', accessExpiresAt: '', notes: '' });
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  const applyPreset = (role) => {
    setForm(f => ({ ...f, roleName: role }));
    const preset = PRESET_ROLES[role] || {};
    const next = {};
    MODULES.forEach(m => {
      next[m.key] = {};
      m.actions.forEach(a => {
        next[m.key][a] = !m.sensitive && !!preset[m.key]?.[a];
      });
    });
    setPermissions(next);
  };

  const togglePermission = (moduleKey, actionKey) => {
    setPermissions(prev => ({
      ...prev,
      [moduleKey]: { ...(prev[moduleKey] || {}), [actionKey]: !(prev[moduleKey]?.[actionKey]) }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.fullName.trim()) return setError('Full name is required.');
    if (!form.email.trim() && !form.mobile.trim()) return setError('Email or mobile is required.');
    const permArray = [];
    Object.entries(permissions).forEach(([mk, actions]) => {
      Object.entries(actions).forEach(([ak, allowed]) => {
        permArray.push({ moduleKey: mk, actionKey: ak, isAllowed: allowed });
      });
    });
    const allowedPerms = permArray.filter(p => p.isAllowed);
    if (allowedPerms.length === 0) return setError('Select at least one permission.');
    setLoading(true);
    try {
      const res = await createStaff({
        fullName: form.fullName.trim(),
        email: form.email.trim() || undefined,
        mobile: form.mobile.trim() || undefined,
        roleName: form.roleName,
        permissions: permArray,
        accessExpiresAt: form.accessExpiresAt || undefined,
        notes: form.notes.trim() || undefined,
      });
      setSuccess(res.data);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to create staff invite.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <AstrologerLayout>
        <section className="staff-page">
        <div className="staff-success-box">
          <h2>Invite Sent!</h2>
          <p>An invitation has been sent to <strong>{form.email || form.mobile}</strong>.</p>
          <p className="staff-invite-note">Share this invite token with the staff member (for demo purposes):</p>
          <code className="staff-invite-token">{success.inviteToken}</code>
          <p className="staff-invite-expiry">Expires: {new Date(success.inviteExpiresAt).toLocaleString()}</p>
          <div className="staff-success-actions">
            <button className="btn-purple" onClick={() => navigate('/astrologer/accounts')}>Back to Accounts</button>
            <button className="btn-outline" onClick={() => { setSuccess(null); setForm({ fullName: '', email: '', mobile: '', roleName: 'Content Editor', accessExpiresAt: '', notes: '' }); setPermissions({}); }}>Add Another</button>
          </div>
        </div>
      </section>
      </AstrologerLayout>
    );
  }

  return (
    <AstrologerLayout>
      <section className="staff-page">
      <div className="staff-header">
        <div>
          <h1>Add Staff Member</h1>
          <p className="staff-subtitle">Invite an assistant, editor, or manager to help with your account.</p>
        </div>
      </div>
      {error && <div className="staff-error">{error}</div>}
      <form onSubmit={handleSubmit} className="staff-form">
        <div className="staff-form-grid">
          <div className="staff-field">
            <label>Full Name *</label>
            <input value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} placeholder="e.g. Kumar" />
          </div>
          <div className="staff-field">
            <label>Email</label>
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="kumar@example.com" />
          </div>
          <div className="staff-field">
            <label>Mobile</label>
            <input value={form.mobile} onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))} placeholder="9876543210" />
          </div>
          <div className="staff-field">
            <label>Access Expiry (optional)</label>
            <input type="datetime-local" value={form.accessExpiresAt} onChange={e => setForm(f => ({ ...f, accessExpiresAt: e.target.value }))} />
          </div>
        </div>
        <div className="staff-field" style={{ marginTop: 16 }}>
          <label>Notes (optional)</label>
          <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Internal notes about this staff member..." rows={2} />
        </div>

        <div className="staff-section-title" style={{ marginTop: 28 }}>Role Preset</div>
        <div className="staff-role-presets">
          {Object.keys(PRESET_ROLES).map(role => (
            <button key={role} type="button" className={`staff-preset-btn ${form.roleName === role ? 'active' : ''}`} onClick={() => applyPreset(role)}>
              {role}
            </button>
          ))}
        </div>

        <div className="staff-section-title" style={{ marginTop: 28 }}>Permission Matrix</div>
        <div className="staff-perm-table-wrap">
          <table className="staff-perm-table">
            <thead>
              <tr>
                <th>Module</th>
                <th>View</th>
                <th>Create</th>
                <th>Edit</th>
                <th>Delete</th>
                <th>Publish</th>
                <th>Cancel</th>
                <th>Withdraw</th>
              </tr>
            </thead>
            <tbody>
              {MODULES.map(m => (
                <tr key={m.key} className={m.sensitive ? 'staff-perm-sensitive' : ''}>
                  <td className="staff-perm-module">{m.label} {m.sensitive && <span className="staff-perm-badge">Sensitive</span>}</td>
                  {['view', 'create', 'edit', 'delete', 'publish', 'cancel', 'withdraw'].map(a => (
                    <td key={a}>
                      {m.actions.includes(a) ? (
                        <label className="staff-perm-check">
                          <input type="checkbox" checked={!!permissions[m.key]?.[a]} onChange={() => togglePermission(m.key, a)} />
                        </label>
                      ) : (
                        <span className="staff-perm-na">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="staff-form-submit">
          <button type="button" className="btn-outline" onClick={() => navigate('/astrologer/accounts')}>Cancel</button>
          <button type="submit" className="btn-purple" disabled={loading}>{loading ? 'Sending...' : 'Send Invite'}</button>
        </div>
      </form>
    </section>
    </AstrologerLayout>
  );
}
