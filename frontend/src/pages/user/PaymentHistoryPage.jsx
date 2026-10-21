import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Shell from '../../components/common/Shell';
import Notice from '../../components/common/Notice';
import { getUserPayments, getPaymentSummary, getReceipt } from '../../api/paymentApi';

export default function PaymentHistoryPage() {
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [filter, setFilter] = useState('all');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    getUserPayments(filter === 'all' ? '' : filter).then(r => setPayments(r.data)).catch(() => {});
    getPaymentSummary().then(r => setSummary(r.data)).catch(() => {});
  }, [filter]);

  async function handleReceipt(id) {
    try { const r = await getReceipt(id); alert(JSON.stringify(r.data, null, 2)); } catch (err) { setMsg(err.message); }
  }

  return <Shell>
    <section className="payments-page">
      <div className="page-header"><h1>Payment History</h1></div>
      {summary && <div className="payment-summary-card">
        <div className="sum-item"><span>Total Spent</span><b>₹{summary.totalSpent}</b></div>
        {summary.byService?.map(s => <div key={s.serviceType} className="sum-item"><span>{s.serviceType}</span><b>₹{s.total} ({s.count})</b></div>)}
      </div>}
      <div className="filter-pills">
        {['all','completed','pending','refunded'].map(f => <button key={f} className={filter === f ? 'active' : ''} onClick={() => setFilter(f)}>{f}</button>)}
      </div>
      <Notice message={msg} />
      {payments.length === 0 ? <div className="empty-state"><p>No payments yet.</p></div> : (
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
              <button className="btn-receipt" onClick={() => handleReceipt(p.id)}>View Receipt</button>
            </div>
          ))}
        </div>
      )}
    </section>
  </Shell>;
}
