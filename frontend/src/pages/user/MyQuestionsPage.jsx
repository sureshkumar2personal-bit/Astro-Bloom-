import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Shell from '../../components/common/Shell';
import { getAccessToken } from '../../api/client';

export default function MyQuestionsPage() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/user/questions`, {
      headers: { Authorization: `Bearer ${getAccessToken()}` }
    })
      .then(r => r.json())
      .then(r => { if (r.success) setQuestions(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <Shell><section className="my-questions-page"><div className="explore-loading"><h2>Loading questions…</h2></div></section></Shell>;

  return (
    <Shell>
      <section className="my-questions-page">
        <p className="eyebrow">MY QUESTIONS</p>
        <h1>Your question history</h1>
        {questions.length === 0 ? (
          <div className="explore-empty"><h2>No questions yet</h2><p>Purchase a question from an astrologer to get started.</p><Link className="btn-view" to="/user/astrologers">Explore Astrologers →</Link></div>
        ) : (
          <div className="questions-list">
            {questions.map(q => (
              <Link key={q.id} to={`/user/questions/${q.id}`} className="question-row">
                <div className="qr-left">
                  <b>{q.questionCode}</b>
                  <span>{q.category} · {q.title || 'Untitled'}</span>
                </div>
                <div className="qr-right">
                  <span className={`qr-status status-${q.status}`}>{q.status?.replace(/_/g, ' ')}</span>
                  <span className="qr-astro">{q.astrologerName}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </Shell>
  );
}
