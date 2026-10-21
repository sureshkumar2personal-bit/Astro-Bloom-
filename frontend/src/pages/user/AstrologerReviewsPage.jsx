import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Shell from '../../components/common/Shell';
import { apiGet } from '../../api/client';

export default function AstrologerReviewsPage() {
  const { astrologerId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    apiGet(`/astrologers/${astrologerId}/reviews?page=${page}&limit=10`)
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [astrologerId, page]);

  const stars = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);

  return (
    <Shell>
      <section className="page" style={{ maxWidth: 800, margin: '0 auto', padding: '40px 20px' }}>
        <div className="page-header-block">
          <p className="eyebrow">REVIEWS & RATINGS</p>
          <h1 style={{ fontFamily: "'Playfair Display', serif" }}>What seekers say</h1>
        </div>

        {loading && <p style={{ textAlign: 'center' }}>Loading reviews...</p>}

        {data && (
          <>
            <div style={{ display: 'flex', gap: 32, marginBottom: 32, padding: 24, background: '#fff', border: '1px solid var(--line)', borderRadius: 16 }}>
              <div style={{ textAlign: 'center', minWidth: 100 }}>
                <div style={{ fontSize: 42, fontWeight: 700, color: 'var(--purple)', fontFamily: "'Playfair Display', serif" }}>{data.stats?.avg_rating || '0.00'}</div>
                <div style={{ color: 'var(--gold)', fontSize: 18, letterSpacing: 2 }}>{stars(Math.round(data.stats?.avg_rating || 0))}</div>
                <div style={{ fontSize: 13, color: '#6e6573', marginTop: 4 }}>{data.stats?.total_reviews} reviews</div>
              </div>
              <div style={{ flex: 1 }}>
                {[5,4,3,2,1].map(n => {
                  const count = data.stats?.[`${['zero','one','two','three','four','five'][n]}_star`] || 0;
                  const pct = data.stats?.total_reviews ? (count / data.stats.total_reviews * 100) : 0;
                  return (
                    <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, fontSize: 13 }}>
                      <span style={{ width: 20 }}>{n}★</span>
                      <div style={{ flex: 1, height: 8, background: 'var(--line)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: 'var(--gold)', borderRadius: 4 }} />
                      </div>
                      <span style={{ width: 30, textAlign: 'right', color: '#6e6573' }}>{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {data.reviews?.map(r => (
              <div key={r.id} style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 12, padding: 20, marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div>
                    <span style={{ color: 'var(--gold)', fontSize: 14, letterSpacing: 1 }}>{stars(r.rating)}</span>
                    {r.title && <h3 style={{ margin: '4px 0 0', fontSize: 15 }}>{r.title}</h3>}
                  </div>
                  <span style={{ fontSize: 12, color: '#6e6573' }}>{new Date(r.created_at).toLocaleDateString()}</span>
                </div>
                <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--ink)', margin: 0 }}>{r.review_text}</p>
                <p style={{ fontSize: 12, color: '#6e6573', marginTop: 8 }}>
                  By {r.is_anonymous ? 'Anonymous' : r.user_name} · {r.consultation_type}
                </p>
                {r.admin_reply && (
                  <div style={{ marginTop: 12, padding: 12, background: '#f9f6f1', borderRadius: 8, borderLeft: '3px solid var(--purple)' }}>
                    <p style={{ fontSize: 12, fontWeight: 600, margin: '0 0 4px', color: 'var(--purple)' }}>Astrologer Reply</p>
                    <p style={{ fontSize: 13, margin: 0, lineHeight: 1.5 }}>{r.admin_reply}</p>
                  </div>
                )}
              </div>
            ))}

            {data.reviews?.length === 0 && <p style={{ textAlign: 'center', color: '#6e6573', padding: 40 }}>No reviews yet.</p>}

            {data.total > 10 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 24 }}>
                <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="btn-outline">← Previous</button>
                <span style={{ lineHeight: '36px' }}>Page {page}</span>
                <button disabled={page * 10 >= data.total} onClick={() => setPage(page + 1)} className="btn-outline">Next →</button>
              </div>
            )}
          </>
        )}
      </section>
    </Shell>
  );
}
