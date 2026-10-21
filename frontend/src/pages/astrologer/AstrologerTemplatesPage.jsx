import { useEffect, useState } from 'react';
import Shell from '../../components/common/Shell';
import { apiAuthGet, apiAuthPost, apiAuthPut, apiAuthDelete } from '../../api/client';

const CATEGORIES = ['general', 'greeting', 'follow_up', 'birth_details', 'remedy', 'closing'];

export default function AstrologerTemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: '', body: '', category: 'general' });
  const [saving, setSaving] = useState(false);

  const load = () => {
    apiAuthGet('/astrologer/templates')
      .then(r => setTemplates(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await apiAuthPut(`/astrologer/templates/${editing}`, form);
      } else {
        await apiAuthPost('/astrologer/templates', form);
      }
      setEditing(null);
      setForm({ title: '', body: '', category: 'general' });
      load();
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!confirm('Delete this template?')) return;
    await apiAuthDelete(`/astrologer/templates/${id}`);
    load();
  };

  const edit = (t) => {
    setEditing(t.id);
    setForm({ title: t.title, body: t.body, category: t.category });
  };

  return (
    <Shell>
      <section className="page" style={{ maxWidth: 800, margin: '0 auto', padding: '40px 20px' }}>
        <div className="page-header-block">
          <p className="eyebrow">QUICK REPLIES</p>
          <h1 style={{ fontFamily: "'Playfair Display', serif" }}>Response Templates</h1>
          <p style={{ color: '#6e6573', marginTop: 4 }}>Save time with pre-written responses</p>
        </div>

        <form onSubmit={save} style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 16, padding: 24, marginBottom: 24 }}>
          <h2 style={{ fontSize: 16, marginBottom: 12 }}>{editing ? 'Edit Template' : 'New Template'}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px', gap: 12, marginBottom: 12 }}>
            <input type="text" placeholder="Template title" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
              style={{ padding: '10px 12px', border: '1px solid var(--line)', borderRadius: 8, fontSize: 13 }} />
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
              style={{ padding: '10px 12px', border: '1px solid var(--line)', borderRadius: 8, fontSize: 13 }}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
            </select>
          </div>
          <textarea placeholder="Template body..." required rows={4} value={form.body} onChange={e => setForm({ ...form, body: e.target.value })}
            style={{ width: '100%', padding: 12, border: '1px solid var(--line)', borderRadius: 8, fontSize: 13, resize: 'vertical', marginBottom: 12, boxSizing: 'border-box' }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" disabled={saving} style={{ padding: '10px 24px', background: 'var(--purple)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              {saving ? 'Saving...' : editing ? 'Update' : 'Create Template'}
            </button>
            {editing && <button type="button" onClick={() => { setEditing(null); setForm({ title: '', body: '', category: 'general' }); }} style={{ padding: '10px 20px', border: '1px solid var(--line)', borderRadius: 8, background: '#fff', fontSize: 13 }}>Cancel</button>}
          </div>
        </form>

        {loading && <p>Loading...</p>}
        {!loading && templates.length === 0 && <p style={{ color: '#6e6573' }}>No templates yet. Create your first one above.</p>}

        {templates.map(t => (
          <div key={t.id} style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 12, padding: 16, marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 14 }}>{t.title}</h3>
                <span style={{ fontSize: 11, color: 'var(--purple)', textTransform: 'capitalize' }}>{t.category?.replace('_', ' ')}</span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => edit(t)} style={{ padding: '4px 10px', border: '1px solid var(--line)', borderRadius: 6, background: '#fff', fontSize: 11, cursor: 'pointer' }}>Edit</button>
                <button onClick={() => remove(t.id)} style={{ padding: '4px 10px', border: '1px solid #ef4444', borderRadius: 6, background: '#fff', fontSize: 11, cursor: 'pointer', color: '#ef4444' }}>Del</button>
              </div>
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.5, margin: '8px 0 0', color: 'var(--ink)', whiteSpace: 'pre-wrap' }}>{t.body}</p>
            <p style={{ fontSize: 11, color: '#6e6573', margin: '8px 0 0' }}>Used {t.usage_count || 0} times</p>
          </div>
        ))}
      </section>
    </Shell>
  );
}
