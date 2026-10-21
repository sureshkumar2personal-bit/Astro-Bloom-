import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Shell from '../../components/common/Shell';
import Notice from '../../components/common/Notice';
import { getAiUsage, getAiConversations, createAiConversation, getAiMessages, sendAiMessage, buyAiPack, getAiPacks } from '../../api/aiChatApi';

const SUGGESTED_QUESTIONS = [
  'What is my Rasi?',
  'Explain my Nakshatra',
  'What is Sani Peyarchi?',
  'Career guidance',
  'Marriage timing',
  'Daily prediction',
  'What is Dasa/Bhukthi?',
  'Explain my birth chart'
];

export default function AiChatPage() {
  const nav = useNavigate();
  const chatEndRef = useRef(null);
  const [mode, setMode] = useState('general');
  const [messageText, setMessageText] = useState('');
  const [messages, setMessages] = useState([]);
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [paymentRequired, setPaymentRequired] = useState(false);
  const [packs, setPacks] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showPackModal, setShowPackModal] = useState(false);
  const [buying, setBuying] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    getAiUsage().then(r => setUsage(r.data)).catch(() => {});
    getAiConversations().then(r => setConversations(r.data)).catch(() => {});
    getAiPacks().then(r => setPacks(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function ensureConversation() {
    if (conversationId) return conversationId;
    const r = await createAiConversation({ mode, title: `${mode === 'personal' ? 'Personal' : 'General'} AI Chat` });
    const newId = r.data.conversationId;
    setConversationId(newId);
    getAiConversations().then(r => setConversations(r.data)).catch(() => {});
    return newId;
  }

  async function handleSend(text) {
    const questionText = text || messageText.trim();
    if (!questionText || loading) return;
    setMessageText('');
    setLoading(true);
    setMsg('');

    try {
      const convId = await ensureConversation();
      const userMsg = { id: `temp-${Date.now()}`, role: 'user', messageText: questionText, createdAt: new Date().toISOString() };
      setMessages(prev => [...prev, userMsg]);

      const r = await sendAiMessage({ conversationId: convId, mode, messageText: questionText });

      if (r.success && r.data.assistantMessage) {
        setMessages(prev => [...prev, {
          id: r.data.assistantMessage.id,
          role: 'assistant',
          messageText: r.data.assistantMessage.messageText,
          category: r.data.assistantMessage.category,
          usageType: r.data.assistantMessage.usageType,
          createdAt: r.data.assistantMessage.createdAt
        }]);
        setUsage(prev => ({
          ...prev,
          freeUsed: prev.freeLimit - r.data.freeRemaining,
          freeRemaining: r.data.freeRemaining,
          paidRemaining: r.data.paidRemaining,
          paymentRequired: r.data.paymentRequired
        }));
        if (r.data.paymentRequired) setPaymentRequired(true);
      }
    } catch (err) {
      if (err.message?.includes('limit completed') || err.message?.includes('AI question limit')) {
        setPaymentRequired(true);
        setShowPackModal(true);
      } else {
        setMsg(err.message);
      }
    }
    setLoading(false);
  }

  async function handleBuyPack(packCode) {
    setBuying(true); setMsg('');
    try {
      const r = await buyAiPack({ packCode });
      setPaymentRequired(false);
      setShowPackModal(false);
      setUsage(prev => ({
        ...prev,
        paidRemaining: r.data.paidRemaining,
        paymentRequired: false,
        currentPack: r.data.packName
      }));
      setMsg(`✅ ${r.data.packName} purchased! ${r.data.questionsAdded} questions added. Wallet: ₹${r.data.walletBalance}`);
    } catch (err) { setMsg(err.message); }
    setBuying(false);
  }

  async function loadConversationHistory(convId) {
    setConversationId(convId);
    setMessages([]);
    setShowHistory(false);
    try {
      const r = await getAiMessages(convId);
      setMessages(r.data.map(m => ({
        id: m.id, role: m.role, messageText: m.messageText,
        category: m.category, usageType: m.usageType, createdAt: m.createdAt
      })));
    } catch {}
  }

  function startNewChat() {
    setConversationId(null);
    setMessages([]);
    setMode('general');
  }

  function formatTime(d) { return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }

  return <Shell>
    <section className="ai-chat-page">
      <div className="ai-chat-layout">
        {/* Sidebar */}
        <div className={`ai-sidebar ${showHistory ? 'show' : ''}`}>
          <div className="ai-sidebar-header">
            <h2>AI Chat</h2>
            <button className="btn-new-chat" onClick={startNewChat}>+ New Chat</button>
          </div>
          <div className="ai-conversations-list">
            {conversations.length === 0 ? <p className="muted">No conversations yet.</p> :
              conversations.map(c => (
                <div key={c.id} className={`ai-conv-item ${conversationId === c.id ? 'active' : ''}`} onClick={() => loadConversationHistory(c.id)}>
                  <span className="conv-title">{c.title}</span>
                  <span className="conv-time">{new Date(c.updatedAt).toLocaleDateString()}</span>
                </div>
              ))}
          </div>
        </div>

        {/* Main Chat */}
        <div className="ai-chat-main">
          {/* Usage Card */}
          {usage && <div className="ai-usage-card">
            <div className="ai-usage-item">
              <span className="usage-label">Free Questions</span>
              <div className="usage-bar">
                <div className="usage-fill" style={{ width: `${(usage.freeUsed / usage.freeLimit) * 100}%` }} />
              </div>
              <span className="usage-count">{usage.freeUsed} / {usage.freeLimit} used</span>
            </div>
            <div className="ai-usage-item">
              <span className="usage-label">Paid Pack</span>
              <span className="usage-count">{usage.currentPack ? `${usage.paidRemaining} remaining (${usage.currentPack})` : 'No active pack'}</span>
            </div>
            {usage.paymentRequired && <button className="btn-buy-pack" onClick={() => setShowPackModal(true)}>Buy AI Pack →</button>}
          </div>}

          {/* Mode Toggle */}
          <div className="ai-mode-toggle">
            <button className={mode === 'general' ? 'active' : ''} onClick={() => setMode('general')}>General AI Chat</button>
            <button className={mode === 'personal' ? 'active' : ''} onClick={() => setMode('personal')}>My Astrology AI</button>
            <button className="btn-history-toggle" onClick={() => setShowHistory(!showHistory)}>☰</button>
          </div>

          {mode === 'personal' && <div className="ai-profile-hint">
            <span>Using your birth profile for personalized answers.</span>
            <Link to="/user/onboarding">Update Profile →</Link>
          </div>}

          {/* Messages */}
          <div className="ai-messages-area">
            {messages.length === 0 ? (
              <div className="ai-welcome">
                <div className="ai-welcome-icon">✦</div>
                <h2>AI Astrology Assistant</h2>
                <p>Ask me anything about Vedic astrology — Rasi, Nakshatra, Dasa, transits, remedies, and more.</p>
                <div className="ai-suggested-questions">
                  {SUGGESTED_QUESTIONS.map(q => (
                    <button key={q} className="suggested-q" onClick={() => handleSend(q)}>{q}</button>
                  ))}
                </div>
                <div className="ai-disclaimer">
                  ⚠️ AI provides general guidance only. For personal predictions, consult a verified astrologer.
                </div>
              </div>
            ) : (
              <div className="ai-message-list">
                {messages.map(m => (
                  <div key={m.id} className={`ai-msg ${m.role === 'user' ? 'ai-msg-user' : 'ai-msg-assistant'}`}>
                    <div className="ai-msg-avatar">{m.role === 'user' ? '👤' : '✦'}</div>
                    <div className="ai-msg-content">
                      <div className="ai-msg-text" style={{ whiteSpace: 'pre-wrap' }}>{m.messageText}</div>
                      <div className="ai-msg-meta">
                        <span className="ai-msg-time">{formatTime(m.createdAt)}</span>
                        {m.category && <span className="ai-msg-category">{m.category}</span>}
                        {m.usageType && <span className={`ai-msg-usage ai-usage-${m.usageType}`}>{m.usageType}</span>}
                      </div>
                    </div>
                  </div>
                ))}
                {loading && <div className="ai-msg ai-msg-assistant">
                  <div className="ai-msg-avatar">✦</div>
                  <div className="ai-msg-content"><div className="ai-msg-typing">Thinking...</div></div>
                </div>}
                <div ref={chatEndRef} />
              </div>
            )}
          </div>

          {/* Input */}
          <div className="ai-input-area">
            <Notice message={msg} />
            <form className="ai-input-form" onSubmit={e => { e.preventDefault(); handleSend(); }}>
              <input
                value={messageText}
                onChange={e => setMessageText(e.target.value)}
                placeholder={paymentRequired ? 'Buy an AI pack to continue...' : 'Ask an astrology question...'}
                disabled={loading || paymentRequired}
                maxLength={1000}
              />
              <span className="ai-char-count">{messageText.length}/1000</span>
              <button type="submit" className="primary" disabled={loading || !messageText.trim() || paymentRequired}>
                {loading ? '...' : 'Send'}
              </button>
            </form>
            <div className="ai-input-actions">
              <Link to="/user/astrologers" className="ai-astrologer-link">🧑‍💼 Ask a Human Astrologer →</Link>
            </div>
          </div>
        </div>
      </div>

      {/* Pack Modal */}
      {showPackModal && <div className="ai-modal-overlay" onClick={() => setShowPackModal(false)}>
        <div className="ai-modal" onClick={e => e.stopPropagation()}>
          <h2>Choose an AI Pack</h2>
          <p>Your free AI questions are completed. Buy a pack to continue.</p>
          <div className="ai-pack-options">
            {packs.map(p => (
              <div key={p.packCode} className="ai-pack-card">
                <h3>{p.packName}</h3>
                <div className="ai-pack-price">₹{p.priceAmount}</div>
                <div className="ai-pack-questions">{p.questionCount} questions</div>
                <button className="primary" onClick={() => handleBuyPack(p.packCode)} disabled={buying}>
                  {buying ? 'Processing...' : `Buy ₹${p.priceAmount}`}
                </button>
              </div>
            ))}
          </div>
          <div className="ai-modal-actions">
            <Link to="/user/wallet" className="outline-link">Go to Wallet →</Link>
            <button className="btn-dismiss" onClick={() => setShowPackModal(false)}>Maybe Later</button>
          </div>
        </div>
      </div>}
    </section>
  </Shell>;
}
