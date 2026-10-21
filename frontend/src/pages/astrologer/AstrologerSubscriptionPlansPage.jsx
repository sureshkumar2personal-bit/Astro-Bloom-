import { useState, useEffect } from 'react';
import { getAstrologerPlans, createPlan } from '../../api/subscriptionApi';
import AstrologerLayout from '../../components/astrologer/AstrologerLayout';

const PLAN_CODES = ['silver', 'gold', 'platinum'];
const PLAN_COLORS = { silver: '#928994', gold: '#db9a40', platinum: '#5c3b8b' };

const DEFAULT_BENEFITS = [
  { benefitType: 'free_question', benefitName: 'Free Questions', benefitValue: 1, description: '1 free question per month' },
  { benefitType: 'monthly_prediction', benefitName: 'Monthly Prediction', benefitValue: 1, description: 'Monthly rasi palan' },
  { benefitType: 'subscriber_live_access', benefitName: 'Subscriber Live Access', benefitValue: 1, description: 'Access subscriber-only live sessions' },
  { benefitType: 'appointment_access', benefitName: 'Priority Appointment', benefitValue: 1, description: 'Priority booking access' },
  { benefitType: 'emergency_discount', benefitName: 'Emergency Discount', benefitValue: 10, description: '10% discount on emergency calls' },
];

