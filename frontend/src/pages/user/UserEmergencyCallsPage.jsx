import { useEffect, useState } from 'react';
import {
  getEmergencyAstrologers,
  getEmergencyAstrologerSlots,
  bookEmergencySlot,
  getUserEmergencyQueue,
  payEmergencyRequest,
  cancelEmergencyRequest,
  rateEmergencyCall,
  getEmergencyOptions
} from '../../api/emergencyApi';

const STATUS_LABELS = {
  requested: 'New Request', waiting_for_astrologer: 'Waiting', payment_pending: 'Awaiting Payment',
  payment_completed: 'Paid - Waiting', call_ready: 'Ready', accepted: 'Accepted',
  call_in_progress: 'In Progress', call_completed: 'Completed', missed: 'Missed',
  rejected: 'Rejected', expired: 'Expired', cancelled: 'Cancelled',
  refund_pending: 'Refund Pending', refunded: 'Refunded', disputed: 'Disputed', closed: 'Closed'
};
const STATUS_COLORS = {
  requested: '#db9a40', waiting_for_astrologer: '#db9a40', payment_pending: '#3498db', payment_completed: '#3498db',
  call_ready: '#27ae60', accepted: '#27ae60', call_in_progress: '#8e44ad', call_completed: '#27ae60',
  missed: '#c0392b', rejected: '#c0392b', expired: '#817987', cancelled: '#817987',
  refund_pending: '#db9a40', refunded: '#817987', disputed: '#c0392b', closed: '#817987'
};

