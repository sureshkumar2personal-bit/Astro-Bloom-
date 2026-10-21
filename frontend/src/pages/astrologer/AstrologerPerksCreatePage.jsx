import { useEffect, useState } from 'react';
import Shell from '../../components/common/Shell';
import { createContent, listContent, publishContent } from '../../api/audienceApi';

const CONTENT_TYPES = ['monthly_prediction', 'tip', 'live_announcement', 'article'];

export default function AstrologerPerksCreatePage() {
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: '', contentType: 'monthly_prediction', body: '', audienceType: 'all', planCode: null });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    listContent()
      .then(r => setContent(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.title || !form.contentType) return;
    setSubmitting(true);
    try {
      const res = await createContent(form);
      setContent(prev => [{ id: res.data.contentId, title: form.title, contentType: form.contentType, body: form.body, audienceType: form.audienceType, planCode: form.planCode, status: 'draft', createdAt: new Date().toISOString() }, ...prev]);
      setForm({ title: '', contentType: 'monthly_prediction', body: '', audienceType: 'all', planCode: null });
    } catch (e) { alert(e.message); }
    finally { setSubmitting(false); }
  }

  async function handlePublish(id) {
    await publishContent(id);
    setContent(prev => prev.map(c => c.id === id ? { ...c, status: 'published', publishedAt: new Date().toISOString() } : c));
  }

  if (loading) return <Shell><section className="perks-page"><h1>Content Perks</h1><p>Loading...</p></section></Shell>;

  return (
    <Shell>
      <section className="perks-page">
        <p className="eyebrow">CONTENT PERKS</p>
        <h1>Create &amp; Manage Perks</h1>

        <div className="profile-section">
          <h2>New Content</h2>
          <form className="perk-form" onSubmit={handleCreate}>
            <div className="form-group">
              <label>Title</label>
              <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div className="form-row-2">
              <div className="form-group">
                <label>Content Type</label>
                <select value={form.contentType} onChange={e => setForm({ ...form, contentType: e.target.value })}>
                  {CONTENT_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Audience</label>
                <select value={form.audienceType} onChange={e => setForm({ ...form, audienceType: e.target.value })}>
                  <option value="all">All Followers</option>
                  <option value="subscribers_only">Subscribers Only</option>
                  <option value="plan_specific">Plan Specific</option>
                </select>
              </div>
            </div>
            {form.audienceType === 'plan_specific' && (
              <div className="form-group">
                <label>Plan Code</label>
                <select value={form.planCode || ''} onChange={e => setForm({ ...form, planCode: e.target.value || null })}>
                  <option value="">Select plan...</option>
                  <option value="silver">Silver</option>
                  <option value="gold">Gold</option>
                  <option value="platinum">Platinum</option>
                </select>
              </div>
            )}
            <div className="form-group">
              <label>Body</label>
              <textarea rows={4} value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} placeholder="Content body..." />
            </div>
            <button className="btn-submit" type="submit" disabled={submitting}>{submitting ? 'Creating...' : 'Create Content'}</button>
          </form>
        </div>

        <div className="profile-section">
          <h2>Existing Content</h2>
          {content.length === 0 && <p className="subs-empty">No content created yet.</p>}
          {content.map(c => (
            <div key={c.id} className="subs-row">
              <div className="subs-info">
                <b>{c.title}</b>
                <span>{c.contentType.replace('_', ' ')} · {c.audienceType.replace('_', ' ')} {c.planCode ? `· ${c.planCode}` : ''}</span>
              </div>
              {c.status === 'draft' && (
                <button className="btn-view" onClick={() => handlePublish(c.id)}>Publish</button>
              )}
              {c.status === 'published' && <span className="qr-status status-completed">Published</span>}
            </div>
          ))}
        </div>
      </section>
    </Shell>
  );
}
