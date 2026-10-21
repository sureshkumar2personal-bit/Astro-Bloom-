import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getUserAtonementDetail, markAtonementStarted, uploadAtonementProof, payAtonement, validateDiscountCode } from '../../api/atonementApi';

const STATUS_COLORS = {
  prescribed: '#928994', notified: '#5c3b8b', pending_user_action: '#db9a40', payment_pending: '#e67e22',
  paid: '#27ae60', in_progress: '#3498db', proof_uploaded: '#8e44ad', completed: '#27ae60',
  cancelled: '#999', expired: '#c0392b', disputed: '#e74c3c', refunded: '#e67e22'
};

function formatLabel(s) { return (s || '').replace(/_/g, ' '); }

export default function UserAtonementDetailPage() {
  const { atonementId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState('');
  const [discountCode, setDiscountCode] = useState('');
  const [discountResult, setDiscountResult] = useState(null);
  const [proofNote, setProofNote] = useState('');

  useEffect(() => {
    getUserAtonementDetail(atonementId)
      .then(r => setData(r.data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [atonementId]);

  async function handleMarkStarted() {
    setActionLoading('started');
    try {
      await markAtonementStarted(atonementId);
      setData(prev => ({ ...prev, status: 'in_progress' }));
    } catch (e) { alert(e.message); }
    finally { setActionLoading(''); }
  }

  async function handleUploadProof() {
    setActionLoading('proof');
    try {
      await uploadAtonementProof(atonementId, { proofType: 'image', note: proofNote, fileUrl: '/uploads/proof.pdf' });
      setData(prev => ({ ...prev, status: 'proof_uploaded' }));
    } catch (e) { alert(e.message); }
    finally { setActionLoading(''); }
  }

  async function handleApplyDiscount() {
    try {
      const r = await validateDiscountCode({ code: discountCode, atonementId, amount: data.price });
      setDiscountResult(r.data);
    } catch (e) { alert(e.message); }
  }

  async function handlePay() {
    setActionLoading('pay');
    try {
      await payAtonement(atonementId, { paymentMethod: 'wallet', discountCode: discountCode || undefined });
      setData(prev => ({ ...prev, payment_status: 'paid', status: 'paid' }));
      setDiscountResult(null);
    } catch (e) { alert(e.message); }
    finally { setActionLoading(''); }
  }

  if (loading) return <section className="page"><p style={{ color: '#6e6573', padding: 40 }}>Loading...</p></section>;
  if (error) return <section className="page"><div className="atonement-error">{error}</div><Link to="/user/atonements">← Back</Link></section>;
  if (!data) return null;

  const a = data;
  const payableAmount = discountResult ? discountResult.finalAmount : Number(a.price);

  return (
    <section className="page">
      <div className="atonement-detail-wrap">
        <button onClick={() => navigate(-1)} className="btn-secondary" style={{ marginBottom: 20 }}>← Back</button>

        <div className="atonement-detail-card">
          <div className="atonement-detail-header">
            <div>
              <span className="atonement-status-badge" style={{ background: STATUS_COLORS[a.status] || '#999' }}>{formatLabel(a.status)}</span>
              <h1>{a.title}</h1>
              <small style={{ color: '#6e6573' }}>Prescribed by <strong>{a.astrologer_name || 'Platform'}</strong> · {formatLabel(a.source_type)}</small>
            </div>
            {a.is_paid && <div className="atonement-detail-price">₹{Number(a.price).toFixed(0)}</div>}
            {!a.is_paid && <div className="atonement-detail-free">Free</div>}
          </div>

          <div className="atonement-detail-section">
            <h3>Why This Remedy</h3>
            <p>{a.astrology_reason || 'Recommended based on your horoscope analysis to address current planetary influences.'}</p>
          </div>

          <div className="atonement-detail-section">
            <h3>Instructions</h3>
            <p style={{ whiteSpace: 'pre-wrap' }}>{a.instructions}</p>
          </div>

          <div className="atonement-detail-grid">
            <div><small>Remedy Type</small><b>{formatLabel(a.remedy_type)}</b></div>
            <div><small>Problem Category</small><b>{a.problem_category || 'General'}</b></div>
            <div><small>Proof Required</small><b>{a.proof_required ? 'Yes' : 'No'}</b></div>
            {a.expected_completion_date && <div><small>Expected Completion</small><b>{new Date(a.expected_completion_date).toLocaleDateString()}</b></div>}
          </div>

          {/* Payment Section */}
          {a.is_paid && a.payment_status !== 'paid' && (
            <div className="atonement-detail-section atonement-payment-box">
              <h3>Payment</h3>
              <div className="atonement-discount-row">
                <input placeholder="Discount code" value={discountCode} onChange={e => setDiscountCode(e.target.value.toUpperCase())} />
                <button className="btn-sm" onClick={handleApplyDiscount} disabled={!discountCode}>Apply</button>
              </div>
              {discountResult && (
                <div className="atonement-discount-info">
                  Discount: ₹{Number(discountResult.discountAmount).toFixed(0)} off
                </div>
              )}
              <div className="atonement-pay-row">
                <span>Total: <strong>₹{payableAmount.toFixed(0)}</strong></span>
                <button className="btn-primary" onClick={handlePay} disabled={actionLoading === 'pay'}>
                  {actionLoading === 'pay' ? 'Processing...' : 'Pay from Wallet'}
                </button>
              </div>
            </div>
          )}

          {a.is_paid && a.payment_status === 'paid' && (
            <div className="atonement-detail-section" style={{ background: '#eafaf1', borderColor: '#27ae60' }}>
              <p style={{ color: '#27ae60', fontWeight: 600, margin: 0 }}>Payment completed</p>
            </div>
          )}

          {/* Action Buttons */}
          {(a.status === 'notified' || a.status === 'pending_user_action') && (
            <div className="atonement-action-row">
              <button className="btn-primary" onClick={handleMarkStarted} disabled={actionLoading === 'started'}>
                {actionLoading === 'started' ? 'Saving...' : 'Mark as Started'}
              </button>
            </div>
          )}

          {a.status === 'in_progress' && a.proof_required && (
            <div className="atonement-detail-section">
              <h3>Upload Proof</h3>
              <textarea placeholder="Describe what you did (optional note)" value={proofNote} onChange={e => setProofNote(e.target.value)} rows={3} />
              <button className="btn-primary" onClick={handleUploadProof} disabled={actionLoading === 'proof'} style={{ marginTop: 10 }}>
                {actionLoading === 'proof' ? 'Uploading...' : 'Upload Proof'}
              </button>
            </div>
          )}

          {/* Status History */}
          {a.history && a.history.length > 0 && (
            <div className="atonement-detail-section">
              <h3>Status History</h3>
              <div className="atonement-timeline">
                {a.history.map(h => (
                  <div key={h.id} className="atonement-timeline-item">
                    <div className="atonement-timeline-dot" style={{ background: STATUS_COLORS[h.new_status] || '#999' }} />
                    <div>
                      <b>{formatLabel(h.new_status)}</b>
                      <small>{new Date(h.created_at).toLocaleString()}</small>
                      {h.note && <p style={{ fontSize: 12, color: '#6e6573', margin: '2px 0 0' }}>{h.note}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Proofs */}
          {a.proofs && a.proofs.length > 0 && (
            <div className="atonement-detail-section">
              <h3>Uploaded Proofs</h3>
              {a.proofs.map(p => (
                <div key={p.id} className="atonement-proof-item">
                  <span>{formatLabel(p.proof_type || 'file')}</span>
                  <small>{p.note || 'Proof uploaded'}</small>
                  <small>{new Date(p.created_at).toLocaleDateString()}</small>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
          <Link to="/user/atonements" className="btn-secondary">My Remedies</Link>
          <Link to="/user/astrologers" className="btn-secondary">Consult Astrologer</Link>
        </div>
      </div>
    </section>
  );
}
