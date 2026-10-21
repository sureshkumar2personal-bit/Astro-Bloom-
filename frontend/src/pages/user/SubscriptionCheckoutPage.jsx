import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Shell from '../../components/common/Shell';
import { getAstrologerPublicPlans, subscribe } from '../../api/subscriptionApi';

export default function SubscriptionCheckoutPage() {
  const { astrologerId } = useParams();
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    getAstrologerPublicPlans(astrologerId)
      .then(r => { setPlans(r.data); if (r.data.length) setSelected(r.data[0].id); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [astrologerId]);

  async function handleSubscribe() {
    if (!selected || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await subscribe(astrologerId, selected);
      navigate(`/user/subscriptions`);
    } catch (e) { setError(e.message); }
    finally { setSubmitting(false); }
  }

  const chosen = plans.find(p => p.id === selected);

  if (loading) return <Shell><section className="checkout-page"><h1>Subscribe</h1><p>Loading plans...</p></section></Shell>;

  return (
    <Shell>
      <section className="checkout-page">
        <Link className="back-link" to={`/user/astrologers/${astrologerId}`}>← Back to profile</Link>
        <p className="eyebrow">SUBSCRIPTION</p>
        <h1>Choose a Plan</h1>

        {error && <p className="form-error">{error}</p>}

        <div className="checkout-layout">
          <div className="checkout-plans">
            {plans.map(plan => (
              <div key={plan.id} className={`checkout-plan-card ${selected === plan.id ? 'selected' : ''}`} onClick={() => setSelected(plan.id)}>
                <div className="cpc-header">
                  <h3>{plan.planName}</h3>
                  <b className="cpc-price">₹{plan.price}<span>/mo</span></b>
                </div>
                <p className="cpc-desc">{plan.description || 'Access premium benefits'}</p>
                <ul className="cpc-benefits">
                  {plan.benefits.map((b, i) => (
                    <li key={i}>✓ {b.benefitName} ({b.benefitValue})</li>
                  ))}
                </ul>
                <div className="cpc-duration">{plan.durationDays} days</div>
              </div>
            ))}
            {plans.length === 0 && !error && <p className="subs-empty">No subscription plans available for this astrologer.</p>}
          </div>

          <div className="checkout-summary">
            <h2>Summary</h2>
            {chosen && (
              <>
                <div className="cs-row"><span>Plan</span><b>{chosen.planName}</b></div>
                <div className="cs-row"><span>Duration</span><b>{chosen.durationDays} days</b></div>
                <div className="cs-row cs-total"><span>Total</span><b>₹{chosen.price}</b></div>
                <p className="cs-note">Payment will be deducted from your wallet.</p>
                {error && <p className="form-error">{error}</p>}
                <button className="btn-submit" disabled={!selected || submitting} onClick={handleSubscribe}>
                  {submitting ? 'Processing...' : 'Subscribe Now'}
                </button>
              </>
            )}
          </div>
        </div>
      </section>
    </Shell>
  );
}
