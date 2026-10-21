import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Shell from '../../components/common/Shell';
import { apiAuthGet } from '../../api/client';

const TYPES = [
  { key: '', label: 'All' },
  { key: 'question', label: 'Questions' },
  { key: 'appointment', label: 'Appointments' },
  { key: 'live_entry', label: 'Live Sessions' },
  { key: 'subscription', label: 'Subscriptions' },
];

export default function ConsultationHistoryPage() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 20 });
    if (typeFilter) params.set('type', typeFilter);
    apiAuthGet(`/user/consultation-history?${params}`)
      .then(r => { setItems(r.data.items); setTotal(r.data.total); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, typeFilter]);

  const typeBadge = (t) => {
    const colors = { question: '#5c3b8b', appointment: '#db9a40', live_entry: '#2e7d32', subscription: '#1565c0' };
    return <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, background: colors[t] || '#666', color: '#fff', textTransform: 'capitalize' }}>{t}</span>;
  };

  return (
    <Shell>
      <section className="page" style={{ maxWidth: 900, margin: '0 auto', padding: '40px 20px' }}>
        <div className="page-header-block">
          <p className="eyebrow">YOUR JOURNEY</p>
          <h1 style={{ fontFamily: "'Playfair Display', serif" }}>Consultation History</h1>
          <p style={{ color: '#6e6573', marginTop: 4 }}>Every step of your cosmic path</p>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
          {TYPES.map(t => (
            <button key={t.key} onClick={() => { setTypeFilter(t.key); setPage(1); }}
              style={{ padding: '6px 16px', borderRadius: 20, border: typeFilter === t.key ? '2px solid var(--purple)' : '1px solid var(--line)', background: typeFilter === t.key ? '#f0e8f8' : '#fff', cursor: 'pointer', fontSize: 13, fontWeight: typeFilter === t.key ? 600 : 400 }}>
              {t.label}
            </button>
          ))}
        </div>

        {loading && <p style={{ textAlign: 'center' }}>Loading...</p>}

        {!loading && items.length === 0 && (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <p style={{ fontSize: 48, marginBottom: 12 }}>✦</p>
            <h2 style={{ fontFamily: "'Playfair Display', serif" }}>Your journey begins here</h2>
            <p style={{ color: '#6e6573' }}>Your consultation history will appear here.</p>
          </div>
        )}

        {items.map(item => (
          <div key={item.id} style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 12, padding: 20, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                {typeBadge(item.type)}
                <h3 style={{ margin: 0, fontSize: 15 }}>{item.title || 'Untitled'}</h3>
              </div>
              {item.astrologer_name && <p style={{ fontSize: 13, color: '#6e6573', margin: '4px 0' }}>with {item.astrologer_name}</p>}
              {item.summary && <p style={{ fontSize: 13, color: 'var(--ink)', margin: '4px 0', lineHeight: 1.5 }}>{item.summary.slice(0, 120)}...</p>}
            </div>
            <div style={{ textAlign: 'right', minWidth: 100 }}>
              <p style={{ fontSize: 13, color: '#6e6573' }}>{new Date(item.created_at).toLocaleDateString()}</p>
              {item.amount_spent > 0 && <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--purple)' }}>₹{item.amount_spent}</p>}
              {item.rating && <p style={{ color: 'var(--gold)', fontSize: 12 }}>{'★'.repeat(item.rating)}</p>}
            </div>
          </div>
        ))}

        {total > 20 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 24 }}>
            <button disabled={page <= 1} onClick={() => setPage(page - 1)} style={{ padding: '8px 20px', border: '1px solid var(--line)', borderRadius: 8, background: '#fff', cursor: 'pointer' }}>← Prev</button>
            <span style={{ lineHeight: '36px', fontSize: 14 }}>Page {page} of {Math.ceil(total / 20)}</span>
            <button disabled={page * 20 >= total} onClick={() => setPage(page + 1)} style={{ padding: '8px 20px', border: '1px solid var(--line)', borderRadius: 8, background: '#fff', cursor: 'pointer' }}>Next →</button>
          </div>
        )}
      </section>
    </Shell>
  );
}
