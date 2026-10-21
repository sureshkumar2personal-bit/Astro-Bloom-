import { useNavigate } from 'react-router-dom';
import StarRating from '../common/StarRating';

export default function AstrologerCard({ a }) {
  const nav = useNavigate();
  const go = () => nav(`/user/astrologers/${a.id}`);
  const buy = (e) => { e.stopPropagation(); nav(`/user/question-purchase/${a.questionOffer.campaignId}`); };

  return (
    <article className="astro-card">
      <div className="astro-card-top">
        <div className="astro-card-photo">{a.displayName?.charAt(0) || '✦'}</div>
        <div className="astro-card-info">
          <div className="astro-card-name-row">
            <h3>{a.displayName}</h3>
            {a.averageRating >= 4.7 && <span className="badge-verified">✓ Verified</span>}
          </div>
          <p className="astro-card-title">{a.professionalTitle}</p>
          <div className="astro-card-rating">
            <StarRating rating={a.averageRating} />
            <span className="review-count">{a.reviewCount} reviews</span>
          </div>
          <p className="astro-card-exp">{a.experienceYears} years experience</p>
        </div>
      </div>
      <div className="astro-card-tags">
        {a.specializations?.slice(0, 3).map(s => <span key={s} className="tag-spec">{s}</span>)}
      </div>
      <div className="astro-card-tags">
        {a.languages?.map(l => <span key={l} className="tag-lang">{l}</span>)}
      </div>
      <div className="astro-card-status">
        <span className={`status-dot ${a.onlineStatus}`}>
          {a.onlineStatus === 'online' ? '● Online' : a.onlineStatus === 'busy' ? '● Busy' : '● Offline'}
        </span>
        {a.questionAvailable && <span className="badge-svc">Question ₹{a.startingQuestionPrice}</span>}
        {a.appointmentAvailable && <span className="badge-svc">Appointment</span>}
        {a.emergencyAvailable && <span className="badge-svc badge-emergency">Emergency</span>}
        {a.liveNow && <span className="badge-svc badge-live">● Live Now</span>}
      </div>
      {a.questionOffer && (
        <div className="astro-card-offer">
          <span className="offer-badge">✦ {a.questionOffer.campaignName}</span>
          <span className="offer-meta">₹{a.questionOffer.price} · {a.questionOffer.answerMode} answer · {a.questionOffer.availableSlots} slots left</span>
        </div>
      )}
      <div className="astro-card-actions">
        {a.questionOffer ? (
          <>
            <button className="btn-follow" onClick={go}>Profile</button>
            <button className="btn-view" onClick={buy}>Buy Question ₹{a.questionOffer.price} →</button>
          </>
        ) : (
          <>
            <button className="btn-follow" onClick={go}>Follow</button>
            <button className="btn-view" onClick={go}>View Profile →</button>
          </>
        )}
      </div>
    </article>
  );
}
