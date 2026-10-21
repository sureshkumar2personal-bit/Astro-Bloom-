import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Shell from '../../components/common/Shell';
import { getAccessToken } from '../../api/client';

export default function PurchaseSuccessPage() {
  const { purchaseId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/user/question-purchases/${purchaseId}`, {
      headers: { Authorization: `Bearer ${getAccessToken()}` }
    })
      .then(r => r.json())
      .then(r => { if (r.success) setData(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [purchaseId]);

  if (loading) return <Shell><section className="purchase-success-page"><div className="explore-loading"><h2>Loading…</h2></div></section></Shell>;
  if (!data) return <Shell><section className="purchase-success-page"><div className="explore-empty"><h2>Purchase not found</h2></div></section></Shell>;

  return (
    <Shell>
      <section className="purchase-success-page">
        <div className="success-card">
          <div className="success-icon">✓</div>
          <p className="eyebrow">PURCHASE SUCCESSFUL</p>
          <h1>Your question slot is booked</h1>
          <div className="success-details">
            <div className="sd-row"><span>Purchase Code</span><b>{data.purchaseCode}</b></div>
            <div className="sd-row"><span>Campaign</span><b>{data.campaignName}</b></div>
            <div className="sd-row"><span>Answer Mode</span><b>{data.answerMode}</b></div>
            <div className="sd-row"><span>Amount Paid</span><b>₹{data.price}</b></div>
            <div className="sd-row"><span>Deadline</span><b>{data.deadlineHours} hours from submission</b></div>
          </div>
          <div className="success-actions">
            <Link className="svc-btn primary" to={`/user/submit-question/${purchaseId}`}>Submit Question Now →</Link>
            <Link className="btn-save" to="/user/dashboard">Submit Later</Link>
          </div>
        </div>
      </section>
    </Shell>
  );
}
