import { useState, useEffect } from 'react';
import { getDiscountCodes, createDiscountCode, pauseDiscountCode } from '../../api/atonementApi';
import AstrologerLayout from '../../components/astrologer/AstrologerLayout';

const REMEDY_TYPES = [
  'mantra_chanting', 'temple_visit', 'donation', 'fasting', 'pooja', 'homam',
  'digital_atonement', 'festival_pariharam', 'dosham_remedy', 'sani_pariharam',
  'rahu_ketu_pariharam', 'sevvai_remedy', 'marriage_delay_remedy', 'career_obstacle_remedy', 'family_peace_remedy'
];

function formatLabel(s) { return (s || '').replace(/_/g, ' '); }

export default function DiscountCodeManagementPage() {
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    code: '', description: '', remedyType: '', discountType: 'percentage',
    discountValue: 20, commissionPercentage: 10, maxUsage: 100, expiresAt: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setLoading(true);
    getDiscountCodes()
      .then(r => setCodes(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function updateField(e) {
    const { name, value, type } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'number' ? Number(value) : value }));
  }

  async function handleCreate(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await createDiscountCode({
        ...form,
        expiresAt: form.expiresAt || null,
        maxUsage: form.maxUsage || null
      });
      setCodes(prev => [{ id: res.data.codeId, ...form, used_count: 0, status: 'active', created_at: new Date().toISOString() }, ...prev]);
      setForm({ code: '', description: '', remedyType: '', discountType: 'percentage', discountValue: 20, commissionPercentage: 10, maxUsage: 100, expiresAt: '' });
      setShowForm(false);
    } catch (e) { alert(e.message); }
    finally { setSubmitting(false); }
  }

  async function handleToggle(id, currentStatus) {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    try {
      await pauseDiscountCode(id, { status: newStatus });
      setCodes(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c));
    } catch (e) { alert(e.message); }
  }

  function copyCode(code) {
    navigator.clipboard?.writeText(code).then(() => alert('Code copied!')).catch(() => {});
  }

  const activeCodes = codes.filter(c => c.status === 'active');
  const otherCodes = codes.filter(c => c.status !== 'active');

  return (
    <AstrologerLayout>
      <section className="page">
        <div className="page-header-block">
          <p className="eyebrow">DISCOUNT & REFERRAL CODES</p>
          <h1>Manage Discount Codes</h1>
          <p className="subtitle">Create and manage discount codes for remedy-related products and services</p>
        </div>

        <div className="atonement-summary-row">
          <div className="atonement-summary-card"><small>Total Codes</small><b>{codes.length}</b></div>
          <div className="atonement-summary-card" style={{ borderColor: '#27ae60' }}><small>Active</small><b style={{ color: '#27ae60' }}>{activeCodes.length}</b></div>
          <div className="atonement-summary-card"><small>Total Usage</small><b>{codes.reduce((s, c) => s + (c.used_count || 0), 0)}</b></div>
        </div>

        <button className="btn-primary" onClick={() => setShowForm(!showForm)} style={{ marginBottom: 20 }}>
          {showForm ? 'Cancel' : '+ Create Discount Code'}
        </button>

        {showForm && (
          <form className="atonement-form" onSubmit={handleCreate} style={{ marginBottom: 30 }}>
            <div className="atonement-form-row">
              <label>Code*<input name="code" value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} required placeholder="e.g. RAVI_SANI_20" /></label>
              <label>Discount Type*
                <select name="discountType" value={form.discountType} onChange={updateField}>
                  <option value="percentage">Percentage</option>
                  <option value="fixed_amount">Fixed Amount (₹)</option>
                </select>
              </label>
            </div>

            <div className="atonement-form-row">
              <label>Discount Value*<input name="discountValue" type="number" value={form.discountValue} onChange={updateField} required min="1" /></label>
              <label>Commission %<input name="commissionPercentage" type="number" value={form.commissionPercentage} onChange={updateField} min="0" max="100" /></label>
              <label>Max Usage<input name="maxUsage" type="number" value={form.maxUsage} onChange={updateField} min="1" /></label>
            </div>

            <label>Remedy Type
              <select name="remedyType" value={form.remedyType} onChange={updateField}>
                <option value="">All Types</option>
                {REMEDY_TYPES.map(r => <option key={r} value={r}>{formatLabel(r)}</option>)}
              </select>
            </label>

            <label>Description<textarea name="description" value={form.description} onChange={updateField} rows={2} placeholder="e.g. 20% discount for Sani Pariharam digital atonement" /></label>
            <label>Expires At<input name="expiresAt" type="datetime-local" value={form.expiresAt} onChange={updateField} /></label>

            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Code'}
            </button>
          </form>
        )}

        {loading ? <p style={{ color: '#6e6573', padding: 20 }}>Loading...</p> : codes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#928994' }}>
            <p style={{ fontSize: 40, margin: 0 }}>🏷️</p>
            <p>No discount codes yet.</p>
            <p style={{ fontSize: 13 }}>Create codes to offer discounts on remedies and spiritual products.</p>
          </div>
        ) : (
          <div className="atonement-list">
            {codes.map(c => (
              <div key={c.id} className="atonement-card">
                <div className="atonement-card-header">
                  <div>
                    <h3 style={{ fontFamily: "'DM Sans'", fontWeight: 700, letterSpacing: 1 }}>{c.code}</h3>
                    {c.description && <small style={{ color: '#6e6573' }}>{c.description}</small>}
                  </div>
                  <span className="atonement-status-badge" style={{ background: c.status === 'active' ? '#27ae60' : c.status === 'paused' ? '#db9a40' : '#999' }}>{c.status}</span>
                </div>
                <div className="atonement-card-meta">
                  <span className="atonement-type-tag">{c.discount_type === 'percentage' ? `${c.discount_value}% off` : `₹${c.discount_value} off`}</span>
                  {c.remedy_type && <span className="atonement-type-tag">{formatLabel(c.remedy_type)}</span>}
                  <span className="atonement-free-tag">{c.used_count || 0} uses</span>
                  {c.commission_percentage > 0 && <span className="atonement-type-tag">{c.commission_percentage}% commission</span>}
                </div>
                <div className="atonement-card-actions">
                  <button className="btn-sm" onClick={() => copyCode(c.code)}>Copy Code</button>
                  <button className="btn-sm" onClick={() => handleToggle(c.id, c.status)} style={{ color: c.status === 'active' ? '#c0392b' : '#27ae60' }}>
                    {c.status === 'active' ? 'Pause' : 'Activate'}
                  </button>
                  {c.expires_at && <small style={{ color: '#928994' }}>Expires: {new Date(c.expires_at).toLocaleDateString()}</small>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </AstrologerLayout>
  );
}
