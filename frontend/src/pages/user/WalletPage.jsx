import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Shell from '../../components/common/Shell';
import { getAccessToken } from '../../api/client';

export default function WalletPage() {
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [topping, setTopping] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/user/wallet/balance`, {
        headers: { Authorization: `Bearer ${getAccessToken()}` }
      }).then(r => r.json()),
      fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/user/wallet/transactions`, {
        headers: { Authorization: `Bearer ${getAccessToken()}` }
      }).then(r => r.json())
    ]).then(([wRes, tRes]) => {
      if (wRes.success) setWallet(wRes.data);
      if (tRes.success) setTransactions(tRes.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleTopUp = async () => {
    const amount = parseFloat(topUpAmount);
    if (!amount || amount <= 0) return;
    setTopping(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/user/wallet/topup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAccessToken()}` },
        body: JSON.stringify({ amount })
      });
      const result = await res.json();
      if (result.success) {
        setWallet({ ...wallet, availableBalance: result.data.availableBalance });
        setTopUpAmount('');
        // Refresh transactions
        const tRes = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/user/wallet/transactions`, {
          headers: { Authorization: `Bearer ${getAccessToken()}` }
        }).then(r => r.json());
        if (tRes.success) setTransactions(tRes.data);
      }
    } catch {}
    setTopping(false);
  };

  if (loading) return <Shell><section className="wallet-page"><div className="explore-loading"><h2>Loading wallet…</h2></div></section></Shell>;

  return (
    <Shell>
      <section className="wallet-page">
        <p className="eyebrow">YOUR WALLET</p>
        <h1>Wallet Balance</h1>
        <div className="wallet-layout">
          <div className="wallet-main">
            <div className="wallet-balance-card">
              <div className="wb-row"><small>Available Balance</small><b>₹{wallet?.availableBalance || 0}</b></div>
              <div className="wb-row"><small>Held in Escrow</small><b>₹{wallet?.holdBalance || 0}</b></div>
              <div className="wb-row"><small>Pending</small><b>₹{wallet?.pendingBalance || 0}</b></div>
            </div>
            <div className="wallet-topup-card">
              <h2>Top Up Wallet</h2>
              <div className="topup-row">
                <input type="number" min="1" placeholder="Enter amount" value={topUpAmount} onChange={e => setTopUpAmount(e.target.value)} />
                <button className="btn-submit" disabled={topping || !topUpAmount} onClick={handleTopUp}>{topping ? 'Processing…' : 'Top Up'}</button>
              </div>
              <div className="topup-quick">
                {[100, 500, 1000, 2000].map(amt => (
                  <button key={amt} className="quick-btn" onClick={() => setTopUpAmount(String(amt))}>₹{amt}</button>
                ))}
              </div>
            </div>
          </div>
          <div className="wallet-sidebar">
            <div className="wallet-txn-card">
              <h2>Recent Transactions</h2>
              {transactions.length === 0 ? <p className="muted">No transactions yet.</p> : transactions.map(t => (
                <div key={t.id} className="txn-row">
                  <div className="txn-info">
                    <b>{t.transactionType?.replace(/_/g, ' ')}</b>
                    <span>{t.description || t.serviceType || '—'}</span>
                  </div>
                  <div className={`txn-amount ${t.transactionType?.includes('credit') || t.transactionType?.includes('topup') ? 'credit' : 'debit'}`}>
                    {t.transactionType?.includes('credit') || t.transactionType?.includes('topup') ? '+' : '-'}₹{t.amount}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </Shell>
  );
}
