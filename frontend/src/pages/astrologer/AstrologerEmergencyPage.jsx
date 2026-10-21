import { useEffect, useState } from 'react';
import AstrologerLayout from '../../components/astrologer/AstrologerLayout';
import {
  toggleEmergencyAvailability,
  getAstrologerEmergencyRequests,
  getEmergencySlots,
  createEmergencySlot,
  updateEmergencySlot,
  updateEmergencySlotStatus,
  deleteEmergencySlot,
  getAstrologerEmergencyDashboard,
  getEmergencyQueueRequests,
  acceptEmergencyRequest,
  rejectEmergencyRequest,
  startEmergencyCall,
  endEmergencyCall
} from '../../api/emergencyApi';

const QUEUE_STATUS_LABELS = {
  requested: 'New Request', waiting_for_astrologer: 'Waiting', payment_pending: 'Awaiting Payment',
  payment_completed: 'Paid - Waiting', call_ready: 'Ready', accepted: 'Accepted',
  call_in_progress: 'In Progress', call_completed: 'Completed', missed: 'Missed',
  rejected: 'Rejected', expired: 'Expired', cancelled: 'Cancelled',
  refund_pending: 'Refund Pending', refunded: 'Refunded', disputed: 'Disputed', closed: 'Closed'
};
const QUEUE_STATUS_COLORS = {
  requested: '#db9a40', waiting_for_astrologer: '#db9a40', payment_pending: '#3498db', payment_completed: '#3498db',
  call_ready: '#27ae60', accepted: '#27ae60', call_in_progress: '#8e44ad', call_completed: '#27ae60',
  missed: '#c0392b', rejected: '#c0392b', expired: '#817987', cancelled: '#817987',
  refund_pending: '#db9a40', refunded: '#817987', disputed: '#c0392b', closed: '#817987'
};
const SLOT_STATUS_LABELS = { draft: 'Draft', published: 'Published', paused: 'Paused', cancelled: 'Cancelled' };
const SLOT_STATUS_COLORS = { draft: '#817987', published: '#27ae60', paused: '#db9a40', cancelled: '#c0392b' };

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const defaultForm = {
  title: '', slotDate: '', startTime: '', endTime: '',
  breakTimeMinutes: 5, callDurationMinutes: 20,
  price: '', subscriberPrice: '', nonSubscriberPrice: '',
  platformFee: 20, tax: 18,
  paymentTiming: 'before', languages: ['Tamil', 'English'], purposes: ['Career'],
  callModes: 'both', isRecurring: false, recurWeekdays: [], status: 'published'
};

