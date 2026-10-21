import { useParams, Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Shell from '../../components/common/Shell';
import AstrologerProfileHeader from '../../components/astrologers/AstrologerProfileHeader';
import ServiceActionPanel from '../../components/astrologers/ServiceActionPanel';
import ReviewList from '../../components/astrologers/ReviewList';
import { useAstrologerProfile } from '../../hooks/useAstrologerProfile';
import { getAstrologerPublicPlans } from '../../api/subscriptionApi';
import { checkFollowStatus } from '../../api/followApi';

export default function AstrologerProfilePage() {
  const { astrologerId } = useParams();
  const navigate = useNavigate();
  const { profile, reviews, loading, error } = useAstrologerProfile(astrologerId);
  const [plans, setPlans] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    if (!astrologerId) return;
    getAstrologerPublicPlans(astrologerId).then(r => setPlans(r.data)).catch(() => {});
    checkFollowStatus(astrologerId).then(r => setIsFollowing(r.data.isFollowing)).catch(() => {});
  }, [astrologerId]);

  if (loading) return <Shell><section className="profile-page"><p className="eyebrow">LOADING PROFILE</p><h1>Gathering details…</h1></section></Shell>;
  if (error) return <Shell><section className="profile-page"><h1>Profile unavailable</h1><p>{error}</p><Link className="primary" to="/user/astrologers">← Back to explore</Link></section></Shell>;

  const p = profile;

  return (
    <Shell>
      <section className="profile-page">
        <Link className="back-link" to="/user/astrologers">← Back to astrologers</Link>
        <div className="profile-layout">
          <div className="profile-main">
            <AstrologerProfileHeader profile={p} />
            <div className="profile-section">
              <h2>About</h2>
              <p className="profile-bio">{p.shortBio}</p>
              {p.longBio && <p className="profile-longbio">{p.longBio}</p>}
            </div>
            {p.consultationStyle && (
              <div className="profile-section"><h2>Consultation Style</h2><p>{p.consultationStyle}</p></div>
            )}
            <div className="profile-section">
              <h2>Specializations</h2>
              <div className="profile-tags">
                {p.specializations?.map(s => <span key={s} className="tag-spec">{s}</span>)}
              </div>
            </div>
            {plans.length > 0 && (
              <div className="profile-section">
                <h2>Subscription Plans</h2>
                <div className="profile-plans-list">
                  {plans.map(plan => (
                    <div key={plan.id} className="profile-plan-card">
                      <div className="ppc-header">
                        <h3>{plan.planName}</h3>
                        <b>₹{plan.price}<span>/mo</span></b>
                      </div>
                      <ul className="ppc-benefits">
                        {plan.benefits.map((b, i) => (
                          <li key={i}>✓ {b.benefitName} ({b.benefitValue})</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                  <button className="btn-submit" onClick={() => navigate(`/user/subscriptions/${p.id}/subscribe`)}>Subscribe →</button>
                </div>
              </div>
            )}
            {p.questionOffers?.length > 0 && (
              <div className="profile-section">
                <h2>Question Offers</h2>
                <div className="question-offers-list">
                  {p.questionOffers.map(c => (
                    <div key={c.campaignId} className="question-offer-item">
                      <div className="qoi-left">
                        <b>{c.campaignName}</b>
                        <span>₹{c.price} · {c.submissionMode} → {c.answerMode}</span>
                        <span>{c.availableSlots} slots · {c.deadlineHours}h deadline</span>
                      </div>
                      <button className="btn-view" onClick={() => navigate(`/user/question-purchase/${c.campaignId}`)}>
                        Buy ₹{c.price} →
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {p.certificates?.length > 0 && (
              <div className="profile-section">
                <h2>Certificates</h2>
                {p.certificates.map((c, i) => (
                  <div key={i} className="cert-item">
                    <span className="cert-icon">📜</span>
                    <span>{c.certificateName}</span>
                    <span className="cert-badge">✓ Verified</span>
                  </div>
                ))}
              </div>
            )}
            <div className="profile-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0 }}>Reviews</h2>
                <Link to={`/user/astrologers/${astrologerId}/reviews`} style={{ fontSize: 13, color: 'var(--purple)', textDecoration: 'none' }}>View All Reviews →</Link>
              </div>
              <ReviewList reviews={reviews} />
            </div>
          </div>
          <div className="profile-sidebar">
            <ServiceActionPanel profile={p} subscriptionPlans={plans} isFollowing={isFollowing} />
          </div>
        </div>
      </section>
    </Shell>
  );
}
