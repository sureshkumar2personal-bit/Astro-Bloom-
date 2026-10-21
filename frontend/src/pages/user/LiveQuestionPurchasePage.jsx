import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Shell from '../../components/common/Shell';
import { getLiveSessionDetails, purchaseLiveQuestion } from '../../api/liveApi';

export default function LiveQuestionPurchasePage() {
  const { liveSessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    getLiveSessionDetails(liveSessionId)
      .then(r => setSession(r.data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [liveSessionId]);

  async function handlePurchase() {
    if (purchasing) return;
    setPurchasing(true);
    setError(null);
    try {
      const res = await purchaseLiveQuestion(liveSessionId);
      navigate(`/user/live/${liveSessionId}`);
    } catch (e) { setError(e.message); }
    finally { setPurchasing(false); }
  }

  if (loading) return <Shell><section className="purchase-page"><p>Loading...</p></section></Shell>;
  if (!session) return <Shell><section className="purchase-page"><h1>Session not found</h1></section></Shell>;

  const s = session;
  const slotsLeft = s.maxQuestionSlots - s.soldQuestionSlots;

  return (
    <Shell>
      <section className="purchase-page">
        <Link className="back-link" to={`/user/live/${liveSessionId}`}>← Back to live</Link>
        <p className="eyebrow">LIVE QUESTION</p>
        <h1 className="purchase-title">Buy Live Question Slot</h1>

        <div className="purchase-layout">
          <div className="purchase-main">
            <div className="purchase-astro-card">
              <div className="astro-card-photo">{s.astrologerName?.[0]}</div>
              <div>
                <h3>{s.astrologerName}</h3>
                <p>{s.title}</p>
              </div>
            </div>

            <div className="purchase-details-card">
              <h2>Live Question Details</h2>
              <div className="purchase-detail-grid">
                <div className="pd-item"><small>Live Session</small><b>{s.title}</b></div>
                <div className="pd-item"><small>Answer Mode</small><b>Live Answer</b></div>
                <div className="pd-item"><small>Topic</small><b>{s.topic}</b></div>
                <div className="pd-item"><small>Language</small><b>{s.language}</b></div>
                <div className="pd-item"><small>Slots Available</small><b>{slotsLeft > 0 ? slotsLeft : 'Sold out'}</b></div>
                <div className="pd-item"><small>Queue Rules</small><b>First come, first served</b></div>
              </div>
            </div>

            <div className="purchase-details-card">
              <h2>Terms</h2>
              <ul className="live-question-terms">
                <li>Your payment will be held in escrow until the astrologer answers.</li>
                <li>If your question is not answered before the live ends, you will receive a full refund.</li>
                <li>Questions are answered in the order they are received.</li>
                <li>Keep your question concise and clear.</li>
              </ul>
            </div>
          </div>

          <div className="purchase-summary-card">
            <h2>Payment Summary</h2>
            <div className="ps-row"><span>Live Question Slot</span><b>{s.title}</b></div>
            <div className="ps-row"><span>Astrologer</span><b>{s.astrologerName}</b></div>
            <div className="ps-row"><span>Answer Mode</span><b>Live</b></div>
            <div className="ps-row ps-total"><span>Total</span><b>₹{s.questionPrice}</b></div>
            <p className="ps-note">Payment is deducted from your wallet and held in escrow until your question is answered.</p>
            {error && <p className="ps-error">{error}</p>}
            <button className="btn-submit" onClick={handlePurchase} disabled={purchasing || slotsLeft <= 0}>
              {purchasing ? 'Processing...' : slotsLeft <= 0 ? 'Sold Out' : `Pay ₹${s.questionPrice} →`}
            </button>
          </div>
        </div>
      </section>
    </Shell>
  );
}
