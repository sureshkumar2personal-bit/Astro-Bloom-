import { useEffect, useState } from 'react';
import Shell from '../../components/common/Shell';
import { apiAuthGet } from '../../api/client';

export default function AstrologerProfileCompletionPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiAuthGet('/astrologer/profile-completion')
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Shell><section className="page" style={{ padding: 40 }}><p>Loading...</p></section></Shell>;
  if (!data) return <Shell><section className="page" style={{ padding: 40 }}><p>Unable to load profile data.</p></section></Shell>;

  const completed = data.checks.filter(c => c.done).length;
  const total = data.checks.length;

  return (
    <Shell>
      <section className="page" style={{ maxWidth: 700, margin: '0 auto', padding: '40px 20px' }}>
        <div className="page-header-block" style={{ textAlign: 'center', marginBottom: 32 }}>
          <p className="eyebrow">PROFILE OPTIMIZATION</p>
          <h1 style={{ fontFamily: "'Playfair Display', serif" }}>Profile Completion</h1>
          <p style={{ color: '#6e6573', marginTop: 4 }}>Complete your profile to attract more seekers</p>
        </div>

        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 140, height: 140, borderRadius: '50%', border: '8px solid var(--line)', margin: '0 auto', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="140" height="140" style={{ position: 'absolute', top: -8, left: -8, transform: 'rotate(-90deg)' }}>
              <circle cx="70" cy="70" r="62" fill="none" stroke="var(--line)" strokeWidth="8" />
              <circle cx="70" cy="70" r="62" fill="none" stroke="var(--purple)" strokeWidth="8"
                strokeDasharray={`${(data.percentage / 100) * 390} 390`} strokeLinecap="round" />
            </svg>
            <span style={{ fontSize: 32, fontWeight: 700, color: 'var(--purple)', fontFamily: "'Playfair Display', serif" }}>{data.percentage}%</span>
          </div>
          <p style={{ fontSize: 14, color: '#6e6573', marginTop: 12 }}>{completed}/{total} items completed</p>
        </div>

        <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 16, overflow: 'hidden' }}>
          {data.checks.map((c, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: i < data.checks.length - 1 ? '1px solid var(--line)' : 'none' }}>
              <span style={{ width: 28, height: 28, borderRadius: '50%', background: c.done ? '#10b981' : 'var(--line)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                {c.done ? '✓' : '○'}
              </span>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 14, fontWeight: c.done ? 400 : 500 }}>{c.label}</span>
                {!c.done && <span style={{ fontSize: 11, color: '#6e6573', marginLeft: 8 }}>+{c.points} points</span>}
              </div>
              {c.done && <span style={{ fontSize: 12, color: '#10b981' }}>Done</span>}
            </div>
          ))}
        </div>

        <div style={{ marginTop: 24, padding: 20, background: '#f9f6f1', borderRadius: 12 }}>
          <h3 style={{ fontSize: 14, margin: '0 0 8px' }}>Tips to improve:</h3>
          <ul style={{ fontSize: 13, color: '#6e6573', margin: 0, paddingLeft: 20 }}>
            {!data.checks.find(c => c.label === 'Profile Photo')?.done && <li>Add a professional photo — profiles with photos get 3x more views</li>}
            {!data.checks.find(c => c.label === 'Long Bio')?.done && <li>Write a detailed bio about your practice and approach</li>}
            {!data.checks.find(c => c.label === 'Certificates (1+)')?.done && <li>Upload certificates to earn a verified badge</li>}
            {!data.checks.find(c => c.label === 'Languages (2+)')?.done && <li>Add multiple languages to reach more seekers</li>}
          </ul>
        </div>
      </section>
    </Shell>
  );
}
