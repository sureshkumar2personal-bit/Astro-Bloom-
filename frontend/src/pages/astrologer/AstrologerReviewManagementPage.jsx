import { useEffect, useState } from 'react';
import Shell from '../../components/common/Shell';
import { apiAuthGet, apiAuthPut } from '../../api/client';

export default function AstrologerReviewManagementPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [replying, setReplying] = useState(null);
  const [replyText, setReplyText] = useState('');

  const load = () => {
    setLoading(true);
    apiAuthGet(`/astrologer/reviews?page=${page}&limit=10`)
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, [page]);

  const submitReply = async (reviewId) => {
    if (!replyText.trim()) return;
    try {
      await apiAuthPut(`/astrologer/reviews/${reviewId}/reply`, { adminReply: replyText });
      setReplying(null);
      setReplyText('');
      load();
    } catch (err) { alert(err.message); }
  };

  const stars = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);

  return (
    <Shell>
      <section className="page" style={{ maxWidth: 800, margin: '0 auto', padding: '40px 20px' }}>
        <div className="page-header-block">
          <p className="eyebrow">REPUTATION</p>
          <h1 style={{ fontFamily: "'Playfair Display', serif" }}>Your Reviews</h1>
        </div>

        {data && (
          <div style={{ display: 'flex', gap: 24, marginBottom: 24 }}>
            <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 12, padding: 20, textAlign: 'center', minWidth: 120 }}>
              <div style={{ fontSize: 36, fontWeight: 700, color: 'var(--purple)', fontFamily: "'Playfair Display', serif" }}>{data.stats?.avg_rating || '0.00'}</div>
              <div style={{ color: 'var(--gold)', fontSize: 14 }}>{stars(Math.round(data.stats?.avg_rating || 0))}</div>
              <div style={{ fontSize: 12, color: '#6e6573', marginTop: 4 }}>{data.stats?.total_reviews} reviews</div>
            </div>
          </div>
        )}

        {loading && <p>Loading...</p>}

        {data?.reviews?.map(r => (
          <div key={r.id} style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 12, padding: 20, marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <div>
                <span style={{ color: 'var(--gold)', fontSize: 14 }}>{stars(r.rating)}</span>
                {r.title && <h3 style={{ margin: '4px 0 0', fontSize: 14 }}>{r.title}</h3>}
              </div>
              <span style={{ fontSize: 11, color: '#6e6573' }}>{new Date(r.created_at).toLocaleDateString()}</span>
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.6, margin: '0 0 8px' }}>{r.review_text}</p>
            <p style={{ fontSize: 12, color: '#6e6573', margin: 0 }}>By {r.user_name} · {r.consultation_type}</p>

            {r.admin_reply ? (
              <div style={{ marginTop: 12, padding: 12, background: '#f9f6f1', borderRadius: 8, borderLeft: '3px solid var(--purple)' }}>
                <p style={{ fontSize: 11, fontWeight: 600, margin: '0 0 4px', color: 'var(--purple)' }}>Your Reply</p>
                <p style={{ fontSize: 13, margin: 0, lineHeight: 1.5 }}>{r.admin_reply}</p>
              </div>
            ) : replying === r.id ? (
              <div style={{ marginTop: 12 }}>
                <textarea value={replyText} onChange={e => setReplyText(e.target.value)} rows={3} placeholder="Write your reply..."
                  style={{ width: '100%', padding: 10, border: '1px solid var(--line)', borderRadius: 8, fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }} />
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button onClick={() => submitReply(r.id)} style={{ padding: '6px 16px', background: 'var(--purple)', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>Reply</button>
                  <button onClick={() => { setReplying(null); setReplyText(''); }} style={{ padding: '6px 16px', border: '1px solid var(--line)', borderRadius: 6, background: '#fff', fontSize: 12, cursor: 'pointer' }}>Cancel</button>
                </div>
              </div>
            ) : (
              <button onClick={() => { setReplying(r.id); setReplyText(''); }} style={{ marginTop: 8, padding: '4px 12px', border: '1px solid var(--purple)', borderRadius: 6, background: '#fff', fontSize: 11, cursor: 'pointer', color: 'var(--purple)' }}>
                Reply to review
              </button>
            )}
          </div>
        ))}

        {data?.reviews?.length === 0 && <p style={{ textAlign: 'center', color: '#6e6573', padding: 40 }}>No reviews yet.</p>}
      </section>
    </Shell>
  );
}
