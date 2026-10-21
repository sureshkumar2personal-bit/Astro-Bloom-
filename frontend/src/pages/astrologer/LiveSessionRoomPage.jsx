import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import Shell from '../../components/common/Shell';
import { getAstrologerLiveSessions, startLiveSession, endLiveSession, getLiveQuestionQueue, markQuestionAnswering, markQuestionAnswered, skipQuestion } from '../../api/astrologerLiveApi';

export default function LiveSessionRoomPage() {
  const { liveSessionId } = useParams();
  const [session, setSession] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const pollRef = useRef(null);

  useEffect(() => {
    getAstrologerLiveSessions()
      .then(r => { const found = r.data.find(s => s.id === liveSessionId); setSession(found); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [liveSessionId]);

  useEffect(() => {
    if (!session || session.status !== 'live') return;
    loadQuestions();
    pollRef.current = setInterval(loadQuestions, 8000);
    return () => clearInterval(pollRef.current);
  }, [session]);

  async function loadQuestions() {
    try {
      const r = await getLiveQuestionQueue(liveSessionId);
      setQuestions(r.data);
    } catch (e) {}
  }

  async function handleStart() {
    setActionLoading(true);
    try {
      const res = await startLiveSession(liveSessionId);
      setSession(prev => ({ ...prev, status: 'live', streamRoomId: res.data.streamRoomId }));
    } catch (e) { alert(e.message); }
    finally { setActionLoading(false); }
  }

  async function handleEnd() {
    if (!confirm('End this live session? Unanswered paid questions will be refunded.')) return;
    setActionLoading(true);
    try {
      await endLiveSession(liveSessionId);
      setSession(prev => ({ ...prev, status: 'ended' }));
    } catch (e) { alert(e.message); }
    finally { setActionLoading(false); }
  }

  async function handleAnswering(qId) {
    await markQuestionAnswering(qId);
    loadQuestions();
  }

  async function handleAnswered(qId) {
    await markQuestionAnswered(qId);
    loadQuestions();
  }

  async function handleSkip(qId) {
    const reason = prompt('Reason for skipping:');
    if (reason === null) return;
    await skipQuestion(qId, reason || 'Skipped');
    loadQuestions();
  }

  if (loading) return <Shell><section className="live-room-page"><p>Loading...</p></section></Shell>;
  if (!session) return <Shell><section className="live-room-page"><h1>Session not found</h1></section></Shell>;

  const s = session;

  return (
    <Shell>
      <section className="live-room-page">
        <Link className="back-link" to="/astrologer/live">← Back to live sessions</Link>

        {/* Live Preview */}
        <div className={`live-player ${s.status === 'live' ? 'live-active' : ''}`}>
          {s.status === 'live' ? (
            <div className="live-player-active">
              <div className="live-player-placeholder">
                <div className="live-pulse-large">● LIVE</div>
                <p>{s.title}</p>
              </div>
            </div>
          ) : s.status === 'scheduled' ? (
            <div className="live-player-scheduled">
              <h2>Ready to Go Live</h2>
              <p>{s.title}</p>
              <p>Scheduled: {new Date(s.scheduledStartAt).toLocaleString()}</p>
            </div>
          ) : (
            <div className="live-player-ended">
              <h2>Session Ended</h2>
            </div>
          )}
        </div>

        <div className="live-room-layout">
          <div className="live-room-main">
            <div className="live-info-card">
              <div className="live-info-top">
                <h1>{s.title}</h1>
                <span className={`live-status-badge ${s.status}`}>{s.status === 'live' ? '● Live' : s.status}</span>
              </div>
              <div className="live-info-meta">
                <span>{s.topic}</span>
                <span>{s.language}</span>
                <span>{s.audienceType.replace('_', ' ')}</span>
                {s.questionMode !== 'no_questions' && <span>Q Mode: {s.questionMode.replace(/_/g, ' ')}</span>}
              </div>
            </div>

            {/* Controls */}
            <div className="live-controls">
              {s.status === 'scheduled' && (
                <button className="btn-submit" onClick={handleStart} disabled={actionLoading}>{actionLoading ? 'Starting...' : 'Start Live'}</button>
              )}
              {s.status === 'live' && (
                <button className="subs-cancel" onClick={handleEnd} disabled={actionLoading} style={{ padding: '12px 28px', fontSize: 14 }}>{actionLoading ? 'Ending...' : 'End Live'}</button>
              )}
            </div>

            {/* Question Queue */}
            {s.status === 'live' && s.questionMode !== 'no_questions' && (
              <div className="live-question-queue">
                <h2>Question Queue ({questions.length})</h2>
                {questions.length === 0 && <p className="subs-empty">No questions yet.</p>}
                {questions.map(q => (
                  <div key={q.id} className={`lq-card lq-${q.status}`}>
                    <div className="lq-header">
                      <span className="lq-user">{q.userName}</span>
                      <span className={`lq-status lq-status-${q.status}`}>{q.status}</span>
                      {q.queuePosition && <span className="lq-pos">#{q.queuePosition}</span>}
                    </div>
                    <p className="lq-text">{q.questionText}</p>
                    <div className="lq-meta">
                      <span>{q.category}</span>
                      <span>{q.questionType}</span>
                    </div>
                    <div className="lq-actions">
                      {(q.status === 'queued' || q.status === 'submitted') && (
                        <button className="btn-view" onClick={() => handleAnswering(q.id)}>Mark Answering</button>
                      )}
                      {q.status === 'answering' && (
                        <button className="btn-submit" onClick={() => handleAnswered(q.id)}>Mark Answered</button>
                      )}
                      {(q.status === 'queued' || q.status === 'submitted' || q.status === 'answering') && (
                        <button className="subs-cancel" onClick={() => handleSkip(q.id)}>Skip</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="live-room-sidebar">
            <div className="live-stats-card">
              <h3>Session Stats</h3>
              <div className="ls-row"><span>Viewers</span><b>{s.viewerCount || 0}</b></div>
              <div className="ls-row"><span>Questions</span><b>{questions.length}</b></div>
              <div className="ls-row"><span>Answered</span><b>{questions.filter(q => q.status === 'answered').length}</b></div>
            </div>
          </div>
        </div>
      </section>
    </Shell>
  );
}
