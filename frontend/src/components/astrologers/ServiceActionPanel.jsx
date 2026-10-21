import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { followAstrologer, unfollowAstrologer, checkFollowStatus } from '../../api/followApi';

export default function ServiceActionPanel({ profile: p, subscriptionPlans = [], isFollowing: initialFollowing = false }) {
  const nav = useNavigate();
  const s = p.serviceStatus;
  const a = p.actions;
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const [loadingFollow, setLoadingFollow] = useState(false);

  useEffect(() => {
    setIsFollowing(initialFollowing);
  }, [initialFollowing]);

  async function handleFollowToggle() {
    if (loadingFollow) return;
    setLoadingFollow(true);
    try {
      if (isFollowing) {
        await unfollowAstrologer(p.id);
        setIsFollowing(false);
      } else {
        await followAstrologer(p.id);
        setIsFollowing(true);
      }
    } catch (e) { alert(e.message); }
    finally { setLoadingFollow(false); }
  }

  return (
    <div className="service-panel">
      <div className="svc-status-row">
        <span className={`status-dot ${s.onlineStatus}`}>
          {s.onlineStatus === 'online' ? '● Online Now' : s.onlineStatus === 'busy' ? '● Busy' : '● Offline'}
        </span>
        {s.liveNow && <span className="badge-svc badge-live">● Live Now</span>}
      </div>

      {p.pricing?.startingQuestionPrice && (
        <div className="svc-price">
          <small>Starting from</small>
          <b>₹{p.pricing.startingQuestionPrice}</b>
          <span>per question</span>
        </div>
      )}
      {p.pricing?.startingCallPrice && (
        <div className="svc-price">
          <small>Call from</small>
          <b>₹{p.pricing.startingCallPrice}</b>
          <span>per session</span>
        </div>
      )}

      <div className="svc-actions">
        {a.canBuyQuestion && p.questionOffer?.campaignId && <button className="primary svc-btn" onClick={() => nav(`/user/question-purchase/${p.questionOffer.campaignId}`)}>Buy Question →</button>}
        {a.canBookAppointment && <button className="svc-btn svc-appointment" onClick={() => nav(`/user/astrologers/${p.id}/book`)}>Book Appointment →</button>}
        {a.canEmergencyCall && <button className="svc-btn svc-emergency" onClick={() => nav(`/user/emergency-call?astrologerId=${p.id}`)}>Emergency Call →</button>}
        {(a.canJoinLive || s.liveNow) && <button className="svc-btn svc-live" onClick={() => nav('/user/live')}>Join Live →</button>}
        {a.canFollow && (
          <button className={`svc-btn svc-follow ${isFollowing ? 'svc-following' : ''}`} onClick={handleFollowToggle} disabled={loadingFollow}>
            {loadingFollow ? '...' : isFollowing ? '✓ Following' : 'Follow'}
          </button>
        )}
        {a.canSubscribe && <button className="svc-btn svc-subscribe" onClick={() => nav(`/user/subscriptions/${p.id}/subscribe`)}>Subscribe →</button>}
      </div>

      {subscriptionPlans.length > 0 && (
        <div className="svc-plans-preview">
          <small>Subscription Plans</small>
          {subscriptionPlans.map(plan => (
            <div key={plan.id} className="svc-plan-row">
              <span>{plan.planName}</span>
              <b>₹{plan.price}/mo</b>
            </div>
          ))}
        </div>
      )}

      {p.completedConsultations > 0 && (
        <div className="svc-stat">
          <span>✦</span>
          <b>{p.completedConsultations.toLocaleString()}</b>
          <span>consultations completed</span>
        </div>
      )}
    </div>
  );
}
