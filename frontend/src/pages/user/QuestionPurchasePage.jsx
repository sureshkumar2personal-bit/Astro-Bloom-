import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Shell from '../../components/common/Shell';
import { getAstrologerProfile } from '../../api/astrologerApi';
import { getAccessToken } from '../../api/client';

export default function QuestionPurchasePage() {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [purchasing, setPurchasing] = useState(false);
  const [wallet, setWallet] = useState(null);

  useEffect(() => {
    Promise.all([
      fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/user/wallet/balance`, {
        headers: { Authorization: `Bearer ${getAccessToken()}` }
      }).then(r => r.json()),
      fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/user/wallet/transactions`, {
        headers: { Authorization: `Bearer ${getAccessToken()}` }
      }).then(r => r.json())
    ]).then(([wRes]) => {
      if (wRes.success) setWallet(wRes.data);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    // We need the astrologerId from URL or fetch campaigns to find the one matching this campaignId
    // Simpler: fetch all astrologers and find the campaign
    fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/user/astrologers?limit=50`, {
      headers: { Authorization: `Bearer ${getAccessToken()}` }
    })
      .then(r => r.json())
      .then(r => {
        if (!r.success) throw new Error(r.message);
        // Find astrologer with this campaignId
        for (const a of r.data.items) {
          if (a.questionOffer && a.questionOffer.campaignId === campaignId) {
            setData({ astrologer: a, campaign: a.questionOffer });
            setLoading(false);
            return;
          }
        }
        // If not found in explore, try fetching from profile
        setError('Campaign not found. It may have expired or been removed.');
        setLoading(false);
      })
      .catch(() => { setError('Failed to load campaign details.'); setLoading(false); });
  }, [campaignId]);

  const handlePurchase = async () => {
    setPurchasing(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/user/question-purchases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAccessToken()}` },
        body: JSON.stringify({ campaignId })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message);
      navigate(`/user/question-purchase/success/${result.data.purchaseId}`);
    } catch (err) {
      setError(err.message);
      setPurchasing(false);
    }
  };

  if (loading) return <Shell><section className="purchase-page"><div className="explore-loading"><h2>Loading campaign…</h2></div></section></Shell>;
  if (error) return <Shell><section className="purchase-page"><div className="explore-empty"><h2>{error}</h2><Link className="btn-view" to="/user/astrologers">← Back to Explore</Link></div></section></Shell>;
  if (!data) return null;

  const { astrologer, campaign } = data;
  const insufficient = wallet && wallet.availableBalance < campaign.price;

  return (
    <Shell>
      <section className="purchase-page">
        <Link to={-1} className="back-link">← Back</Link>
        <p className="eyebrow">QUESTION PURCHASE</p>
        <h1 className="purchase-title">Purchase a question slot</h1>
        <div className="purchase-layout">
          <div className="purchase-main">
            <div className="purchase-astro-card">
              <div className="astro-card-photo">{astrologer.displayName?.[0] || 'A'}</div>
              <div>
                <h3>{astrologer.displayName}</h3>
                <p className="astro-card-title">{astrologer.professionalTitle}</p>
                <div className="star-rating">★ {astrologer.averageRating} <b>{astrologer.reviewCount} reviews</b></div>
              </div>
            </div>
            <div className="purchase-details-card">
              <h2>{campaign.campaignName}</h2>
              <div className="purchase-detail-grid">
                <div className="pd-item"><small>Submission Mode</small><b>{campaign.submissionMode}</b></div>
                <div className="pd-item"><small>Answer Mode</small><b>{campaign.answerMode}</b></div>
                <div className="pd-item"><small>Deadline</small><b>{campaign.deadlineHours} hours</b></div>
                <div className="pd-item"><small>Available Slots</small><b>{campaign.availableSlots}</b></div>
              </div>
            </div>
          </div>
          <div className="purchase-sidebar">
            <div className="purchase-summary-card">
              <h2>Order Summary</h2>
              <div className="ps-row"><span>Campaign</span><b>{campaign.campaignName}</b></div>
              <div className="ps-row"><span>Answer Mode</span><b>{campaign.answerMode}</b></div>
              <div className="ps-row ps-total"><span>Total</span><b>₹{campaign.price}</b></div>
              {wallet && (
                <div className="ps-wallet">
                  <span>Wallet Balance</span>
                  <b className={insufficient ? 'insufficient' : ''}>₹{wallet.availableBalance}</b>
                </div>
              )}
              <p className="ps-note">Payment held securely in escrow until answer is delivered.</p>
              {insufficient && <p className="ps-error">Insufficient wallet balance. Please top up first.</p>}
              <button className="svc-btn primary" disabled={purchasing || insufficient} onClick={handlePurchase}>
                {purchasing ? 'Processing…' : `Pay ₹${campaign.price} — Buy Question`}
              </button>
            </div>
          </div>
        </div>
      </section>
    </Shell>
  );
}
