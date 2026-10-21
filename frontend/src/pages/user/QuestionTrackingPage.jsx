import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Shell from '../../components/common/Shell';
import { getAccessToken } from '../../api/client';

export default function QuestionTrackingPage() {
  const { questionId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/user/questions/${questionId}/tracking`, {
      headers: { Authorization: `Bearer ${getAccessToken()}` }
    })
      .then(r => r.json())
      .then(r => { if (r.success) setData(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [questionId]);

  if (loading) return <Shell><section className="tracking-page"><div className="explore-loading"><h2>Loading tracking…</h2></div></section></Shell>;
  if (!data) return <Shell><section className="tracking-page"><div className="explore-empty"><h2>Question not found</h2><Link className="btn-view" to="/user/dashboard">← Dashboard</Link></div></section></Shell>;

  const statusColor = { submitted: '#db9a40', received_by_astrologer: '#db9a40', under_review: '#5c3b8b', answered: '#458d5f', completed: '#458d5f' };

  return (
    <Shell>
      <section className="tracking-page">
        <Link to="/user/dashboard" className="back-link">← Dashboard</Link>
        <p className="eyebrow">QUESTION TRACKING</p>
        <h1>Track your question</h1>
        <div className="tracking-layout">
          <div className="tracking-main">
            <div className="tracking-info-card">
              <div className="ti-header">
                <div><h2>{data.questionCode}</h2><span className="tracking-status" style={{ color: statusColor[data.status] || '#6e6573' }}>{data.status?.replace(/_/g, ' ')}</span></div>
                {data.dueAt && <span className="tracking-due">Due by {new Date(data.dueAt).toLocaleDateString()}</span>}
              </div>
              <div className="ti-details">
                <div className="ti-row"><span>Astrologer</span><b>{data.astrologerName}</b></div>
                <div className="ti-row"><span>Campaign</span><b>{data.campaignName}</b></div>
                <div className="ti-row"><span>Category</span><b>{data.category}</b></div>
                <div className="ti-row"><span>Language</span><b>{data.language}</b></div>
                <div className="ti-row"><span>Answer Mode</span><b>{data.answerMode}</b></div>
              </div>
              {data.title && <div className="ti-question"><h3>{data.title}</h3><p>{data.questionText}</p></div>}
              {!data.title && data.questionText && <div className="ti-question"><p>{data.questionText}</p></div>}
            </div>

            {data.answer && (
              <div className="tracking-answer-card">
                <h2>Answer</h2>
                {data.answer.answerText && <p className="answer-text">{data.answer.answerText}</p>}
                {data.answer.voiceAnswerUrl && <p className="answer-voice">Voice answer: {data.answer.voiceAnswerUrl}</p>}
                <span className="answer-time">Submitted {new Date(data.answer.submittedAt).toLocaleString()}</span>
              </div>
            )}
          </div>
          <div className="tracking-sidebar">
            <div className="tracking-timeline-card">
              <h2>Progress</h2>
              {data.timeline?.map((step, i) => (
                <div key={i} className={`tl-step ${step.completed ? 'completed' : ''}`}>
                  <div className="tl-dot" />
                  <span>{step.label}</span>
                </div>
              ))}
            </div>
            {!data.answer && data.status !== 'disputed' && (
              <Link className="svc-btn" style={{ background: '#fef2f2', color: '#b44040', border: '2px solid #e88' }} to={`/user/dispute/${data.questionId}`}>Raise Dispute</Link>
            )}
          </div>
        </div>
      </section>
    </Shell>
  );
}
