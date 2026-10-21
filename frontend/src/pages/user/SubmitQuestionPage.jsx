import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Shell from '../../components/common/Shell';
import { ALL_SPECIALIZATIONS, ALL_LANGUAGES } from '../../utils/constants';
import { getAccessToken } from '../../api/client';

export default function SubmitQuestionPage() {
  const { purchaseId } = useParams();
  const navigate = useNavigate();
  const [purchase, setPurchase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ questionType: 'general', category: '', language: '', title: '', questionText: '' });

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/user/question-purchases/${purchaseId}`, {
      headers: { Authorization: `Bearer ${getAccessToken()}` }
    })
      .then(r => r.json())
      .then(r => { if (r.success) setPurchase(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [purchaseId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.category) return setError('Please select a category.');
    if (!form.language) return setError('Please select a language.');
    if (!form.questionText.trim()) return setError('Please enter your question.');
    setSubmitting(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/user/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAccessToken()}` },
        body: JSON.stringify({ purchaseId, ...form })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message);
      navigate(`/user/questions/${result.data.questionId}`);
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  if (loading) return <Shell><section className="submit-question-page"><div className="explore-loading"><h2>Loading…</h2></div></section></Shell>;
  if (!purchase) return <Shell><section className="submit-question-page"><div className="explore-empty"><h2>Purchase not found</h2></div></section></Shell>;

  return (
    <Shell>
      <section className="submit-question-page">
        <Link to={-1} className="back-link">← Back</Link>
        <p className="eyebrow">SUBMIT YOUR QUESTION</p>
        <h1>Ask your question</h1>
        <div className="submit-layout">
          <div className="submit-main">
            <form onSubmit={handleSubmit} className="submit-form">
              <div className="sq-purchase-summary">
                <span>{purchase.campaignName}</span>
                <span className="sep">·</span>
                <span>{purchase.answerMode} answer</span>
                <span className="sep">·</span>
                <span>₹{purchase.price}</span>
              </div>

              <div className="form-group">
                <label>Question Type</label>
                <div className="toggle-group">
                  <button type="button" className={form.questionType === 'general' ? 'active' : ''} onClick={() => setForm({ ...form, questionType: 'general' })}>General</button>
                  <button type="button" className={form.questionType === 'individual' ? 'active' : ''} onClick={() => setForm({ ...form, questionType: 'individual' })}>Individual</button>
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label>Category *</label>
                  <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                    <option value="">Select category</option>
                    {ALL_SPECIALIZATIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Language *</label>
                  <select value={form.language} onChange={e => setForm({ ...form, language: e.target.value })}>
                    <option value="">Select language</option>
                    {ALL_LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Title (optional)</label>
                <input type="text" placeholder="Brief title for your question" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
              </div>

              <div className="form-group">
                <label>Your Question *</label>
                <textarea rows={6} placeholder="Describe your question in detail. Include relevant birth details if this is an individual question." value={form.questionText} onChange={e => setForm({ ...form, questionText: e.target.value })} />
              </div>

              {error && <p className="form-error">{error}</p>}

              <div className="submit-actions">
                <button type="submit" className="btn-submit" disabled={submitting}>
                  {submitting ? 'Submitting…' : 'Submit Question'}
                </button>
                <Link to={-1} className="btn-save">Cancel</Link>
              </div>
            </form>
          </div>
        </div>
      </section>
    </Shell>
  );
}
