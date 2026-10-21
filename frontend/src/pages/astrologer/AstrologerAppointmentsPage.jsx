import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Shell from '../../components/common/Shell';
import Notice from '../../components/common/Notice';
import { getAstrologerAppointments, astrologerCancelAppointment, startCall, endCall } from '../../api/appointmentApi';

export default function AstrologerAppointmentsPage() {
  const [appointments, setAppointments] = useState([]);
  const [filter, setFilter] = useState('all');
  const [msg, setMsg] = useState('');

  const load = () => getAstrologerAppointments(filter === 'all' ? '' : filter).then(r => setAppointments(r.data)).catch(() => {});
  useEffect(() => { load(); }, [filter]);

  async function handleStartCall(id) {
    try { const r = await startCall(id); setMsg('Call started!'); load(); } catch (err) { setMsg(err.message); }
  }
  async function handleEndCall(id) {
    try { await endCall(id); setMsg('Call ended.'); load(); } catch (err) { setMsg(err.message); }
  }
  async function handleCancel(id) {
    if (!confirm('Cancel this appointment?')) return;
    try { await astrologerCancelAppointment(id, 'Astrologer cancelled'); setMsg('Appointment cancelled.'); load(); } catch (err) { setMsg(err.message); }
  }

  const statusColor = s => ({ confirmed: '#3a7a3a', pending_payment: '#c4860a', in_progress: '#5c3b8b', completed: '#3a7a3a', cancelled_by_user: '#b44040', cancelled_by_astrologer: '#b44040' }[s] || '#817987');

  return <Shell>
    <section className="appointments-page">
      <div className="page-header"><h1>Appointments</h1><Link to="/astrologer/schedule" className="outline-link">Publish Availability →</Link></div>
      <div className="filter-pills">
        {['all','confirmed','in_progress','completed'].map(f => <button key={f} className={filter === f ? 'active' : ''} onClick={() => setFilter(f)}>{f === 'all' ? 'All' : f.replace(/_/g, ' ')}</button>)}
      </div>
      <Notice message={msg} />
      {appointments.length === 0 ? <div className="empty-state"><p>No appointments found.</p></div> : (
        <div className="appointments-list">
          {appointments.map(a => (
            <div key={a.id} className="appointment-card">
              <div className="apt-header">
                <h3>{a.userName}</h3>
                <span className="apt-status" style={{ color: statusColor(a.status) }}>{a.status.replace(/_/g, ' ')}</span>
              </div>
              <div className="apt-details">
                <span>📅 {a.scheduledDate}</span><span>🕐 {a.scheduledTime}</span>
                <span>⏱ {a.durationMinutes} min</span><span>📞 {a.type}</span>
                <span>💰 ₹{a.price}</span>
              </div>
              <div className="apt-actions">
                {a.status === 'confirmed' && <button className="primary" onClick={() => handleStartCall(a.id)}>Start Call →</button>}
                {a.status === 'in_progress' && <button className="primary" onClick={() => handleEndCall(a.id)}>End Call</button>}
                {['confirmed'].includes(a.status) && <button className="btn-cancel" onClick={() => handleCancel(a.id)}>Cancel</button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  </Shell>;
}
