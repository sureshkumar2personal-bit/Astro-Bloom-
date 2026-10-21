export default function ProfileCompletenessCard({ completeness }) {
  return (
    <div className="edit-completeness">
      <div className="completeness-bar">
        <div className="completeness-fill" style={{ width: `${completeness}%` }} />
      </div>
      <span>{completeness}% complete</span>
    </div>
  );
}
