import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Shell from '../../components/common/Shell';
import { getUserConversations, getUserMessages, sendUserMessage, startConversation, markUserConversationRead } from '../../api/messageApi';

export default function ChatPage() {
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { getUserConversations().then(r => setConversations(r.data)).catch(() => {}).finally(() => setLoading(false)); }, []);

  useEffect(() => {
    if (!activeConvId) { setMessages([]); return; }
    getUserMessages(activeConvId).then(r => setMessages(r.data)).catch(() => {});
    markUserConversationRead(activeConvId).catch(() => {});
    const poll = setInterval(() => { getUserMessages(activeConvId).then(r => setMessages(r.data)).catch(() => {}); }, 5000);
    return () => clearInterval(poll);
  }, [activeConvId]);

  async function handleSend(e) {
    e.preventDefault();
    if (!newMsg.trim() || !activeConvId) return;
    try {
      await sendUserMessage(activeConvId, { content: newMsg.trim() });
      setNewMsg('');
      const r = await getUserMessages(activeConvId);
      setMessages(r.data);
    } catch {}
  }

  const activeConv = conversations.find(c => c.id === activeConvId);

  return <Shell>
    <section className="chat-page">
      <div className="chat-layout">
        <div className="chat-sidebar">
          <h2>Messages</h2>
          {loading ? <p>Loading...</p> : conversations.length === 0 ? <p className="muted">No conversations yet.</p> : (
            <div className="conv-list">
              {conversations.map(c => (
                <div key={c.id} className={`conv-item ${activeConvId === c.id ? 'active' : ''}`} onClick={() => setActiveConvId(c.id)}>
                  <div className="conv-avatar">{c.other?.name?.charAt(0) || '?'}</div>
                  <div className="conv-info">
                    <span className="conv-name">{c.other?.name || 'Unknown'}</span>
                    <span className="conv-preview">{c.lastMessage || 'Start a conversation'}</span>
                  </div>
                  {c.unreadCount > 0 && <span className="conv-unread">{c.unreadCount}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="chat-main">
          {!activeConvId ? <div className="chat-empty"><p>Select a conversation to start messaging.</p></div> : <>
            <div className="chat-header">
              <h3>{activeConv?.other?.name || 'Unknown'}</h3>
              <Link className="outline-link" to={`/user/astrologers/${activeConv?.other?.id}`}>View Profile →</Link>
            </div>
            <div className="chat-messages">
              {messages.map(m => (
                <div key={m.id} className={`chat-msg ${m.sender_type === 'user' ? 'sent' : 'received'}`}>
                  <span className="chat-text">{m.content}</span>
                  <span className="chat-time">{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              ))}
            </div>
            <form className="chat-input-form" onSubmit={handleSend}>
              <input value={newMsg} onChange={e => setNewMsg(e.target.value)} placeholder="Type a message..." />
              <button type="submit" className="primary">Send</button>
            </form>
          </>}
        </div>
      </div>
    </section>
  </Shell>;
}
