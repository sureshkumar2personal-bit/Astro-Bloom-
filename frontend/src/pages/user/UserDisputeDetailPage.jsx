import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getUserDisputeDetail, sendUserDisputeMessage } from '../../api/disputeApi';

const STATUS_LABELS = {
  open: 'Open', astrologer_reviewing: 'Under Review', astrologer_responded: 'Astrologer Responded',
  user_reply: 'Your Reply', escalated: 'Escalated', admin_reviewing: 'Admin Reviewing',
  resolved: 'Resolved', refunded: 'Refunded', rejected: 'Rejected', closed: 'Closed'
};
const STATUS_COLORS = {
  open: '#db9a40', astrologer_reviewing: '#3498db', astrologer_responded: '#27ae60',
  user_reply: '#8e44ad', escalated: '#e74c3c', admin_reviewing: '#e67e22',
  resolved: '#27ae60', refunded: '#3498db', rejected: '#c0392b', closed: '#817987'
};

export default function UserDisputeDetailPage() {
  const { disputeId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [sending, setSending] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getUserDisputeDetail(disputeId);
      setData(res.data);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load dispute.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [disputeId]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!msg.trim()) return;
    setSending(true);
    try {
      await sendUserDisputeMessage(disputeId, msg.trim());
      setMsg('');
      await load();
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to send.');
    } finally {
      setSending(false);
    }
  };

  if (loading) return <section className="disp-page"><div className="disp-loading">Loading dispute...</div></section>;
  if (error && !data) return <section className="disp-page"><div className="disp-error">{error}</div></section>;

  const d = data?.dispute || {};
  const messages = data?.messages || [];
  const canReply = !['resolved', 'rejected', 'refunded', 'closed'].includes(d.status);

  return (
    <section className="disp-page">
      <div className="disp-header">
        <div>
          <Link to="/user/disputes" className="disp-back-link">← Back to Disputes</Link>
          <h1>Dispute: {d.question_code || 'Q-?'}</h1>
          <p className="disp-subtitle">
            <span className="disp-status-badge" style={{ background: STATUS_COLORS[d.status] || '#817987' }}>
              {STATUS_LABELS[d.status] || d.status}
            </span>
          </p>
        </div>
      </div>

      {error && <div className="disp-error">{error}</div>}

      <div className="disp-detail-grid">
        <div className="disp-detail-info">
          <h3>Question Details</h3>
          <p><strong>Title:</strong> {d.question_title || '—'}</p>
          <p><strong>Astrologer:</strong> {d.astrologer_name}</p>
          <p><strong>Language:</strong> {d.language || '—'}</p>
          <p><strong>Purchase Amount:</strong> {d.purchase_amount ? `₹${d.purchase_amount}` : '—'}</p>
          <p><strong>Payment Status:</strong> {d.purchase_status || '—'}</p>
          <h3 style={{ marginTop: 16 }}>Dispute Info</h3>
          <p><strong>Reason:</strong> {d.reason}</p>
          <p><strong>Expected Resolution:</strong> {d.expected_resolution || '—'}</p>
          {d.description && <p><strong>Description:</strong> {d.description}</p>}
          {d.resolution && (
            <p><strong>Resolution:</strong> <span style={{ color: STATUS_COLORS[d.resolution] || '#333' }}>{d.resolution}</span>
              {d.refund_amount > 0 && <> — ₹{d.refund_amount} refunded</>}
            </p>
          )}
          <p><strong>Filed:</strong> {new Date(d.created_at).toLocaleString()}</p>
        </div>

        <div className="disp-thread">
          <h3>Conversation</h3>
          <div className="disp-messages">
            {messages.length === 0 && <p className="disp-no-msgs">No messages yet.</p>}
            {messages.map(m => (
              <div key={m.id} className={`disp-msg disp-msg-${m.sender_type}`}>
                <div className="disp-msg-header">
                  <strong>{m.sender_name || m.sender_type}</strong>
                  <span className="disp-msg-type">{m.sender_type}</span>
                  <span className="disp-msg-time">{new Date(m.created_at).toLocaleString()}</span>
                </div>
                <p className="disp-msg-body">{m.message}</p>
              </div>
            ))}
          </div>

          {canReply && (
            <form onSubmit={handleSend} className="disp-msg-form">
              <textarea value={msg} onChange={e => setMsg(e.target.value)}
                placeholder="Type your message..." rows={3} />
              <button type="submit" className="btn-purple" disabled={sending || !msg.trim()}>
                {sending ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          )}

        </div>
      </div>
    </section>
  );
}
