import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Shell from '../../components/common/Shell';
import { getLiveSessionDetails, getMyLiveQuestion, submitLiveQuestion } from '../../api/liveApi';

const CATEGORIES = ['Marriage', 'Career', 'Health', 'Finance', 'Education', 'Family', 'General', 'Remedy'];

export default function SubmitLiveQuestionPage() {
  const { liveSessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [existing, setExisting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ questionType: 'personal', category: 'General', questionText: '' });

  useEffect(() => {
    Promise.all([
      getLiveSessionDetails(liveSessionId),
      getMyLiveQuestion(liveSessionId)
    ]).then(([s, q]) => { setSession(s.data); setExisting(q.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [liveSessionId]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.questionText.trim() || !form.category) return;
    setSubmitting(true);
    setError(null);
    try {
      await submitLiveQuestion(liveSessionId, form);
      navigate(`/user/live/${liveSessionId}`);
    } catch (e) { setError(e.message); }
    finally { setSubmitting(false); }
  }

  if (loading) return <Shell><section className="submit-question-page"><p>Loading...</p></section></Shell>;
  if (!session) return <Shell><section className="submit-question-page"><h1>Session not found</h1></section></Shell>;

  return (
    <Shell>
      <section className="submit-question-page">
        <Link className="back-link" to={`/user/live/${liveSessionId}`}>← Back to live</Link>
        <p className="eyebrow">SUBMIT LIVE QUESTION</p>
        <h1>Submit Your Question</h1>

        {existing && existing.status !== 'paid' && (
          <div className="form-error" style={{ marginBottom: 20 }}>
            {existing.status === 'queued' ? 'Your question is already in the queue.' :
             existing.status === 'answered' ? 'Your question has been answered.' :
             `Your question status: ${existing.status}`}
            <br /><Link to={`/user/live/${liveSessionId}`}>Back to live →</Link>
          </div>
        )}

        <div className="submit-form">
          <div className="sq-purchase-summary">
            <span>{session.title}</span>
            <span className="sep">·</span>
            <span>{session.astrologerName}</span>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Question Type</label>
              <div className="toggle-group">
                <button type="button" className={form.questionType === 'personal' ? 'active' : ''} onClick={() => setForm({ ...form, questionType: 'personal' })}>Personal</button>
                <button type="button" className={form.questionType === 'general' ? 'active' : ''} onClick={() => setForm({ ...form, questionType: 'general' })}>General</button>
              </div>
            </div>

            <div className="form-group">
              <label>Category</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} required>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label>Your Question</label>
              <textarea rows={5} value={form.questionText} onChange={e => setForm({ ...form, questionText: e.target.value })} placeholder="Type your question clearly..." required />
            </div>

            {error && <p className="form-error">{error}</p>}

            <div className="submit-actions">
              <button className="btn-submit" type="submit" disabled={submitting || (existing && existing.status !== 'paid')}>
                {submitting ? 'Submitting...' : 'Submit Question'}
              </button>
              <Link className="btn-save" to={`/user/live/${liveSessionId}`}>Cancel</Link>
            </div>
          </form>
        </div>
      </section>
    </Shell>
  );
}
