import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAstrologerDisputes, getAstrologerDisputeDetail, respondToDispute, markDisputeReviewing, sendAstrologerDisputeMessage } from '../../api/disputeApi';
import AstrologerLayout from '../../components/astrologer/AstrologerLayout';

const STATUS_LABELS = {
  open: 'Open', astrologer_reviewing: 'Under Review', astrologer_responded: 'Responded',
  user_reply: 'User Reply', escalated: 'Escalated', admin_reviewing: 'Admin Reviewing',
  resolved: 'Resolved', refunded: 'Refunded', rejected: 'Rejected', closed: 'Closed'
};
const STATUS_COLORS = {
  open: '#db9a40', astrologer_reviewing: '#3498db', astrologer_responded: '#27ae60',
  user_reply: '#8e44ad', escalated: '#e74c3c', admin_reviewing: '#e67e22',
  resolved: '#27ae60', refunded: '#3498db', rejected: '#c0392b', closed: '#817987'
};

export default function AstrologerDisputePage() {
  const [view, setView] = useState('list');
  const [list, setList] = useState({ disputes: [], summary: {} });
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [error, setError] = useState('');
  const [response, setResponse] = useState('');
  const [msg, setMsg] = useState('');
  const [sending, setSending] = useState(false);

  const loadList = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter) params.status = filter;
      const res = await getAstrologerDisputes(params);
      setList(res.data);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load.');
    } finally {
      setLoading(false);
    }
  };

  const loadDetail = async (disputeId) => {
    setLoading(true);
    try {
      const res = await getAstrologerDisputeDetail(disputeId);
      setDetail(res.data);
      setView('detail');
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load detail.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (view === 'list') loadList(); }, [filter, view]);

  const handleRespond = async () => {
    if (!response.trim()) return;
    setSending(true);
    try {
      await respondToDispute(detail.dispute.id, response.trim());
      setResponse('');
      await loadDetail(detail.dispute.id);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to respond.');
    } finally {
      setSending(false);
    }
  };

  const handleReviewing = async (disputeId) => {
    try {
      await markDisputeReviewing(disputeId);
      await loadDetail(disputeId);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to update.');
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!msg.trim()) return;
    setSending(true);
    try {
      await sendAstrologerDisputeMessage(detail.dispute.id, msg.trim());
      setMsg('');
      await loadDetail(detail.dispute.id);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to send.');
    } finally {
      setSending(false);
    }
  };

  const s = list.summary || {};
  const disputes = list.disputes || [];

  if (view === 'detail' && detail) {
    const d = detail.dispute || {};
    const messages = detail.messages || [];
    const isOpen = ['open'].includes(d.status);
    const canReply = !['resolved', 'rejected', 'refunded', 'closed'].includes(d.status);

    return (
      <AstrologerLayout>
        <section className="disp-page">
          <div className="disp-header">
            <div>
              <button className="disp-back-link" onClick={() => { setView('list'); setDetail(null); }}>← Back to List</button>
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
            <p><strong>User:</strong> {d.user_name}</p>
            <p><strong>Language:</strong> {d.language || '—'}</p>
            <p><strong>Amount:</strong> {d.purchase_amount ? `₹${d.purchase_amount}` : '—'}</p>
            <h3 style={{ marginTop: 16 }}>Dispute Info</h3>
            <p><strong>Reason:</strong> {d.reason}</p>
            <p><strong>Expected:</strong> {d.expected_resolution || '—'}</p>
            {d.description && <p><strong>Description:</strong> {d.description}</p>}
            {d.astrologer_response && <p><strong>Your Response:</strong> {d.astrologer_response}</p>}
            {d.resolution && <p><strong>Resolution:</strong> {d.resolution}</p>}
            {d.escalated_at && <p style={{ color: '#e74c3c' }}><strong>Escalated:</strong> {new Date(d.escalated_at).toLocaleString()}</p>}
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

            {isOpen && (
              <div className="disp-action-bar">
                <button className="btn-purple" onClick={() => handleReviewing(d.id)}>Mark as Reviewing</button>
              </div>
            )}

            {canReply && (
              <form onSubmit={handleSendMessage} className="disp-msg-form">
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
      </AstrologerLayout>
    );
  }

  return (
    <AstrologerLayout>
      <section className="disp-page">
      <div className="disp-header">
        <div>
          <h1>Dispute Management</h1>
          <p className="disp-subtitle">View and respond to user disputes</p>
        </div>
      </div>

      {error && <div className="disp-error">{error}</div>}

      <div className="disp-summary-row">
        {Object.entries(STATUS_LABELS).map(([key, label]) => (
          s[key] ? (
            <button key={key} className={`disp-summary-chip ${filter === key ? 'active' : ''}`}
              style={{ borderColor: STATUS_COLORS[key] }}
              onClick={() => setFilter(filter === key ? '' : key)}>
              {label} <span>{s[key]}</span>
            </button>
          ) : null
        ))}
        {filter && <button className="disp-clear-btn" onClick={() => setFilter('')}>Clear</button>}
      </div>

      {loading ? (
        <div className="disp-loading">Loading disputes...</div>
      ) : disputes.length === 0 ? (
        <div className="disp-empty"><p>No disputes found.</p></div>
      ) : (
        <div className="disp-table-wrap">
          <table className="disp-table">
            <thead>
              <tr>
                <th>Question</th>
                <th>User</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Filed</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {disputes.map(d => (
                <tr key={d.id}>
                  <td><span className="disp-code">{d.question_code || '—'}</span> {d.question_title || '—'}</td>
                  <td>{d.user_name}</td>
                  <td className="disp-reason-cell">{d.reason}</td>
                  <td>
                    <span className="disp-status-badge" style={{ background: STATUS_COLORS[d.status] || '#817987' }}>
                      {STATUS_LABELS[d.status] || d.status}
                    </span>
                  </td>
                  <td>{new Date(d.created_at).toLocaleDateString()}</td>
                  <td>
                    <button className="btn-outline btn-sm" onClick={() => loadDetail(d.id)}>View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
    </AstrologerLayout>
  );
}
