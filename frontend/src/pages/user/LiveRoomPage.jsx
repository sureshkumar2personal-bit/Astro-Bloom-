import { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Shell from '../../components/common/Shell';
import { getLiveSessionDetails, checkLiveAccess, joinLiveSession, getLiveChat, sendLiveChat, getMyLiveQuestion } from '../../api/liveApi';

export default function LiveRoomPage() {
  const { liveSessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [accessCheck, setAccessCheck] = useState(null);
  const [joined, setJoined] = useState(false);
  const [chat, setChat] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [myQuestion, setMyQuestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const chatEndRef = useRef(null);
  const pollRef = useRef(null);

  useEffect(() => {
    getLiveSessionDetails(liveSessionId)
      .then(r => setSession(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [liveSessionId]);

  useEffect(() => {
    if (!session) return;
    checkLiveAccess(liveSessionId).then(r => setAccessCheck(r.data)).catch(() => {});
  }, [session, liveSessionId]);

  useEffect(() => {
    if (!joined) return;
    getMyLiveQuestion(liveSessionId).then(r => setMyQuestion(r.data)).catch(() => {});
    getLiveChat(liveSessionId).then(r => setChat(r.data)).catch(() => {});
    pollRef.current = setInterval(() => {
      getLiveSessionDetails(liveSessionId).then(r => setSession(r.data)).catch(() => {});
      getLiveChat(liveSessionId).then(r => setChat(r.data)).catch(() => {});
      getMyLiveQuestion(liveSessionId).then(r => setMyQuestion(r.data)).catch(() => {});
    }, 10000);
    return () => clearInterval(pollRef.current);
  }, [joined, liveSessionId]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chat]);

  async function handleJoin() {
    setJoining(true);
    try {
      await joinLiveSession(liveSessionId);
      setJoined(true);
    } catch (e) { alert(e.message); }
    finally { setJoining(false); }
  }

  async function handlePayEntry() {
    try {
      const { payLiveEntry } = await import('../../api/liveApi');
      await payLiveEntry(liveSessionId);
      await handleJoin();
    } catch (e) { alert(e.message); }
  }

  async function handleSendChat(e) {
    e.preventDefault();
    if (!chatInput.trim()) return;
    try {
      await sendLiveChat(liveSessionId, chatInput.trim());
      setChatInput('');
      const r = await getLiveChat(liveSessionId);
      setChat(r.data);
    } catch (e) { alert(e.message); }
  }

  if (loading) return <Shell><section className="live-room-page"><p>Loading live session...</p></section></Shell>;
  if (!session) return <Shell><section className="live-room-page"><h1>Session not found</h1></section></Shell>;

  const s = session;

  return (
    <Shell>
      <section className="live-room-page">
        <Link className="back-link" to="/user/live">← Back to live sessions</Link>

        {/* Mock Video Player */}
        <div className={`live-player ${s.status === 'live' ? 'live-active' : ''}`}>
          {s.status === 'live' ? (
            <div className="live-player-active">
              <div className="live-player-placeholder">
                <div className="live-pulse-large">● LIVE</div>
                <p>Live Stream — {s.title}</p>
                <p className="live-player-astro">with {s.astrologerName}</p>
              </div>
              <div className="live-viewer-count">{s.viewerCount} watching now</div>
            </div>
          ) : s.status === 'scheduled' ? (
            <div className="live-player-scheduled">
              <h2>Scheduled for {new Date(s.scheduledStartAt).toLocaleString()}</h2>
              <p>{s.title}</p>
            </div>
          ) : (
            <div className="live-player-ended">
              <h2>This live session has ended</h2>
            </div>
          )}
        </div>

        <div className="live-room-layout">
          {/* Left: Session Info + Chat */}
          <div className="live-room-main">
            <div className="live-info-card">
              <div className="live-info-top">
                <h1>{s.title}</h1>
                <span className={`live-status-badge ${s.status}`}>{s.status === 'live' ? '● Live Now' : s.status}</span>
              </div>
              <p className="live-info-astro">{s.astrologerName} · {s.topic} · {s.language}</p>
              {s.description && <p className="live-info-desc">{s.description}</p>}
              <div className="live-info-meta">
                <span>{s.audienceType.replace('_', ' ')}</span>
                {s.entryType === 'paid' && <span>₹{s.entryPrice} entry</span>}
                {s.questionMode !== 'no_questions' && <span>{s.questionMode === 'paid_question_slots' ? `Q: ₹${s.questionPrice}` : 'Free Q'}</span>}
              </div>
            </div>

            {/* Access Controls */}
            {!joined && s.status !== 'ended' && (
              <div className="live-access-controls">
                {accessCheck?.canJoin ? (
                  <button className="btn-submit" onClick={handleJoin} disabled={joining}>{joining ? 'Joining...' : 'Join Live'}</button>
                ) : accessCheck?.requiredAction === 'pay_entry' ? (
                  <div className="live-pay-prompt">
                    <p>{accessCheck.reason}</p>
                    <button className="btn-submit" onClick={handlePayEntry}>Pay & Join</button>
                  </div>
                ) : accessCheck?.requiredAction === 'follow' ? (
                  <div className="live-pay-prompt">
                    <p>{accessCheck.reason}</p>
                    <Link className="btn-submit" to={accessCheck.redirectTo}>Follow to Access →</Link>
                  </div>
                ) : accessCheck?.requiredAction === 'subscribe' ? (
                  <div className="live-pay-prompt">
                    <p>{accessCheck.reason}</p>
                    <Link className="btn-submit" to={accessCheck.redirectTo}>Subscribe →</Link>
                  </div>
                ) : accessCheck ? (
                  <p className="live-access-denied">{accessCheck.reason}</p>
                ) : null}
              </div>
            )}

            {/* My Question Status */}
            {myQuestion && (
              <div className="live-question-status-card">
                <h3>My Live Question</h3>
                <div className="lqs-info">
                  <span>Status: <b>{myQuestion.status}</b></span>
                  {myQuestion.queuePosition && <span>Queue: #{myQuestion.queuePosition}</span>}
                </div>
                <p className="lqs-text">{myQuestion.questionText}</p>
              </div>
            )}

            {/* Buy Question */}
            {joined && s.questionMode === 'paid_question_slots' && !myQuestion && s.status === 'live' && (
              <Link className="btn-submit" to={`/user/live/${s.id}/buy-question`}>Buy Live Question Slot →</Link>
            )}

            {/* Chat */}
            {joined && (
              <div className="live-chat-panel">
                <h3>Live Chat</h3>
                <div className="chat-messages">
                  {chat.map(m => (
                    <div key={m.id} className={`chat-msg ${m.senderType}`}>
                      <span className="chat-sender">{m.senderName || m.senderType}</span>
                      <span className="chat-text">{m.message}</span>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                <form className="chat-input-form" onSubmit={handleSendChat}>
                  <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Type a message..." />
                  <button type="submit">Send</button>
                </form>
              </div>
            )}
          </div>

          {/* Right: Sidebar */}
          <div className="live-room-sidebar">
            <Link className="btn-view" to={`/user/astrologers/${s.astrologerId}`}>View Astrologer Profile →</Link>
            {joined && s.status === 'live' && (
              <p className="live-room-tip">You are watching live. The chat updates automatically every 10 seconds.</p>
            )}
          </div>
        </div>
      </section>
    </Shell>
  );
}
