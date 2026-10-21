import StarRating from '../common/StarRating';

export default function AstrologerProfileHeader({ profile: p }) {
  return (
    <div className="profile-header-card">
      <div className="profile-photo-large">{p.displayName?.charAt(0) || '✦'}</div>
      <div className="profile-header-info">
        <div className="profile-name-row">
          <h1>{p.displayName}</h1>
          {p.averageRating >= 4.7 && <span className="badge-verified">✓ Verified</span>}
        </div>
        <p className="profile-title">{p.professionalTitle}</p>
        <div className="profile-rating-row">
          <StarRating rating={p.averageRating} />
          <span>{p.reviewCount} reviews</span>
          <span className="sep">·</span>
          <span>{p.experienceYears} years experience</span>
          {p.city && <><span className="sep">·</span><span>{p.city}</span></>}
        </div>
        <div className="profile-tags">
          {p.languages?.map(l => <span key={l} className="tag-lang">{l}</span>)}
        </div>
      </div>
    </div>
  );
}
