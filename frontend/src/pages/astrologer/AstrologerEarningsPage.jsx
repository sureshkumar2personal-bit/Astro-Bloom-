import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Shell from '../../components/common/Shell';
import { apiAuthGet } from '../../api/client';

export default function AstrologerEarningsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiAuthGet('/astrologer/earnings-overview')
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Shell><section className="page" style={{ padding: 40 }}><p>Loading...</p></section></Shell>;
  if (!data) return <Shell><section className="page" style={{ padding: 40 }}><p>Unable to load earnings.</p></section></Shell>;

  const serviceLabels = { text_question: 'Text Q&A', appointment: 'Appointments', live_entry: 'Live Entry', live_question: 'Live Questions', subscription: 'Subscriptions', emergency: 'Emergency', ai_pack: 'AI Packs' };

  return (
    <Shell>
      <section className="page" style={{ maxWidth: 900, margin: '0 auto', padding: '40px 20px' }}>
        <div className="page-header-block">
          <p className="eyebrow">EARNINGS</p>
          <h1 style={{ fontFamily: "'Playfair Display', serif" }}>Earnings Overview</h1>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
          {[
            { label: 'Wallet Balance', value: `₹${Number(data.walletBalance).toLocaleString()}`, color: 'var(--purple)' },
            { label: 'Hold Balance', value: `₹${Number(data.holdBalance).toLocaleString()}`, color: 'var(--gold)' },
            { label: 'Today', value: `₹${Number(data.todayEarnings).toLocaleString()}`, color: '#2e7d32' },
            { label: 'This Week', value: `₹${Number(data.weekEarnings).toLocaleString()}`, color: '#1565c0' },
            { label: 'This Month', value: `₹${Number(data.monthEarnings).toLocaleString()}`, color: '#e65100' },
          ].map(c => (
            <div key={c.label} style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 12, padding: 20, textAlign: 'center' }}>
              <p style={{ fontSize: 12, color: '#6e6573', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 1 }}>{c.label}</p>
              <p style={{ fontSize: 28, fontWeight: 700, color: c.color, margin: 0, fontFamily: "'Playfair Display', serif" }}>{c.value}</p>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 16, padding: 24 }}>
            <h2 style={{ fontSize: 16, marginBottom: 16 }}>By Service</h2>
            {data.byService?.map(s => (
              <div key={s.service_type} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--line)', fontSize: 13 }}>
                <span>{serviceLabels[s.service_type] || s.service_type}</span>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontWeight: 600 }}>₹{Number(s.total).toLocaleString()}</span>
                  <span style={{ color: '#6e6573', marginLeft: 8 }}>({s.count})</span>
                </div>
              </div>
            ))}
            {(!data.byService || data.byService.length === 0) && <p style={{ color: '#6e6573', fontSize: 13 }}>No earnings this month yet.</p>}
          </div>

          <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 16, padding: 24 }}>
            <h2 style={{ fontSize: 16, marginBottom: 16 }}>Daily Trend</h2>
            {data.dailyTrend?.slice(-7).map(d => (
              <div key={d.date} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--line)', fontSize: 13 }}>
                <span style={{ width: 80 }}>{new Date(d.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                <div style={{ flex: 1, height: 8, background: 'var(--line)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(100, (d.earnings / (data.monthEarnings || 1)) * 700)}%`, background: 'var(--purple)', borderRadius: 4 }} />
                </div>
                <span style={{ fontWeight: 600, width: 70, textAlign: 'right' }}>₹{Number(d.earnings).toLocaleString()}</span>
              </div>
            ))}
            {(!data.dailyTrend || data.dailyTrend.length === 0) && <p style={{ color: '#6e6573', fontSize: 13 }}>No daily data yet.</p>}
          </div>
        </div>

        <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
          <Link to="/astrologer/wallet" style={{ padding: '10px 24px', background: 'var(--purple)', color: '#fff', borderRadius: 8, textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>View Wallet →</Link>
          <Link to="/astrologer/wallet/withdraw" style={{ padding: '10px 24px', border: '1px solid var(--line)', borderRadius: 8, textDecoration: 'none', fontSize: 13 }}>Request Withdrawal →</Link>
        </div>
      </section>
    </Shell>
  );
}
