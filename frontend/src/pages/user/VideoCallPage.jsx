import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Shell from '../../components/common/Shell';

export default function VideoCallPage() {
  const { appointmentId } = useParams();
  const [duration, setDuration] = useState(0);
  const [ended, setEnded] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setDuration(d => d + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return <Shell>
    <section className="video-call-page">
      <div className="call-container">
        <div className="call-video-main">
          <div className="call-placeholder">
            <div className="call-avatar">☾</div>
            <p className="call-status">{ended ? 'Call Ended' : 'Connecting...'}</p>
            <p className="call-timer">{fmt(duration)}</p>
          </div>
        </div>
        <div className="call-video-self">
          <div className="call-self-avatar">✦</div>
        </div>
        <div className="call-controls">
          <button className="call-ctrl-btn">🎤</button>
          <button className="call-ctrl-btn">📹</button>
          <button className="call-ctrl-btn">💬</button>
          <button className="call-ctrl-btn call-end-btn" onClick={() => setEnded(true)}>📞</button>
        </div>
        {ended && <div className="call-ended-actions">
          <Link className="primary" to="/user/appointments">Back to Appointments</Link>
          <Link className="outline-link" to="/user/dashboard">Dashboard</Link>
        </div>}
      </div>
    </section>
  </Shell>;
}
