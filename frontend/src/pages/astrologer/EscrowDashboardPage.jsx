import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Shell from '../../components/common/Shell';
import Notice from '../../components/common/Notice';
import { getAstrologerPayments, getEarningsSummary } from '../../api/paymentApi';

export default function EscrowDashboardPage() {
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [msg] = useState('');

  useEffect(() => {
    getAstrologerPayments().then(r => setPayments(r.data)).catch(() => {});
    getEarningsSummary().then(r => setSummary(r.data)).catch(() => {});
  }, []);

  return <Shell>
    <section className="escrow-dashboard-page">
      <div className="page-header"><h1>Earnings & Escrow</h1></div>
      {summary && <div className="earnings-summary">
        <div className="earn-card"><span>Wallet Balance</span><b>₹{summary.walletBalance}</b></div>
        <div className="earn-card"><span>Total Earned</span><b>₹{summary.totalEarned}</b></div>
        <div className="earn-card"><span>Pending in Escrow</span><b>₹{summary.pendingEarnings}</b></div>
        {summary.byService?.map(s => <div key={s.serviceType} className="earn-card"><span>{s.serviceType}</span><b>₹{s.total} ({s.count})</b></div>)}
      </div>}
      <h2>Recent Transactions</h2>
      {payments.length === 0 ? <div className="empty-state"><p>No transactions yet.</p></div> : (
        <div className="payments-list">
          {payments.map(p => (
            <div key={p.id} className="payment-card">
              <div className="pay-info">
                <span className="pay-type">{p.service_type}</span>
                <span className="pay-amount">₹{p.amount}</span>
              </div>
              <div className="pay-meta">
                <span className={`pay-status pay-${p.payment_status}`}>{p.payment_status}</span>
                <span className="pay-escrow">Escrow: {p.escrow_status}</span>
                <span className="pay-date">{new Date(p.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      <Link className="outline-link" to="/astrologer/wallet">← Wallet</Link>
    </section>
  </Shell>;
}
