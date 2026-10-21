import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Shell from '../../components/common/Shell';
import { apiAuthGet, apiAuthPost } from '../../api/client';

export default function UserNotificationBellPage() {
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    Promise.all([
      apiAuthGet(`/user/notifications?page=${page}&limit=20`),
      apiAuthGet('/user/notifications/unread-count')
    ])
      .then(([notifs, unread]) => {
        setItems(notifs.data.items);
        setTotal(notifs.data.total);
        setUnreadCount(unread.data.count);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(load, [page]);

  const markRead = async (id) => {
    await apiAuthPost(`/user/notifications/${id}/read`);
    setItems(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllRead = async () => {
    await apiAuthPost('/user/notifications/read-all');
    setItems(prev => prev.map(n => ({ ...n, read_at: new Date().toISOString() })));
    setUnreadCount(0);
  };

  const icon = (type) => {
    const icons = { question_answered: '✦', appointment: '◷', subscription: '⭐', live: '●', payment: '₹', dispute: '!', system: '⚙' };
    return icons[type] || '•';
  };

  return (
    <Shell>
      <section className="page" style={{ maxWidth: 700, margin: '0 auto', padding: '40px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div className="page-header-block" style={{ marginBottom: 0 }}>
            <p className="eyebrow">NOTIFICATIONS</p>
            <h1 style={{ fontFamily: "'Playfair Display', serif" }}>Notifications {unreadCount > 0 && <span style={{ fontSize: 16, color: '#e53935', fontWeight: 600 }}>({unreadCount} new)</span>}</h1>
          </div>
          {unreadCount > 0 && (
            <button onClick={markAllRead} style={{ padding: '8px 16px', border: '1px solid var(--line)', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 13 }}>Mark all read</button>
          )}
        </div>

        {loading && <p style={{ textAlign: 'center' }}>Loading...</p>}

        {!loading && items.length === 0 && (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <p style={{ fontSize: 48 }}>🔔</p>
            <h2 style={{ fontFamily: "'Playfair Display', serif" }}>All caught up</h2>
            <p style={{ color: '#6e6573' }}>You'll see notifications here when something happens.</p>
          </div>
        )}

        {items.map(n => (
          <div key={n.id} onClick={() => !n.read_at && markRead(n.id)}
            style={{
              background: n.read_at ? '#fff' : '#f9f6f1',
              border: '1px solid var(--line)',
              borderRadius: 12,
              padding: '16px 20px',
              marginBottom: 8,
              cursor: 'pointer',
              transition: 'background 0.2s',
              borderLeft: n.read_at ? '3px solid transparent' : '3px solid var(--purple)'
            }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 20, marginTop: 2 }}>{icon(n.type)}</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: 14, fontWeight: n.read_at ? 400 : 600 }}>{n.title}</h3>
                  <span style={{ fontSize: 11, color: '#6e6573' }}>{timeAgo(n.created_at)}</span>
                </div>
                {n.body && <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6e6573', lineHeight: 1.5 }}>{n.body}</p>}
                {n.data?.link && <Link to={n.data.link} style={{ fontSize: 12, color: 'var(--purple)', display: 'inline-block', marginTop: 4 }}>View →</Link>}
              </div>
              {!n.read_at && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#e53935', flexShrink: 0, marginTop: 6 }} />}
            </div>
          </div>
        ))}

        {total > 20 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 24 }}>
            <button disabled={page <= 1} onClick={() => setPage(page - 1)} style={{ padding: '8px 20px', border: '1px solid var(--line)', borderRadius: 8, background: '#fff', cursor: 'pointer' }}>← Prev</button>
            <span style={{ lineHeight: '36px' }}>Page {page}</span>
            <button disabled={page * 20 >= total} onClick={() => setPage(page + 1)} style={{ padding: '8px 20px', border: '1px solid var(--line)', borderRadius: 8, background: '#fff', cursor: 'pointer' }}>Next →</button>
          </div>
        )}
      </section>
    </Shell>
  );
}

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
