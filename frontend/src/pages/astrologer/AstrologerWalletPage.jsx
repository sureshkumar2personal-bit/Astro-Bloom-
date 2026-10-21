import { useEffect, useState } from 'react';
import Shell from '../../components/common/Shell';
import { getAccessToken } from '../../api/client';

export default function AstrologerWalletPage() {
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/astrologer/wallet/balance`, {
        headers: { Authorization: `Bearer ${getAccessToken()}` }
      }).then(r => r.json()),
      fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/astrologer/wallet/transactions`, {
        headers: { Authorization: `Bearer ${getAccessToken()}` }
      }).then(r => r.json())
    ]).then(([wRes, tRes]) => {
      if (wRes.success) setWallet(wRes.data);
      if (tRes.success) setTransactions(tRes.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <Shell><section className="wallet-page"><div className="explore-loading"><h2>Loading wallet…</h2></div></section></Shell>;

  return (
    <Shell>
      <section className="wallet-page">
        <p className="eyebrow">ASTROLOGER WALLET</p>
        <h1>Wallet & Settlements</h1>
        <div className="wallet-layout">
          <div className="wallet-main">
            <div className="wallet-balance-card">
              <div className="wb-row"><small>Available Balance</small><b>₹{wallet?.availableBalance || 0}</b></div>
              <div className="wb-row"><small>Pending Settlement</small><b>₹{wallet?.pendingBalance || 0}</b></div>
              <div className="wb-row"><small>Held (Escrow)</small><b>₹{wallet?.holdBalance || 0}</b></div>
            </div>
          </div>
          <div className="wallet-sidebar">
            <div className="wallet-txn-card">
              <h2>Recent Transactions</h2>
              {transactions.length === 0 ? <p className="muted">No transactions yet.</p> : transactions.map(t => (
                <div key={t.id} className="txn-row">
                  <div className="txn-info"><b>{t.transactionType?.replace(/_/g, ' ')}</b><span>{t.description || '—'}</span></div>
                  <div className={`txn-amount ${t.transactionType?.includes('credit') ? 'credit' : 'debit'}`}>{t.transactionType?.includes('credit') ? '+' : '-'}₹{t.amount}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </Shell>
  );
}
