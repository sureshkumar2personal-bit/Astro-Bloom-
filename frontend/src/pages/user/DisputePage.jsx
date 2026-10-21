import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Shell from '../../components/common/Shell';
import { getAccessToken } from '../../api/client';

export default function DisputePage() {
  const { questionId } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ reason: '', description: '', expectedResolution: 're_answer' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.reason) return setError('Please select a reason.');
    setSubmitting(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/user/question-disputes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAccessToken()}` },
        body: JSON.stringify({ questionId, ...form })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message);
      navigate(`/user/questions/${questionId}`);
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <Shell>
      <section className="dispute-page">
        <Link to={-1} className="back-link">← Back</Link>
        <p className="eyebrow">RAISE DISPUTE</p>
        <h1>Report an issue with your answer</h1>
        <div className="dispute-form-wrap">
          <form onSubmit={handleSubmit} className="submit-form">
            <div className="form-group">
              <label>Reason *</label>
              <select value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })}>
                <option value="">Select reason</option>
                <option value="Incomplete answer">Incomplete answer</option>
                <option value="Incorrect information">Incorrect information</option>
                <option value="Off topic">Answer was off topic</option>
                <option value="Too brief">Too brief / generic</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label>Expected Resolution</label>
              <select value={form.expectedResolution} onChange={e => setForm({ ...form, expectedResolution: e.target.value })}>
                <option value="re_answer">Re-answer the question</option>
                <option value="refund">Full refund</option>
                <option value="partial_refund">Partial refund</option>
              </select>
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea rows={4} placeholder="Explain the issue in detail…" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            {error && <p className="form-error">{error}</p>}
            <div className="submit-actions">
              <button type="submit" className="btn-submit" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit Dispute'}</button>
              <Link to={-1} className="btn-save">Cancel</Link>
            </div>
          </form>
        </div>
      </section>
    </Shell>
  );
}
