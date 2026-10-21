import { useState, useEffect } from 'react';
import { getAtonementRevenue } from '../../api/atonementApi';
import AstrologerLayout from '../../components/astrologer/AstrologerLayout';

const REVENUE_SOURCES = ['digital_atonement', 'pooja_booking', 'ecommerce_commission', 'referral_purchase', 'discount_code_purchase', 'platform_ritual'];
const STATUSES = ['pending', 'confirmed', 'released', 'refunded'];

function formatLabel(s) { return (s || '').replace(/_/g, ' '); }

export default function AtonementRevenuePage() {
  const [summary, setSummary] = useState(null);
  const [items, setItems] = useState([]);
  const [filters, setFilters] = useState({ status: '', revenueSource: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (filters.status) params.status = filters.status;
    if (filters.revenueSource) params.revenueSource = filters.revenueSource;
    getAtonementRevenue(params)
      .then(r => { setSummary(r.data.summary); setItems(r.data.items); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filters]);

  return (
    <AstrologerLayout>
      <section className="page">
        <div className="page-header-block">
          <p className="eyebrow">ATONEMENT REVENUE</p>
          <h1>Remedy Revenue Tracking</h1>
        </div>

        {summary && (
          <div className="atonement-summary-row">
            <div className="atonement-summary-card"><small>Total Revenue</small><b>₹{Number(summary.gross).toLocaleString()}</b></div>
            <div className="atonement-summary-card" style={{ borderColor: '#c0392b' }}><small>Platform Commission</small><b style={{ color: '#c0392b' }}>₹{Number(summary.platform_commission).toLocaleString()}</b></div>
            <div className="atonement-summary-card" style={{ borderColor: '#27ae60' }}><small>Your Earnings</small><b style={{ color: '#27ae60' }}>₹{Number(summary.astrologer_commission).toLocaleString()}</b></div>
            <div className="atonement-summary-card"><small>Total Records</small><b>{summary.total}</b></div>
          </div>
        )}

        <div className="atonement-filters">
          <select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })}>
            <option value="">All Status</option>
            {STATUSES.map(s => <option key={s} value={s}>{formatLabel(s)}</option>)}
          </select>
          <select value={filters.revenueSource} onChange={e => setFilters({ ...filters, revenueSource: e.target.value })}>
            <option value="">All Sources</option>
            {REVENUE_SOURCES.map(s => <option key={s} value={s}>{formatLabel(s)}</option>)}
          </select>
        </div>

        {loading ? <p style={{ color: '#6e6573', padding: 20 }}>Loading...</p> : items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#928994' }}>
            <p style={{ fontSize: 40, margin: 0 }}>💰</p>
            <p>No revenue records yet.</p>
          </div>
        ) : (
          <div className="fc-table-wrap">
            <table className="fc-table">
              <thead>
                <tr>
                  <th>User</th><th>Remedy</th><th>Source</th><th>Gross</th><th>Platform</th><th>Your Earning</th><th>Status</th><th>Date</th>
                </tr>
              </thead>
              <tbody>
                {items.map(r => (
                  <tr key={r.id}>
                    <td>{r.user_name || 'Unknown'}</td>
                    <td><small>{r.atonement_title || '-'}</small></td>
                    <td><small>{formatLabel(r.revenue_source)}</small></td>
                    <td>₹{Number(r.gross_amount).toFixed(0)}</td>
                    <td style={{ color: '#c0392b' }}>₹{Number(r.platform_commission).toFixed(0)}</td>
                    <td style={{ color: '#27ae60' }}>₹{Number(r.astrologer_commission).toFixed(0)}</td>
                    <td><span className="atonement-status-badge" style={{ background: r.status === 'released' ? '#27ae60' : r.status === 'pending' ? '#db9a40' : '#999' }}>{r.status}</span></td>
                    <td><small>{new Date(r.created_at).toLocaleDateString()}</small></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AstrologerLayout>
  );
}
