import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Shell from '../../components/common/Shell';
import Notice from '../../components/common/Notice';
import { getAvailableSlots, createAppointment, payAppointment } from '../../api/appointmentApi';

export default function AppointmentBookingPage() {
  const { astrologerId } = useParams();
  const nav = useNavigate();
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [appointmentType, setAppointmentType] = useState('video');
  const [notes, setNotes] = useState('');
  const [msg, setMsg] = useState('');
  const [step, setStep] = useState(1);

  useEffect(() => {
    if (!date) return;
    getAvailableSlots(astrologerId, date).then(r => setSlots(r.data)).catch(() => setSlots([]));
  }, [date, astrologerId]);

  async function handleBook(e) {
    e.preventDefault(); setMsg('');
    if (!date || !selectedSlot) return setMsg('Please select a date and time slot.');
    try {
      const r = await createAppointment({ astrologerId, appointmentType, scheduledDate: date, scheduledTime: selectedSlot.time, durationMinutes: selectedSlot.duration, notes });
      setMsg('Appointment created! Proceeding to payment...');
      setTimeout(() => nav(`/user/appointments/${r.data.appointmentId}/pay`, { state: { appointmentId: r.data.appointmentId, price: r.data.price } }), 1500);
    } catch (err) { setMsg(err.message); }
  }

  const today = new Date().toISOString().split('T')[0];

  return <Shell>
    <section className="appointment-booking-page">
      <div className="booking-header">
        <p className="eyebrow">BOOK APPOINTMENT</p>
        <h1>Schedule a consultation</h1>
      </div>
      <div className="booking-steps">
        <span className={step >= 1 ? 'active' : ''}>1 Select Date & Time</span>
        <span className={step >= 2 ? 'active' : ''}>2 Confirm Details</span>
      </div>
      {step === 1 && <div className="booking-date-section">
        <label className="field"><span>Select date</span><input type="date" min={today} value={date} onChange={e => { setDate(e.target.value); setSelectedSlot(null); }} className="cosmic-input" /></label>
        <div className="booking-type-select">
          <label><span>Consultation type</span></label>
          <div className="type-options">
            {[['video','Video Call'],['voice','Voice Call'],['chat','Chat']].map(([v, l]) => (
              <button key={v} type="button" className={`type-option ${appointmentType === v ? 'selected' : ''}`} onClick={() => setAppointmentType(v)}>{l}</button>
            ))}
          </div>
        </div>
        {date && <div className="slots-section"><h3>Available time slots</h3>
          {slots.length === 0 ? <p className="muted">No published slots are available on this date. Please choose another date or ask the astrologer to publish availability.</p> : <div className="slots-grid">
            {slots.map(s => <button key={s.time} type="button" className={`slot-pill ${selectedSlot?.time === s.time ? 'selected' : ''}`} onClick={() => setSelectedSlot(s)}>{s.time}</button>)}
          </div>}
        </div>}
        {selectedSlot && <button className="primary" onClick={() => setStep(2)}>Continue →</button>}
      </div>}
      {step === 2 && <form onSubmit={handleBook} className="booking-confirm-section">
        <div className="booking-summary">
          <h3>Booking Summary</h3>
          <div className="summary-row"><span>Date</span><b>{date}</b></div>
          <div className="summary-row"><span>Time</span><b>{selectedSlot?.time}</b></div>
          <div className="summary-row"><span>Type</span><b>{appointmentType}</b></div>
          <div className="summary-row"><span>Duration</span><b>{selectedSlot?.duration || 30} min</b></div>
        </div>
        <label className="field"><span>Notes (optional)</span><textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any specific questions or topics..." /></label>
        <Notice message={msg} />
        <div className="form-nav">
          <button type="button" className="btn-back" onClick={() => setStep(1)}>← Back</button>
          <button type="submit" className="primary">Book & Pay →</button>
        </div>
      </form>}
    </section>
  </Shell>;
}
