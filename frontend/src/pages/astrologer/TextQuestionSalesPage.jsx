import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Shell from '../../components/common/Shell';
import { ALL_SPECIALIZATIONS, ALL_LANGUAGES } from '../../utils/constants';
import { getAccessToken } from '../../api/client';

export default function TextQuestionSalesPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    campaignName: '', description: '', price: '', totalSlots: '', generalQuestionLimit: '', individualQuestionLimit: '',
    submissionMode: 'text', answerMode: 'text', deadlineHours: '48',
    categories: [], languages: []
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/astrologer/question-campaigns`, {
      headers: { Authorization: `Bearer ${getAccessToken()}` }
    })
      .then(r => r.json())
      .then(r => { if (r.success) setCampaigns(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(load, []);

  const toggleArr = (arr, val) => arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val];

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.campaignName) return setError('Campaign name is required.');
    if (!form.price || parseFloat(form.price) < 0) return setError('Price must be >= 0.');
    if (!form.totalSlots || parseInt(form.totalSlots) <= 0) return setError('Total slots must be > 0.');
    if (!form.categories.length) return setError('Select at least one category.');
    if (!form.languages.length) return setError('Select at least one language.');
    setSaving(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/astrologer/question-campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAccessToken()}` },
        body: JSON.stringify({ ...form, price: parseFloat(form.price), totalSlots: parseInt(form.totalSlots), generalQuestionLimit: parseInt(form.generalQuestionLimit) || 0, individualQuestionLimit: parseInt(form.individualQuestionLimit) || 0, deadlineHours: parseInt(form.deadlineHours) || 48 })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message);
      setShowForm(false);
      setForm({ campaignName: '', description: '', price: '', totalSlots: '', generalQuestionLimit: '', individualQuestionLimit: '', submissionMode: 'text', answerMode: 'text', deadlineHours: '48', categories: [], languages: [] });
      load();
    } catch (err) { setError(err.message); }
    setSaving(false);
  };

  if (loading) return <Shell><section className="sales-page"><div className="explore-loading"><h2>Loading campaigns…</h2></div></section></Shell>;

  const totalSold = campaigns.reduce((s, c) => s + (c.soldSlots || 0), 0);
  const totalRevenue = campaigns.reduce((s, c) => s + (c.soldSlots || 0) * (c.price || 0), 0);

  return (
    <Shell>
      <section className="sales-page">
        <div className="edit-header">
          <div><p className="eyebrow">TEXT QUESTION SALES</p><h1>Question Campaign Management</h1></div>
          <button className="btn-submit" onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : '+ Create Campaign'}</button>
        </div>

        <div className="dash-stats" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
          <article className="dash-stat"><span>✦</span><small>Total Campaigns</small><b>{campaigns.length}</b></article>
          <article className="dash-stat"><span>★</span><small>Questions Sold</small><b>{totalSold}</b></article>
          <article className="dash-stat"><span>₹</span><small>Total Revenue</small><b>₹{totalRevenue}</b></article>
        </div>

        {showForm && (
          <div className="campaign-form-card">
            <h2>Create New Campaign</h2>
            <form onSubmit={handleCreate} className="submit-form">
              <div className="form-row-2">
                <div className="form-group"><label>Campaign Name *</label><input type="text" value={form.campaignName} onChange={e => setForm({ ...form, campaignName: e.target.value })} placeholder="e.g. Marriage Question Campaign" /></div>
                <div className="form-group"><label>Price (₹) *</label><input type="number" min="0" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} /></div>
              </div>
              <div className="form-group"><label>Description</label><textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              <div className="form-row-3">
                <div className="form-group"><label>Total Slots *</label><input type="number" min="1" value={form.totalSlots} onChange={e => setForm({ ...form, totalSlots: e.target.value })} /></div>
                <div className="form-group"><label>General Limit</label><input type="number" min="0" value={form.generalQuestionLimit} onChange={e => setForm({ ...form, generalQuestionLimit: e.target.value })} /></div>
                <div className="form-group"><label>Individual Limit</label><input type="number" min="0" value={form.individualQuestionLimit} onChange={e => setForm({ ...form, individualQuestionLimit: e.target.value })} /></div>
              </div>
              <div className="form-row-3">
                <div className="form-group"><label>Submission Mode</label><select value={form.submissionMode} onChange={e => setForm({ ...form, submissionMode: e.target.value })}><option value="text">Text</option><option value="voice">Voice</option><option value="text_or_voice">Text or Voice</option></select></div>
                <div className="form-group"><label>Answer Mode</label><select value={form.answerMode} onChange={e => setForm({ ...form, answerMode: e.target.value })}><option value="text">Text</option><option value="voice">Voice</option><option value="live">Live</option></select></div>
                <div className="form-group"><label>Deadline (hours)</label><input type="number" min="1" value={form.deadlineHours} onChange={e => setForm({ ...form, deadlineHours: e.target.value })} /></div>
              </div>
              <div className="form-group"><label>Categories *</label><div className="chips">{ALL_SPECIALIZATIONS.map(s => <button key={s} type="button" className={form.categories.includes(s) ? 'selected' : ''} onClick={() => setForm({ ...form, categories: toggleArr(form.categories, s) })}>{s}</button>)}</div></div>
              <div className="form-group"><label>Languages *</label><div className="chips">{ALL_LANGUAGES.map(l => <button key={l} type="button" className={form.languages.includes(l) ? 'selected' : ''} onClick={() => setForm({ ...form, languages: toggleArr(form.languages, l) })}>{l}</button>)}</div></div>
              {error && <p className="form-error">{error}</p>}
              <button type="submit" className="btn-submit" disabled={saving}>{saving ? 'Creating…' : 'Create Campaign'}</button>
            </form>
          </div>
        )}

        <div className="campaigns-list">
          {campaigns.length === 0 ? <div className="explore-empty"><h2>No campaigns yet</h2><p>Create your first question campaign to start selling.</p></div> : campaigns.map(c => (
            <div key={c.id} className="campaign-row">
              <div className="cr-left">
                <h3>{c.campaignName}</h3>
                <span className={`cr-status status-${c.status}`}>{c.status}</span>
                <span className="cr-price">₹{c.price} · {c.submissionMode} → {c.answerMode}</span>
              </div>
              <div className="cr-right">
                <span>{c.soldSlots}/{c.totalSlots} sold</span>
                <span className="cr-revenue">₹{c.soldSlots * c.price}</span>
                <div className="cr-actions">
                  {c.status === 'draft' && <button className="btn-submit" onClick={async () => { await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/astrologer/question-campaigns/${c.id}/activate`, { method: 'PATCH', headers: { Authorization: `Bearer ${getAccessToken()}` } }); load(); }}>Activate</button>}
                  {c.status === 'active' && <button className="btn-save" onClick={async () => { await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/astrologer/question-campaigns/${c.id}/pause`, { method: 'PATCH', headers: { Authorization: `Bearer ${getAccessToken()}` } }); load(); }}>Pause</button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </Shell>
  );
}
