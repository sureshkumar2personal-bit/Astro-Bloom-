import { useEffect, useState } from 'react';
import Shell from '../../components/common/Shell';
import { apiAuthGet, apiAuthPost, apiAuthPut, apiAuthDelete } from '../../api/client';

export default function AstrologerClientNotesPage() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ userId: '', note: '', tags: '' });
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const load = () => {
    apiAuthGet('/astrologer/client-notes')
      .then(r => setNotes(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, tags: form.tags ? form.tags.split(',').map(t => t.trim()) : null };
      if (editingId) {
        await apiAuthPut(`/astrologer/client-notes/${editingId}`, { note: payload.note, tags: payload.tags });
      } else {
        await apiAuthPost('/astrologer/client-notes', payload);
      }
      setShowForm(false);
      setEditingId(null);
      setForm({ userId: '', note: '', tags: '' });
      load();
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  const edit = (n) => {
    setEditingId(n.id);
    setForm({ userId: n.user_id, note: n.note, tags: (n.tags || []).join(', ') });
    setShowForm(true);
  };

  const remove = async (id) => {
    if (!confirm('Delete this note?')) return;
    await apiAuthDelete(`/astrologer/client-notes/${id}`);
    load();
  };

  const grouped = notes.reduce((acc, n) => {
    const key = n.client_name || n.user_id;
    if (!acc[key]) acc[key] = { name: n.client_name || 'Unknown', email: n.client_email, notes: [] };
    acc[key].notes.push(n);
    return acc;
  }, {});

  return (
    <Shell>
      <section className="page" style={{ maxWidth: 800, margin: '0 auto', padding: '40px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div className="page-header-block" style={{ marginBottom: 0 }}>
            <p className="eyebrow">CLIENT MANAGEMENT</p>
            <h1 style={{ fontFamily: "'Playfair Display', serif" }}>Client Notes</h1>
          </div>
          <button onClick={() => { setShowForm(!showForm); setEditingId(null); setForm({ userId: '', note: '', tags: '' }); }}
            style={{ padding: '10px 20px', background: 'var(--purple)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {showForm ? 'Cancel' : '+ New Note'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={save} style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 16, padding: 24, marginBottom: 24 }}>
            <h2 style={{ fontSize: 16, marginBottom: 12 }}>{editingId ? 'Edit Note' : 'Add Client Note'}</h2>
            {!editingId && <input type="text" placeholder="Client User ID" required value={form.userId} onChange={e => setForm({ ...form, userId: e.target.value })}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--line)', borderRadius: 8, fontSize: 13, marginBottom: 12, boxSizing: 'border-box' }} />}
            <textarea placeholder="Note about this client..." required rows={4} value={form.note} onChange={e => setForm({ ...form, note: e.target.value })}
              style={{ width: '100%', padding: 12, border: '1px solid var(--line)', borderRadius: 8, fontSize: 13, resize: 'vertical', marginBottom: 12, boxSizing: 'border-box' }} />
            <input type="text" placeholder="Tags (comma separated, e.g. marriage, follow-up)" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--line)', borderRadius: 8, fontSize: 13, marginBottom: 12, boxSizing: 'border-box' }} />
            <button type="submit" disabled={saving} style={{ padding: '10px 24px', background: 'var(--purple)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              {saving ? 'Saving...' : editingId ? 'Update' : 'Save Note'}
            </button>
          </form>
        )}

        {loading && <p>Loading...</p>}
        {!loading && Object.keys(grouped).length === 0 && <p style={{ color: '#6e6573' }}>No client notes yet. Add notes to keep track of your client interactions.</p>}

        {Object.entries(grouped).map(([key, client]) => (
          <div key={key} style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 12, marginBottom: 12, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', background: '#f9f6f1', borderBottom: '1px solid var(--line)' }}>
              <h3 style={{ margin: 0, fontSize: 14 }}>{client.name}</h3>
              {client.email && <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6e6573' }}>{client.email}</p>}
            </div>
            {client.notes.map(n => (
              <div key={n.id} style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <p style={{ fontSize: 13, lineHeight: 1.5, margin: 0, flex: 1, whiteSpace: 'pre-wrap' }}>{n.note}</p>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0, marginLeft: 8 }}>
                    <button onClick={() => edit(n)} style={{ padding: '2px 8px', border: '1px solid var(--line)', borderRadius: 4, background: '#fff', fontSize: 11, cursor: 'pointer' }}>Edit</button>
                    <button onClick={() => remove(n.id)} style={{ padding: '2px 8px', border: '1px solid #ef4444', borderRadius: 4, background: '#fff', fontSize: 11, cursor: 'pointer', color: '#ef4444' }}>Del</button>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: '#6e6573' }}>{new Date(n.created_at).toLocaleDateString()}</span>
                  {n.tags?.map(t => <span key={t} style={{ padding: '1px 8px', borderRadius: 10, fontSize: 10, background: '#f0e8f8', color: 'var(--purple)' }}>{t}</span>)}
                </div>
              </div>
            ))}
          </div>
        ))}
      </section>
    </Shell>
  );
}
