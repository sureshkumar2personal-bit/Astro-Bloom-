import StarRating from '../common/StarRating';

export default function ReviewList({ reviews }) {
  if (!reviews.length) return <p className="muted">No reviews yet.</p>;
  return (
    <>
      {reviews.map(r => (
        <div key={r.id} className="review-item">
          <div className="review-header">
            <StarRating rating={r.rating} />
            <span className="review-type">{r.serviceType}</span>
          </div>
          <p className="review-text">{r.reviewText}</p>
        </div>
      ))}
    </>
  );
}