export default function UserEmergencyCallsPage() {
  const [view, setView] = useState('list');
  const [astrologers, setAstrologers] = useState([]);
  const [selectedAstro, setSelectedAstro] = useState(null);
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [options, setOptions] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [booking, setBooking] = useState({ callType: 'audio', purpose: '', language: '' });
  const [filter, setFilter] = useState('');

  const loadAstrologers = async () => {
    try {
      const res = await getEmergencyAstrologers({});
      setAstrologers(res.data?.items || []);
    } catch (e) {
      setError(e.message || 'Failed to load astrologers.');
    }
  };

  const loadRequests = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter) params.status = filter;
      const res = await getUserEmergencyQueue(params);
      setRequests(res.data?.requests || []);
    } catch (e) {
      setError(e.message || 'Failed to load requests.');
    } finally {
      setLoading(false);
    }
  };

  const loadOptions = async () => {
    try {
      const res = await getEmergencyOptions();
      setOptions(res.data);
      if (res.data?.purposes?.length) setBooking(b => ({ ...b, purpose: res.data.purposes[0] }));
      if (res.data?.languages?.length) setBooking(b => ({ ...b, language: res.data.languages[0] }));
    } catch {}
  };

  useEffect(() => {
    loadAstrologers();
    loadOptions();
  }, []);

  useEffect(() => { loadRequests(); }, [filter]);

  const selectAstrologer = async (astro) => {
    setSelectedAstro(astro);
    setSelectedSlot(null);
    setError('');
    setLoadingSlots(true);
    try {
      const res = await getEmergencyAstrologerSlots(astro.id);
      setSlots(res.data?.slots || []);
      setBooking(b => ({ ...b, language: res.data?.languages?.[0] || '' }));
    } catch (e) {
      setError(e.message || 'Failed to load slots.');
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleBook = async () => {
    setError('');
    if (!selectedSlot) return setError('Select a time slot first.');
    setSubmitting(true);
    try {
      const res = await bookEmergencySlot({
        slotId: selectedSlot.id,
        callType: booking.callType,
        purpose: booking.purpose,
        language: booking.language,
        paymentMethod: 'wallet'
      });
      const rid = res.data?.requestId;
      setView('list');
      setSelectedAstro(null);
      setSelectedSlot(null);
      setBooking({ callType: 'audio', purpose: options?.purposes?.[0] || '', language: options?.languages?.[0] || '' });
      if (rid) {
        await payEmergencyRequest(rid);
      }
      await loadRequests();
    } catch (e) {
      setError(e.message || 'Booking failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePay = async (requestId) => {
    if (!confirm('Pay for this emergency call from your wallet?')) return;
    try {
      await payEmergencyRequest(requestId);
      await loadRequests();
    } catch (e) {
      setError(e.message || 'Payment failed.');
    }
  };

  const handleCancel = async (requestId) => {
    const reason = prompt('Reason for cancellation (optional):');
    if (reason === null) return;
    try {
      await cancelEmergencyRequest(requestId, reason || undefined);
      await loadRequests();
    } catch (e) {
      setError(e.message || 'Failed to cancel.');
    }
  };

  const handleRate = async (requestId) => {
    const rating = prompt('Rate this call 1-5:');
    const r = parseInt(rating);
    if (!r || r < 1 || r > 5) return alert('Rating must be between 1 and 5.');
    const reviewText = prompt('Leave a review (optional):');
    try {
      await rateEmergencyCall(requestId, { rating: r, reviewText: reviewText || undefined });
      await loadRequests();
    } catch (e) {
      setError(e.message || 'Failed to submit rating.');
    }
  };

  const pending = requests.filter(r => ['requested', 'payment_pending'].includes(r.status));
  const active = requests.filter(r => ['payment_completed', 'call_ready', 'accepted', 'call_in_progress', 'waiting_for_astrologer'].includes(r.status));
  const past = requests.filter(r => !['requested', 'payment_pending', 'payment_completed', 'call_ready', 'accepted', 'call_in_progress', 'waiting_for_astrologer'].includes(r.status));

  const canRate = (r) => r.status === 'call_completed' && r.rating == null && (!r.ratingWindowExpiresAt || new Date(r.ratingWindowExpiresAt) > new Date());

  return (
    <section className="emer-page">
      <div className="emer-header">
        <div>
          <h1>Emergency Calls</h1>
          <p className="emer-subtitle">Book a priority slot with an available astrologer</p>
        </div>
        <button className="emer-new-btn" onClick={() => { setView(view === 'new' ? 'list' : 'new'); setError(''); }}>
          {view === 'new' ? '← Back' : '+ Book Emergency Slot'}
        </button>
      </div>

      {error && <div className="emer-error">{error}</div>}

      {view === 'new' ? (
        <div className="emer-form-card">
          <h2>Book Emergency Slot</h2>
          {!selectedAstro ? (
            <>
              <p className="emer-form-desc">Choose an astrologer available for emergency calls.</p>
              <div className="emer-list">
                {astrologers.length === 0 && <div className="emer-empty"><p>No astrologers available right now.</p></div>}
                {astrologers.map(a => (
                  <div key={a.id} className="emer-card" style={{ cursor: 'pointer' }} onClick={() => selectAstrologer(a)}>
                    <div className="emer-card-header">
                      <span className="emer-card-type">{a.professionalTitle || 'Astrologer'}</span>
                    </div>
                    <h3>{a.displayName}</h3>
                    <p className="emer-card-meta">
                      {a.averageRating ? `★ ${Number(a.averageRating).toFixed(1)} • ` : ''}
                      {a.experienceYears ? `${a.experienceYears} yrs • ` : ''}
                      {a.city ? `${a.city} • ` : ''}
                      {a.publishedSlots ? `${a.publishedSlots} slot${a.publishedSlots > 1 ? 's' : ''} available` : 'Checking availability'}
                    </p>
                    {a.shortBio && <p className="emer-card-note">{a.shortBio}</p>}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="emer-card" style={{ marginBottom: 16 }}>
                <div className="emer-card-header">
                  <span className="emer-card-type">{selectedAstro.professionalTitle || 'Astrologer'}</span>
                </div>
                <h3>{selectedAstro.displayName}</h3>
                <p className="emer-card-meta">
                  {selectedAstro.averageRating ? `★ ${Number(selectedAstro.averageRating).toFixed(1)} • ` : ''}
                  {selectedAstro.experienceYears ? `${selectedAstro.experienceYears} yrs • ` : ''}
                  {selectedAstro.city ? `${selectedAstro.city} • ` : ''}
                  {selectedAstro.publishedSlots ? `${selectedAstro.publishedSlots} slot${selectedAstro.publishedSlots > 1 ? 's' : ''} available` : ''}
                </p>
                <button className="emer-cancel-btn" onClick={() => { setSelectedAstro(null); setSelectedSlot(null); }}>← Change astrologer</button>
              </div>

              {loadingSlots ? (
                <div className="emer-loading">Loading slots...</div>
              ) : slots.length === 0 ? (
                <div className="emer-empty"><p>No available slots for this astrologer right now.</p></div>
              ) : (
                <>
                  <h3 style={{ marginBottom: 12 }}>Available Slots</h3>
                  <div className="emer-list">
                    {slots.map(s => (
                      <div key={s.id}
                        className={`emer-card ${selectedSlot?.id === s.id ? 'emer-card-accepted' : ''}`}
                        style={{ cursor: 'pointer', border: selectedSlot?.id === s.id ? '2px solid var(--purple)' : undefined }}
                        onClick={() => setSelectedSlot(s)}>
                        <div className="emer-card-header">
                          <span className="emer-card-type">{new Date(s.slotDate).toLocaleDateString()} {s.startTime}-{s.endTime}</span>
                          <span className="emer-status-badge" style={{ background: '#27ae60' }}>{s.maxSlots} slots left</span>
                        </div>
                        <h3>{s.title || 'Emergency Slot'} <span style={{ fontWeight: 400, fontSize: 14, color: '#817987' }}>₹{s.price}</span></h3>
                        <p className="emer-card-meta">
                          {s.callDurationMinutes} min call • {s.callModes === 'both' ? 'Audio+Video' : s.callModes}
                          {s.languages?.length ? ` • ${s.languages.join(', ')}` : ''}
                        </p>
                        {s.priceBreakdown && (
                          <div className="emer-rate-display" style={{ marginTop: 8 }}>
                            <div className="emer-rate-item"><span>Base</span><strong>₹{s.priceBreakdown.basePrice}</strong></div>
                            <div className="emer-rate-item"><span>Platform Fee</span><strong>₹{s.priceBreakdown.platformFee}</strong></div>
                            <div className="emer-rate-item"><span>Tax</span><strong>₹{s.priceBreakdown.tax}</strong></div>
                            <div className="emer-rate-item"><span>Total</span><strong>₹{s.priceBreakdown.total}</strong></div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {selectedSlot && (
                    <div className="emer-form-card" style={{ marginTop: 16 }}>
                      <h2>Confirm Booking</h2>
                      <div className="emer-field">
                        <label>Call Type</label>
                        <div className="emer-radio-group">
                          <label className="emer-radio">
                            <input type="radio" name="callType" value="audio" checked={booking.callType === 'audio'}
                              onChange={e => setBooking(b => ({ ...b, callType: e.target.value }))} disabled={!['audio', 'both'].includes(selectedSlot.callModes)} />
                            <span>Audio</span>
                          </label>
                          <label className="emer-radio">
                            <input type="radio" name="callType" value="video" checked={booking.callType === 'video'}
                              onChange={e => setBooking(b => ({ ...b, callType: e.target.value }))} disabled={!['video', 'both'].includes(selectedSlot.callModes)} />
                            <span>Video</span>
                          </label>
                        </div>
                      </div>
                      <div className="emer-field">
                        <label>Purpose *</label>
                        <select value={booking.purpose} onChange={e => setBooking(b => ({ ...b, purpose: e.target.value }))}>
                          <option value="">Select purpose...</option>
                          {(options?.purposes || selectedSlot.purposes || ['Career', 'Marriage', 'Health', 'Finance', 'Other']).map(p => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      </div>
                      <div className="emer-field">
                        <label>Language</label>
                        <select value={booking.language} onChange={e => setBooking(b => ({ ...b, language: e.target.value }))}>
                          {(options?.languages || ['Tamil', 'English', 'Hindi', 'Telugu']).map(l => (
                            <option key={l} value={l}>{l}</option>
                          ))}
                        </select>
                      </div>
                      <button className="emer-submit-btn" onClick={handleBook} disabled={submitting || !booking.purpose}>
                        {submitting ? 'Booking...' : 'Book & Pay ₹' + (selectedSlot.priceBreakdown?.total || selectedSlot.price)}
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <div className="emer-section">
              <h2 className="emer-section-title">Active / Waiting</h2>
              <div className="emer-list">
                {active.map(r => (
                  <div key={r.id} className={`emer-card emer-card-${r.status}`}>
                    <div className="emer-card-header">
                      <span className="emer-card-type">{r.callType}</span>
                      <span className="emer-status-badge" style={{ background: STATUS_COLORS[r.status] }}>{STATUS_LABELS[r.status]}</span>
                    </div>
                    <h3>{r.astrologerName}</h3>
                    <p className="emer-card-meta">
                      {new Date(r.createdAt).toLocaleString()}
                      {r.queuePosition ? ` • Queue #${r.queuePosition}` : ''}
                    </p>
                    {r.purpose && <p className="emer-card-note">Purpose: {r.purpose}</p>}
                    {r.astrologerResponse && <p className="emer-card-note">Astrologer: {r.astrologerResponse}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {pending.length > 0 && (
            <div className="emer-section">
              <h2 className="emer-section-title">Awaiting Payment</h2>
              <div className="emer-list">
                {pending.map(r => (
                  <div key={r.id} className="emer-card">
                    <div className="emer-card-header">
                      <span className="emer-card-type">{r.callType}</span>
                      <span className="emer-status-badge" style={{ background: STATUS_COLORS[r.status] }}>{STATUS_LABELS[r.status]}</span>
                    </div>
                    <h3>{r.astrologerName}</h3>
                    <p className="emer-card-meta">₹{r.priceCharged} • {new Date(r.createdAt).toLocaleString()}</p>
                    <div className="emer-card-actions">
                      <button className="emer-pay-btn" onClick={() => handlePay(r.id)}>Pay ₹{r.priceCharged}</button>
                      <button className="emer-cancel-btn" onClick={() => handleCancel(r.id)}>Cancel</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="emer-section">
            <h2 className="emer-section-title">History</h2>
            {loading ? (
              <div className="emer-loading">Loading...</div>
            ) : requests.length === 0 ? (
              <div className="emer-empty">
                <p>No emergency bookings yet.</p>
                <button className="emer-new-btn" onClick={() => setView('new')}>Book Your First Emergency Slot</button>
              </div>
            ) : (
              <div className="emer-list">
                {past.map(r => (
                  <div key={r.id} className="emer-card">
                    <div className="emer-card-header">
                      <span className="emer-card-type">{r.callType}</span>
                      <span className="emer-status-badge" style={{ background: STATUS_COLORS[r.status] }}>{STATUS_LABELS[r.status]}</span>
                    </div>
                    <h3>{r.astrologerName}</h3>
                    <p className="emer-card-meta">{r.priceCharged ? `₹${r.priceCharged} • ` : ''}{new Date(r.createdAt).toLocaleString()}</p>
                    {r.rejectionReason && <p className="emer-card-reject">Reason: {r.rejectionReason}</p>}
                    {r.cancellationReason && <p className="emer-card-reject">Cancelled: {r.cancellationReason}</p>}
                    {r.rating && <p className="emer-card-note">Your rating: {r.rating}★</p>}
                    {canRate(r) && (
                      <div className="emer-card-actions">
                        <button className="emer-accept-btn" onClick={() => handleRate(r.id)}>Rate Call</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
