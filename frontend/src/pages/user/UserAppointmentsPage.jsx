import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Shell from '../../components/common/Shell';
import Notice from '../../components/common/Notice';
import { getUserAppointments, cancelAppointment } from '../../api/appointmentApi';

export default function UserAppointmentsPage() {
  const [appointments, setAppointments] = useState([]);
  const [filter, setFilter] = useState('all');
  const [msg, setMsg] = useState('');

  const load = () => getUserAppointments(filter === 'all' ? '' : filter).then(r => setAppointments(r.data)).catch(() => {});
  useEffect(() => { load(); }, [filter]);

  async function handleCancel(id) {
    if (!confirm('Cancel this appointment?')) return;
    try { await cancelAppointment(id, 'User cancelled'); setMsg('Appointment cancelled.'); load(); } catch (err) { setMsg(err.message); }
  }

  const statusColor = s => ({ confirmed: '#3a7a3a', pending_payment: '#c4860a', in_progress: '#5c3b8b', completed: '#3a7a3a', cancelled_by_user: '#b44040', cancelled_by_astrologer: '#b44040' }[s] || '#817987');

  return <Shell>
    <section className="appointments-page">
      <div className="page-header"><h1>My Appointments</h1></div>
      <div className="filter-pills">
        {['all','pending_payment','confirmed','in_progress','completed'].map(f => <button key={f} className={filter === f ? 'active' : ''} onClick={() => setFilter(f)}>{f === 'all' ? 'All' : f.replace(/_/g, ' ')}</button>)}
      </div>
      <Notice message={msg} />
      {appointments.length === 0 ? <div className="empty-state"><p>No appointments found.</p><Link className="primary" to="/user/astrologers">Browse Astrologers →</Link></div> : (
        <div className="appointments-list">
          {appointments.map(a => (
            <div key={a.id} className="appointment-card">
              <div className="apt-header">
                <h3>{a.astrologerName}</h3>
                <span className="apt-status" style={{ color: statusColor(a.status) }}>{a.status.replace(/_/g, ' ')}</span>
              </div>
              <div className="apt-details">
                <span>📅 {a.scheduledDate}</span><span>🕐 {a.scheduledTime}</span>
                <span>⏱ {a.durationMinutes} min</span><span>📞 {a.type}</span>
                <span>💰 ₹{a.price}</span>
              </div>
              <div className="apt-actions">
                {a.status === 'confirmed' && <Link className="primary" to={`/user/appointments/${a.id}/call`}>Join Call →</Link>}
                {['pending_payment','confirmed'].includes(a.status) && <button className="btn-cancel" onClick={() => handleCancel(a.id)}>Cancel</button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  </Shell>;
}
