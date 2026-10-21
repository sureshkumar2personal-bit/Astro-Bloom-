import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Shell from '../../components/common/Shell';
import { getAccessToken } from '../../api/client';

export default function AnswerQuestionsPage() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [answerForm, setAnswerForm] = useState({ answerMode: 'text', answerText: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    const params = filter ? `?status=${filter}` : '';
    fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/astrologer/questions/queue${params}`, {
      headers: { Authorization: `Bearer ${getAccessToken()}` }
    })
      .then(r => r.json())
      .then(r => { if (r.success) setQuestions(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(load, [filter]);

  const handleStartReview = async (qId) => {
    try {
      await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/astrologer/questions/astrologer/${qId}/start-review`, {
        method: 'PATCH', headers: { Authorization: `Bearer ${getAccessToken()}` }
      });
      load();
    } catch {}
  };

  const handleSubmitAnswer = async (qId) => {
    setError('');
    if (answerForm.answerMode === 'text' && !answerForm.answerText.trim()) return setError('Please enter your answer.');
    setSubmitting(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/astrologer/questions/astrologer/${qId}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAccessToken()}` },
        body: JSON.stringify(answerForm)
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message);
      setSelected(null);
      setAnswerForm({ answerMode: 'text', answerText: '' });
      load();
    } catch (err) { setError(err.message); }
    setSubmitting(false);
  };

  if (loading) return <Shell><section className="answer-queue-page"><div className="explore-loading"><h2>Loading question queue…</h2></div></section></Shell>;

  return (
    <Shell>
      <section className="answer-queue-page">
        <div className="edit-header"><div><p className="eyebrow">ANSWER QUESTIONS</p><h1>Question Queue</h1></div></div>
        <div className="queue-filters">
          {['', 'submitted', 'under_review', 'answered'].map(s => (
            <button key={s} className={filter === s ? 'active' : ''} onClick={() => setFilter(s)}>{s || 'All'}</button>
          ))}
        </div>
        <div className="queue-list">
          {questions.length === 0 ? <div className="explore-empty"><h2>No questions</h2></div> : questions.map(q => (
            <div key={q.id} className={`queue-row ${selected?.id === q.id ? 'selected' : ''}`} onClick={() => { setSelected(q); setAnswerForm({ answerMode: 'text', answerText: '' }); setError(''); }}>
              <div className="qr-left">
                <b>{q.questionCode}</b>
                <span>{q.userName} · {q.category}</span>
                <span className="qr-title">{q.title || q.questionText?.slice(0, 80)}</span>
              </div>
              <div className="qr-right">
                <span className={`qr-status status-${q.status}`}>{q.status?.replace(/_/g, ' ')}</span>
                <span className="qr-astro">{q.answerMode}</span>
              </div>
            </div>
          ))}
        </div>

        {selected && (
          <div className="answer-panel">
            <h2>{selected.questionCode} — {selected.userName}</h2>
            <div className="ap-detail"><span>Category</span><b>{selected.category}</b></div>
            <div className="ap-detail"><span>Language</span><b>{selected.language}</b></div>
            <div className="ap-detail"><span>Answer Mode</span><b>{selected.answerMode}</b></div>
            {selected.title && <h3>{selected.title}</h3>}
            <p className="ap-question-text">{selected.questionText}</p>
            <div className="ap-actions">
              {selected.status === 'submitted' && <button className="btn-save" onClick={() => handleStartReview(selected.id)}>Open for Review</button>}
              {(selected.status === 'under_review' || selected.status === 'submitted') && (
                <div className="ap-answer-form">
                  <div className="form-group"><label>Answer Mode</label><select value={answerForm.answerMode} onChange={e => setAnswerForm({ ...answerForm, answerMode: e.target.value })}><option value="text">Text</option><option value="voice">Voice URL</option></select></div>
                  {answerForm.answerMode === 'text' ? (
                    <div className="form-group"><label>Your Answer</label><textarea rows={6} placeholder="Write your detailed answer…" value={answerForm.answerText} onChange={e => setAnswerForm({ ...answerForm, answerText: e.target.value })} /></div>
                  ) : (
                    <div className="form-group"><label>Voice Answer URL</label><input type="text" placeholder="https://…" value={answerForm.answerText} onChange={e => setAnswerForm({ ...answerForm, answerText: e.target.value })} /></div>
                  )}
                  {error && <p className="form-error">{error}</p>}
                  <button className="btn-submit" disabled={submitting} onClick={() => handleSubmitAnswer(selected.id)}>{submitting ? 'Submitting…' : 'Submit Answer'}</button>
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </Shell>
  );
}