export default function AstrologerEmergencyPage() {
  const [view, setView] = useState('dashboard');
  const [available, setAvailable] = useState(false);
  const [slots, setSlots] = useState([]);
  const [requests, setRequests] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [toggling, setToggling] = useState(false);
  const [slotForm, setSlotForm] = useState(defaultForm);
  const [editingSlotId, setEditingSlotId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadSlots = async () => {
    try {
      const res = await getEmergencySlots({});
      setSlots(res.data?.slots || []);
    } catch {}
  };

  const loadRequests = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter) params.status = filter;
      const res = await getEmergencyQueueRequests(params);
      setRequests(res.data?.requests || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadDashboard = async () => {
    try {
      const res = await getAstrologerEmergencyDashboard();
      setDashboard(res.data);
    } catch {}
  };

  useEffect(() => {
    loadAvailability();
    loadRequests();
    loadSlots();
    loadDashboard();
  }, [filter]);

  const loadAvailability = async () => {
    try {
      const res = await getAstrologerEmergencyRequests({});
      setAvailable(res.data?.emergencyAvailable === true);
    } catch {}
  };

  const handleToggle = async () => {
    setToggling(true);
    try {
      const res = await toggleEmergencyAvailability(!available);
      setAvailable(res.data?.emergencyAvailable ?? !available);
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to toggle.');
    } finally {
      setToggling(false);
    }
  };

  const showMsg = (text, isErr = false) => {
    setMessage({ text, isErr });
    setTimeout(() => setMessage(''), 4000);
  };

  const handleSaveSlot = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage('');
    try {
      if (editingSlotId) {
        await updateEmergencySlot(editingSlotId, slotForm);
        showMsg('Slot updated.');
      } else {
        await createEmergencySlot(slotForm);
        showMsg('Slot created.');
      }
      setSlotForm(defaultForm);
      setEditingSlotId(null);
      setShowForm(false);
      await loadSlots();
      await loadDashboard();
    } catch (e2) {
      showMsg(e2.response?.data?.message || 'Failed to save slot.', true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSlot = (slot) => {
    setEditingSlotId(slot.id);
    setSlotForm({
      title: slot.title || '', slotDate: slot.slotDate ? slot.slotDate.slice(0, 10) : '',
      startTime: slot.startTime, endTime: slot.endTime,
      breakTimeMinutes: slot.breakTimeMinutes, callDurationMinutes: slot.callDurationMinutes,
      price: slot.price, subscriberPrice: slot.subscriberPrice, nonSubscriberPrice: slot.nonSubscriberPrice,
      platformFee: slot.platformFee, tax: slot.tax,
      paymentTiming: slot.paymentTiming, languages: slot.languages || [], purposes: slot.purposes || [],
      callModes: slot.callModes, isRecurring: slot.isRecurring, recurWeekdays: slot.recurWeekdays || [], status: slot.status
    });
    setShowForm(true);
  };

  const handleSetStatus = async (slotId, status) => {
    try {
      await updateEmergencySlotStatus(slotId, status);
      await loadSlots();
    } catch (e) {
      showMsg(e.response?.data?.message || 'Failed to update status.', true);
    }
  };

  const handleDeleteSlot = async (slotId) => {
    if (!confirm('Delete this slot? This cannot be undone.')) return;
    try {
      await deleteEmergencySlot(slotId);
      await loadSlots();
      showMsg('Slot deleted.');
    } catch (e) {
      showMsg(e.response?.data?.message || 'Failed to delete slot.', true);
    }
  };

  const handleAccept = async (requestId) => {
    try {
      await acceptEmergencyRequest(requestId);
      await loadRequests();
      await loadDashboard();
    } catch (e) { showMsg(e.response?.data?.message || 'Failed.', true); }
  };

  const handleReject = async (requestId) => {
    const reason = prompt('Reason for declining:');
    if (reason === null) return;
    try {
      await rejectEmergencyRequest(requestId, reason || undefined);
      await loadRequests();
      await loadDashboard();
    } catch (e) { showMsg(e.response?.data?.message || 'Failed.', true); }
  };

  const handleStart = async (requestId) => {
    try {
      await startEmergencyCall(requestId);
      await loadRequests();
      await loadDashboard();
    } catch (e) { showMsg(e.response?.data?.message || 'Failed.', true); }
  };

  const handleEnd = async (requestId) => {
    if (!confirm('End this emergency call?')) return;
    try {
      await endEmergencyCall(requestId);
      await loadRequests();
      await loadDashboard();
    } catch (e) { showMsg(e.response?.data?.message || 'Failed.', true); }
  };

  const active = requests.filter(r => ['accepted', 'call_in_progress'].includes(r.status));
  const pending = requests.filter(r => ['requested', 'waiting_for_astrologer', 'payment_pending', 'payment_completed', 'call_ready'].includes(r.status));
  const past = requests.filter(r => !['accepted', 'call_in_progress', 'requested', 'waiting_for_astrologer', 'payment_pending', 'payment_completed', 'call_ready'].includes(r.status));

  const updateForm = (patch) => setSlotForm(f => ({ ...f, ...patch }));

  const tabStyle = (tab) => ({
    padding: '8px 16px', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600,
    background: view === tab ? '#5c3b8b' : 'transparent',
    color: view === tab ? '#fff' : '#817987',
    transition: 'all 0.2s'
  });

  return (
    <AstrologerLayout>
      <section className="emer-page">
        <div className="emer-header">
          <div>
            <h1>Emergency Calls</h1>
            <p className="emer-subtitle">Manage slots and incoming emergency requests</p>
          </div>
          <button
            className={`emer-toggle-btn ${available ? 'emer-toggle-on' : 'emer-toggle-off'}`}
            onClick={handleToggle}
            disabled={toggling}
          >
            {toggling ? 'Updating...' : available ? 'Available for Emergency' : 'Not Available'}
          </button>
        </div>

        <div className="emer-tabs" style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          <button style={tabStyle('dashboard')} onClick={() => setView('dashboard')}>Dashboard</button>
          <button style={tabStyle('slots')} onClick={() => setView('slots')}>My Slots</button>
          <button style={tabStyle('requests')} onClick={() => setView('requests')}>Requests</button>
        </div>

        {message && <div className={message.isErr ? 'emer-error' : 'emer-success'}>{message.text}</div>}

        {view === 'dashboard' && (
          <div className="emer-dashboard">
            <div className="emer-stat-row">
              <div className="emer-stat-card">
                <div className="emer-stat-value">{dashboard?.availableSlots ?? 0}</div>
                <div className="emer-stat-label">Available Slots</div>
              </div>
              <div className="emer-stat-card">
                <div className="emer-stat-value">{dashboard?.requests ?? 0}</div>
                <div className="emer-stat-label">New Requests</div>
              </div>
              <div className="emer-stat-card">
                <div className="emer-stat-value">{dashboard?.completedCalls ?? 0}</div>
                <div className="emer-stat-label">Completed Calls</div>
              </div>
              <div className="emer-stat-card">
                <div className="emer-stat-value">₹{dashboard?.todayEarnings ?? 0}</div>
                <div className="emer-stat-label">Today's Earnings</div>
              </div>
            </div>

            {active.length > 0 && (
              <div className="emer-section">
                <h2 className="emer-section-title">Active Calls</h2>
                <div className="emer-list">
                  {active.map(r => (
                    <div key={r.id} className="emer-card emer-card-in_progress">
                      <div className="emer-card-header">
                        <span className="emer-card-type">{r.callType}</span>
                        <span className="emer-status-badge" style={{ background: QUEUE_STATUS_COLORS[r.status] }}>{QUEUE_STATUS_LABELS[r.status]}</span>
                      </div>
                      <h3>{r.userName}</h3>
                      <p className="emer-card-meta">{r.startedAt ? `Started ${new Date(r.startedAt).toLocaleTimeString()} • ` : ''}₹{r.priceCharged}</p>
                      {r.purpose && <p className="emer-card-note">Purpose: {r.purpose}</p>}
                      <div className="emer-card-actions">
                        {r.status === 'accepted' && <button className="emer-start-btn" onClick={() => handleStart(r.id)}>Start Call</button>}
                        {r.status === 'call_in_progress' && <button className="emer-end-btn" onClick={() => handleEnd(r.id)}>End Call</button>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {pending.length > 0 && (
              <div className="emer-section">
                <h2 className="emer-section-title">New Requests</h2>
                <div className="emer-list">
                  {pending.slice(0, 5).map(r => (
                    <div key={r.id} className="emer-card">
                      <div className="emer-card-header">
                        <span className="emer-card-type">{r.callType}</span>
                        <span className="emer-status-badge" style={{ background: QUEUE_STATUS_COLORS[r.status] }}>{QUEUE_STATUS_LABELS[r.status]}</span>
                      </div>
                      <h3>{r.userName}</h3>
                      <p className="emer-card-meta">
                        ₹{r.priceCharged} • {r.isSubscriber ? 'Subscriber' : 'Standard'}
                        {r.queuePosition ? ` • Queue #${r.queuePosition}` : ''}
                        {r.priorityScore > 0 ? ' • Priority' : ''}
                      </p>
                      {r.purpose && <p className="emer-card-note">Purpose: {r.purpose}</p>}
                      <div className="emer-card-actions">
                        <button className="emer-accept-btn" onClick={() => handleAccept(r.id)}>Accept</button>
                        <button className="emer-reject-btn" onClick={() => handleReject(r.id)}>Decline</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {view === 'slots' && (
          <div>
            <div className="emer-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 className="emer-section-title" style={{ margin: 0 }}>My Emergency Slots</h2>
                <button className="emer-new-btn" onClick={() => { setShowForm(!showForm); setEditingSlotId(null); if (!showForm) setSlotForm(defaultForm); }}>
                  {showForm ? '← Back' : '+ Create Slot'}
                </button>
              </div>

              {showForm && (
                <div className="emer-form-card">
                  <h2>{editingSlotId ? 'Edit Slot' : 'Create Emergency Slot'}</h2>
                  <form onSubmit={handleSaveSlot} className="emer-form">
                    <div className="emer-field">
                      <label>Title</label>
                      <input type="text" value={slotForm.title} onChange={e => updateForm({ title: e.target.value })} placeholder="e.g. Evening Emergency Slot" />
                    </div>
                    <div className="emer-field">
                      <label>Date *</label>
                      <input type="date" required value={slotForm.slotDate} onChange={e => updateForm({ slotDate: e.target.value })} />
                    </div>
                    <div className="emer-field" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <label>Start Time *</label>
                        <input type="time" required value={slotForm.startTime} onChange={e => updateForm({ startTime: e.target.value })} />
                      </div>
                      <div>
                        <label>End Time *</label>
                        <input type="time" required value={slotForm.endTime} onChange={e => updateForm({ endTime: e.target.value })} />
                      </div>
                    </div>
                    <div className="emer-field" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <label>Call Duration (min)</label>
                        <input type="number" min={1} value={slotForm.callDurationMinutes} onChange={e => updateForm({ callDurationMinutes: e.target.value })} />
                      </div>
                      <div>
                        <label>Break Between Calls (min)</label>
                        <input type="number" min={0} value={slotForm.breakTimeMinutes} onChange={e => updateForm({ breakTimeMinutes: e.target.value })} />
                      </div>
                    </div>
                    <div className="emer-field" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <label>Price (₹) *</label>
                        <input type="number" required min={1} value={slotForm.price} onChange={e => updateForm({ price: e.target.value })} />
                      </div>
                      <div>
                        <label>Subscriber Price (₹)</label>
                        <input type="number" min={0} value={slotForm.subscriberPrice} onChange={e => updateForm({ subscriberPrice: e.target.value })} />
                      </div>
                    </div>
                    <div className="emer-field" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <label>Non-Subscriber Price (₹)</label>
                        <input type="number" min={0} value={slotForm.nonSubscriberPrice} onChange={e => updateForm({ nonSubscriberPrice: e.target.value })} />
                      </div>
                      <div>
                        <label>Payment Timing</label>
                        <select value={slotForm.paymentTiming} onChange={e => updateForm({ paymentTiming: e.target.value })}>
                          <option value="before">Before Call</option>
                          <option value="after">After Call</option>
                        </select>
                      </div>
                    </div>
                    <div className="emer-field" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <label>Platform Fee (₹)</label>
                        <input type="number" min={0} value={slotForm.platformFee} onChange={e => updateForm({ platformFee: e.target.value })} />
                      </div>
                      <div>
                        <label>Tax (%)</label>
                        <input type="number" min={0} value={slotForm.tax} onChange={e => updateForm({ tax: e.target.value })} />
                      </div>
                    </div>
                    <div className="emer-field" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <label>Call Modes</label>
                        <select value={slotForm.callModes} onChange={e => updateForm({ callModes: e.target.value })}>
                          <option value="audio">Audio Only</option>
                          <option value="video">Video Only</option>
                          <option value="both">Audio + Video</option>
                        </select>
                      </div>
                      <div>
                        <label>Languages</label>
                        <input type="text" value={slotForm.languages.join(', ')} onChange={e => updateForm({ languages: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} placeholder="Comma separated" />
                      </div>
                    </div>
                    <div className="emer-field">
                      <label>Purposes</label>
                      <input type="text" value={slotForm.purposes.join(', ')} onChange={e => updateForm({ purposes: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} placeholder="Career, Marriage, Health..." />
                    </div>
                    <div className="emer-field">
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input type="checkbox" checked={slotForm.isRecurring} onChange={e => updateForm({ isRecurring: e.target.checked })} />
                        Recurring weekly
                      </label>
                      {slotForm.isRecurring && (
                        <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                          {WEEKDAYS.map((d, i) => (
                            <label key={d} className="emer-radio" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <input type="checkbox" checked={slotForm.recurWeekdays.includes(i)}
                                onChange={e => updateForm({
                                  recurWeekdays: e.target.checked
                                    ? [...slotForm.recurWeekdays, i]
                                    : slotForm.recurWeekdays.filter(x => x !== i)
                                })} />
                              <span>{d}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="emer-card-actions">
                      <button type="submit" className="emer-accept-btn" disabled={submitting}>
                        {submitting ? 'Saving...' : editingSlotId ? 'Save Changes' : 'Create Slot'}
                      </button>
                      <button type="button" className="emer-reject-btn" onClick={() => { setShowForm(false); setEditingSlotId(null); }}>Cancel</button>
                    </div>
                  </form>
                </div>
              )}

              {loading ? (
                <div className="emer-loading">Loading...</div>
              ) : slots.length === 0 ? (
                <div className="emer-empty">
                  <p>No emergency slots yet. Create one to start receiving bookings.</p>
                </div>
              ) : (
                <div className="emer-list">
                  {slots.map(s => (
                    <div key={s.id} className="emer-card">
                      <div className="emer-card-header">
                        <span className="emer-card-type">{new Date(s.slotDate).toLocaleDateString()} {s.startTime}-{s.endTime}</span>
                        <span className="emer-status-badge" style={{ background: SLOT_STATUS_COLORS[s.status] }}>{SLOT_STATUS_LABELS[s.status]}</span>
                      </div>
                      <h3>{s.title || 'Emergency Slot'} <span style={{ fontWeight: 400, fontSize: 14, color: '#817987' }}>₹{s.price}</span></h3>
                      <p className="emer-card-meta">
                        {s.callDurationMinutes} min calls • {s.breakTimeMinutes} min breaks • {s.totalAvailableMinutes} min window
                        • {s.maxSlots} max slots • {s.callModes === 'both' ? 'Audio+Video' : s.callModes}
                      </p>
                      {s.languages?.length > 0 && <p className="emer-card-meta">Languages: {s.languages.join(', ')}</p>}
                      {s.purposes?.length > 0 && <p className="emer-card-meta">Purposes: {s.purposes.join(', ')}</p>}
                      <div className="emer-card-actions">
                        <button className="emer-start-btn" onClick={() => handleEditSlot(s)}>Edit</button>
                        {s.status !== 'published' && <button className="emer-accept-btn" onClick={() => handleSetStatus(s.id, 'published')}>Publish</button>}
                        {s.status === 'published' && <button className="emer-pay-btn" onClick={() => handleSetStatus(s.id, 'paused')}>Pause</button>}
                        <button className="emer-end-btn" onClick={() => handleDeleteSlot(s.id)}>Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {view === 'requests' && (
          <div>
            <div className="emer-filters">
              <select value={filter} onChange={e => setFilter(e.target.value)} className="emer-filter-select">
                <option value="">All</option>
                <option value="requested">New Requests</option>
                <option value="payment_completed">Paid - Waiting</option>
                <option value="accepted">Accepted</option>
                <option value="call_in_progress">In Progress</option>
                <option value="call_completed">Completed</option>
                <option value="rejected">Rejected</option>
                <option value="missed">Missed</option>
              </select>
            </div>
            {loading ? (
              <div className="emer-loading">Loading...</div>
            ) : requests.length === 0 ? (
              <div className="emer-empty"><p>No requests found.</p></div>
            ) : (
              <div className="emer-list">
                {requests.map(r => (
                  <div key={r.id} className="emer-card">
                    <div className="emer-card-header">
                      <span className="emer-card-type">{r.callType}</span>
                      <span className="emer-status-badge" style={{ background: QUEUE_STATUS_COLORS[r.status] }}>{QUEUE_STATUS_LABELS[r.status]}</span>
                    </div>
                    <h3>{r.userName} {r.userMobile ? <span style={{ fontWeight: 400, fontSize: 13, color: '#817987' }}>{r.userMobile}</span> : null}</h3>
                    <p className="emer-card-meta">
                      ₹{r.priceCharged} • {r.isSubscriber ? 'Subscriber' : 'Standard'}
                      {r.queuePosition ? ` • Queue #${r.queuePosition}` : ''}
                      {r.waitingSeconds ? ` • Waiting ${Math.floor(r.waitingSeconds / 60)}m` : ''}
                    </p>
                    <p className="emer-card-meta">{new Date(r.createdAt).toLocaleString()}</p>
                    {r.purpose && <p className="emer-card-note">Purpose: {r.purpose}</p>}
                    {r.language && <p className="emer-card-note">Language: {r.language}</p>}
                    {r.voiceNoteUrl && <p className="emer-card-note">Voice note: {r.voiceNoteUrl}</p>}
                    {r.rejectionReason && <p className="emer-card-reject">Reason: {r.rejectionReason}</p>}
                    {['requested', 'waiting_for_astrologer', 'payment_pending', 'payment_completed', 'call_ready'].includes(r.status) && (
                      <div className="emer-card-actions">
                        <button className="emer-accept-btn" onClick={() => handleAccept(r.id)}>Accept</button>
                        <button className="emer-reject-btn" onClick={() => handleReject(r.id)}>Decline</button>
                      </div>
                    )}
                    {r.status === 'accepted' && (
                      <div className="emer-card-actions">
                        <button className="emer-start-btn" onClick={() => handleStart(r.id)}>Start Call</button>
                      </div>
                    )}
                    {r.status === 'call_in_progress' && (
                      <div className="emer-card-actions">
                        <button className="emer-end-btn" onClick={() => handleEnd(r.id)}>End Call</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </AstrologerLayout>
  );
}
