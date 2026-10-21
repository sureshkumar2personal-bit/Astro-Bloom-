import { useEffect, useState } from 'react';
import Shell from '../../components/common/Shell';
import { apiAuthGet, apiAuthPost } from '../../api/client';

export default function AstrologerWithdrawalPage() {
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ amount: '', bankName: '', accountNumber: '', ifscCode: '', accountHolderName: '', upiId: '' });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [balance, setBalance] = useState(0);

  const load = () => {
    setLoading(true);
    Promise.all([
      apiAuthGet('/astrologer/withdrawals'),
      apiAuthGet('/astrologer/earnings-overview')
    ])
      .then(([w, e]) => { setWithdrawals(w.data); setBalance(e.data.walletBalance); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.amount || parseFloat(form.amount) <= 0) return;
    setSubmitting(true);
    setMessage('');
    try {
      await apiAuthPost('/astrologer/withdrawals', { ...form, amount: parseFloat(form.amount) });
      setMessage('Withdrawal request submitted!');
      setShowForm(false);
      setForm({ amount: '', bankName: '', accountNumber: '', ifscCode: '', accountHolderName: '', upiId: '' });
      load();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const statusBadge = (s) => {
    const colors = { pending: '#f59e0b', processing: '#3b82f6', completed: '#10b981', rejected: '#ef4444' };
    return <span style={{ padding: '2px 10px', borderRadius: 12, fontSize: 11, background: colors[s] || '#ccc', color: '#fff', textTransform: 'capitalize' }}>{s}</span>;
  };

  return (
    <Shell>
      <section className="page" style={{ maxWidth: 800, margin: '0 auto', padding: '40px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div className="page-header-block" style={{ marginBottom: 0 }}>
            <p className="eyebrow">WITHDRAWAL</p>
            <h1 style={{ fontFamily: "'Playfair Display', serif" }}>Withdraw Funds</h1>
          </div>
          <button onClick={() => setShowForm(!showForm)} style={{ padding: '10px 20px', background: 'var(--purple)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {showForm ? 'Cancel' : '+ New Withdrawal'}
          </button>
        </div>

        <div style={{ padding: 16, background: '#f9f6f1', borderRadius: 12, marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: '#6e6573' }}>Available Balance</span>
          <span style={{ fontSize: 24, fontWeight: 700, color: 'var(--purple)', fontFamily: "'Playfair Display', serif" }}>₹{Number(balance).toLocaleString()}</span>
        </div>

        {message && <div style={{ padding: '10px 16px', borderRadius: 8, background: message.includes('submitted') ? '#e8f5e9' : '#fce4ec', fontSize: 13, marginBottom: 16 }}>{message}</div>}

        {showForm && (
          <form onSubmit={submit} style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 16, padding: 24, marginBottom: 24 }}>
            <h2 style={{ fontSize: 16, marginBottom: 16 }}>Withdrawal Details</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {[
                { label: 'Amount (₹)', key: 'amount', type: 'number', required: true, col: 1 },
                { label: 'Bank Name', key: 'bankName', col: 2 },
                { label: 'Account Number', key: 'accountNumber', col: 1 },
                { label: 'IFSC Code', key: 'ifscCode', col: 2 },
                { label: 'Account Holder Name', key: 'accountHolderName', col: 1 },
                { label: 'UPI ID (alternative)', key: 'upiId', col: 2 },
              ].map(f => (
                <div key={f.key} style={{ gridColumn: f.col === 1 ? undefined : undefined }}>
                  <label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 4 }}>{f.label}</label>
                  <input type={f.type || 'text'} required={f.required} value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--line)', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }} />
                </div>
              ))}
            </div>
            <button type="submit" disabled={submitting} style={{ marginTop: 16, padding: '10px 24px', background: 'var(--purple)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </form>
        )}

        <h2 style={{ fontSize: 16, marginBottom: 12 }}>History</h2>
        {loading && <p>Loading...</p>}
        {!loading && withdrawals.length === 0 && <p style={{ color: '#6e6573' }}>No withdrawal requests yet.</p>}
        {withdrawals.map(w => (
          <div key={w.id} style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 12, padding: 16, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 600, fontSize: 15 }}>₹{Number(w.amount).toLocaleString()}</span>
                {statusBadge(w.status)}
              </div>
              <p style={{ fontSize: 12, color: '#6e6573', margin: '4px 0 0' }}>
                {w.bank_name || w.upi_id} · {new Date(w.created_at).toLocaleDateString()}
              </p>
              {w.rejection_reason && <p style={{ fontSize: 12, color: '#ef4444', margin: '4px 0 0' }}>Reason: {w.rejection_reason}</p>}
            </div>
            {w.processed_at && <span style={{ fontSize: 11, color: '#6e6573' }}>Processed {new Date(w.processed_at).toLocaleDateString()}</span>}
          </div>
        ))}
      </section>
    </Shell>
  );
}