export default function AstrologerSubscriptionPlansPage() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    planName: '', planCode: 'silver', price: 299, durationDays: 30, description: '',
    benefits: [{ ...DEFAULT_BENEFITS[0] }]
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    getAstrologerPlans()
      .then(r => setPlans(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function addBenefit() {
    setForm(prev => ({
      ...prev,
      benefits: [...prev.benefits, { benefitType: 'free_question', benefitName: '', benefitValue: 1, description: '' }]
    }));
  }

  function updateBenefit(idx, field, value) {
    setForm(prev => ({
      ...prev,
      benefits: prev.benefits.map((b, i) => i === idx ? { ...b, [field]: value } : b)
    }));
  }

  function removeBenefit(idx) {
    setForm(prev => ({ ...prev, benefits: prev.benefits.filter((_, i) => i !== idx) }));
  }

  async function handleCreate(e) {
    e.preventDefault();
    setSubmitting(true); setError('');
    try {
      const res = await createPlan(form);
      setPlans(prev => [...prev, {
        id: res.data.planId, planName: form.planName, planCode: form.planCode,
        price: form.price, durationDays: form.durationDays, description: form.description,
        isActive: true, benefits: form.benefits, createdAt: new Date().toISOString()
      }]);
      setForm({ planName: '', planCode: 'silver', price: 299, durationDays: 30, description: '', benefits: [{ ...DEFAULT_BENEFITS[0] }] });
      setShowForm(false);
    } catch (e) { setError(e.message); }
    finally { setSubmitting(false); }
  }

  function applyTemplate(code) {
    const templates = {
      silver: { planName: 'Silver', planCode: 'silver', price: 299, durationDays: 30, description: 'Basic subscriber benefits', benefits: [DEFAULT_BENEFITS[0], DEFAULT_BENEFITS[1]] },
      gold: { planName: 'Gold', planCode: 'gold', price: 499, durationDays: 30, description: 'Premium subscriber benefits with live access', benefits: [DEFAULT_BENEFITS[0], DEFAULT_BENEFITS[1], DEFAULT_BENEFITS[2], DEFAULT_BENEFITS[3]] },
      platinum: { planName: 'Platinum', planCode: 'platinum', price: 999, durationDays: 30, description: 'All-inclusive subscriber benefits', benefits: [...DEFAULT_BENEFITS] }
    };
    setForm(templates[code]);
  }

  return (
    <AstrologerLayout>
      <section className="page">
        <div className="page-header-block">
          <p className="eyebrow">SUBSCRIPTION PLANS</p>
          <h1>Manage Subscription Plans</h1>
          <p className="subtitle">Create and manage your Silver, Gold, and Platinum subscription plans</p>
        </div>

        <div className="atonement-summary-row">
          <div className="atonement-summary-card"><small>Total Plans</small><b>{plans.length}</b></div>
          <div className="atonement-summary-card" style={{ borderColor: '#27ae60' }}><small>Active</small><b style={{ color: '#27ae60' }}>{plans.filter(p => p.isActive).length}</b></div>
        </div>

        <button className="btn-primary" onClick={() => setShowForm(!showForm)} style={{ marginBottom: 20 }}>
          {showForm ? 'Cancel' : '+ Create New Plan'}
        </button>

        {showForm && (
          <form className="atonement-form" onSubmit={handleCreate} style={{ marginBottom: 30 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {PLAN_CODES.map(code => (
                <button key={code} type="button" className="btn-sm" onClick={() => applyTemplate(code)}
                  style={{ background: form.planCode === code ? PLAN_COLORS[code] : '#fff', color: form.planCode === code ? '#fff' : PLAN_COLORS[code], borderColor: PLAN_COLORS[code] }}>
                  {code.charAt(0).toUpperCase() + code.slice(1)} Template
                </button>
              ))}
            </div>

            <div className="atonement-form-row">
              <label>Plan Name*<input value={form.planName} onChange={e => setForm({ ...form, planName: e.target.value })} required placeholder="e.g. Gold" /></label>
              <label>Plan Code*
                <select value={form.planCode} onChange={e => setForm({ ...form, planCode: e.target.value })}>
                  {PLAN_CODES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
              </label>
            </div>

            <div className="atonement-form-row">
              <label>Monthly Price (₹)*<input type="number" value={form.price} onChange={e => setForm({ ...form, price: Number(e.target.value) })} required min="0" /></label>
              <label>Duration (days)*<input type="number" value={form.durationDays} onChange={e => setForm({ ...form, durationDays: Number(e.target.value) })} required min="1" /></label>
            </div>

            <label>Description<textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Brief description of this plan" /></label>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <h3 style={{ font: '600 14px "DM Sans"', margin: 0 }}>Plan Benefits</h3>
                <button type="button" className="btn-sm" onClick={addBenefit}>+ Add Benefit</button>
              </div>
              {form.benefits.map((b, idx) => (
                <div key={idx} className="atonement-form-row" style={{ marginBottom: 10, alignItems: 'flex-end' }}>
                  <label style={{ flex: 1 }}>Benefit Type
                    <select value={b.benefitType} onChange={e => updateBenefit(idx, 'benefitType', e.target.value)}>
                      <option value="free_question">Free Questions</option>
                      <option value="monthly_prediction">Monthly Prediction</option>
                      <option value="subscriber_live_access">Subscriber Live Access</option>
                      <option value="appointment_access">Priority Appointment</option>
                      <option value="emergency_discount">Emergency Discount</option>
                      <option value="discount_coupon">Discount Coupon</option>
                      <option value="priority_notification">Priority Notification</option>
                    </select>
                  </label>
                  <label style={{ flex: 1 }}>Name<input value={b.benefitName} onChange={e => updateBenefit(idx, 'benefitName', e.target.value)} placeholder="e.g. 2 Free Questions" /></label>
                  <label style={{ flex: 0.5 }}>Count<input type="number" value={b.benefitValue} onChange={e => updateBenefit(idx, 'benefitValue', Number(e.target.value))} min="1" /></label>
                  <button type="button" className="btn-sm" style={{ color: '#c0392b', marginBottom: 2 }} onClick={() => removeBenefit(idx)}>Remove</button>
                </div>
              ))}
            </div>

            {error && <p className="atonement-error">{error}</p>}

            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Plan'}
            </button>
          </form>
        )}

        {loading ? <p style={{ color: '#6e6573', padding: 20 }}>Loading...</p> : plans.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#928994' }}>
            <p style={{ fontSize: 40, margin: 0 }}>📋</p>
            <p>No subscription plans yet.</p>
            <p style={{ fontSize: 13 }}>Create Silver, Gold, and Platinum plans to offer subscriptions to users.</p>
          </div>
        ) : (
          <div className="atonement-list">
            {plans.map(p => (
              <div key={p.id} className="subs-active-card">
                <div className="subs-active-header">
                  <div>
                    <span className="subs-plan-badge" style={{ background: PLAN_COLORS[p.planCode] || '#999' }}>{p.planName}</span>
                    <h3>{p.planName} Plan</h3>
                    <small style={{ color: '#6e6573' }}>{p.description || 'No description'}</small>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ font: '700 24px "DM Sans"', color: 'var(--purple)' }}>₹{p.price}</div>
                    <small style={{ color: '#817987' }}>/{p.durationDays} days</small>
                  </div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                  {(p.benefits || []).map((b, i) => (
                    <span key={i} className="atonement-type-tag">{b.benefitName || b.benefitType} ({b.benefitValue})</span>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line)', fontSize: 12, color: '#817987' }}>
                  <span>Status: {p.isActive ? 'Active' : 'Inactive'}</span>
                  <span>·</span>
                  <span>Created: {new Date(p.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </AstrologerLayout>
  );
}
