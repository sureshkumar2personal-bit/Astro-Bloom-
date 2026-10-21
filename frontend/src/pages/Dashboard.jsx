import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Shell from '../components/common/Shell';
import AstrologerLayout from '../components/astrologer/AstrologerLayout';
import QuickAskButton from '../components/common/QuickAskButton';
import { getLiveSessions } from '../api/liveApi';
import { getAccessToken } from '../api/client';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export default function Dashboard({ astrologer = false }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [liveNow, setLiveNow] = useState([]);

  useEffect(() => {
    fetch(`${API}/${astrologer ? 'astrologer' : 'user'}/dashboard`, {
      headers: { Authorization: `Bearer ${getAccessToken()}` }
    })
      .then(r => r.json())
      .then(r => r.success ? setData(r.data) : setError(r.message))
      .catch(() => setError('Unable to load your dashboard.'));
  }, [astrologer]);

  useEffect(() => {
    if (astrologer) return;
    getLiveSessions({ status: 'live' }).then(r => setLiveNow(r.data)).catch(() => {});
  }, [astrologer]);

  if (error) return <Shell><section className="dashboard"><h1>Dashboard unavailable</h1><p>{error}</p><Link className="primary dash-btn" to={astrologer ? '/astrologer/login' : '/user/login'}>Sign in again</Link></section></Shell>;
  if (!data) return <Shell><section className="dashboard"><p className="eyebrow">LOADING YOUR COSMIC SPACE</p><h1>Gathering your stars…</h1></section></Shell>;

  const stat = (title, value, note, icon) => (
    <article className="astro-stat-card group">
      <span className="text-[#5c3b8b] text-xl mb-1">{icon}</span>
      <small className="text-[10px] text-[#817987] uppercase">{title}</small>
      <b className="text-[22px] font-bold text-[#251c35] my-1 block">{value}</b>
      <em className="text-[11px] text-[#918894]">{note}</em>
    </article>
  );

  if (astrologer) {
    const w = data.workSummary;
    return <AstrologerLayout>
      <section className="work-dashboard px-8 md:px-6 lg:px-8 xl:px-8 py-6">
        {/* Hero section — two-column grid on desktop */}
        <div className="astro-hero grid gap-6 md:grid-cols-[1fr_auto] items-start mb-6">
          <div className="astro-hero-left">
            <p className="eyebrow text-[10px] font-bold tracking-[2px] uppercase text-[#b585d0] mb-2">PRACTITIONER PORTAL · ✓ VERIFIED</p>
            <h1 className="dash-greeting font-playfair italic text-4xl text-[#5c3b8b] mb-1">Good day, {data.astrologer.displayName?.split(' ')[0]} ✦</h1>
            <p className="dash-subtext italic text-sm text-[#9e8faa] m-0">Here's what the universe has planned for you today.</p>
          </div>
          <div className="astro-hero-right flex-shrink-0">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eef7ee] px-4 py-2 font-bold text-xs text-[#2e7d32] whitespace-nowrap">
              ● Available for consultations
            </span>
          </div>
        </div>

        {/* Emergency / Urgent card */}
        <section className="urgent-card flex items-center justify-between gap-4 rounded-xl border border-[#e5dfd8] bg-white p-4 mb-7">
          <div className="urgent-content flex items-center gap-3">
            <span className="urgent-icon text-2xl flex-shrink-0">⚡</span>
            <div className="urgent-text">
              <b className="block font-medium text-[14px] text-[#251c35]">{w.emergencyRequests} emergency request waiting</b>
              <small className="text-[11px] text-[#6e6573]">Respond quickly to help a seeker in need.</small>
            </div>
          </div>
          <button className="urgent-btn flex-shrink-0 rounded-lg bg-[#5c3b8b] px-5 py-2 font-bold text-sm text-white transition-colors hover:bg-[#4e3278]">
            View request →
          </button>
        </section>

        {/* Today's work — stat cards grid */}
        <h2 className="work-section-title font-playfair text-2xl mb-4">Today's work</h2>
        <div className="dash-stats grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {stat('Pending questions', w.pendingQuestions, `${w.overdueQuestions} overdue`, '✦')}
          {stat('Appointment requests', w.appointmentRequests, `${w.upcomingAppointments} upcoming`, '◷')}
          {stat('Disputes', w.generalDisputes + w.textDisputes, 'Needs attention', '!')}
          {stat('Live Sessions', <Link to="/astrologer/live" className="text-[#5c3b8b] font-semibold">View All →</Link>, 'Manage live', '●')}
        </div>

        {/* Schedule & Alerts columns */}
        <div className="dash-columns grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="dash-panel rounded-xl border border-[#e5dfd8] bg-white p-5">
            <h2 className="font-playfair text-lg mb-4">Today's schedule</h2>
            {data.todaySchedule?.length ? data.todaySchedule.map((s, i) => (
              <div key={i} className="schedule-item flex items-center gap-3 py-2.5 border-b border-[#e5dfd8] last:border-b-0">
                <span className="schedule-time block font-semibold text-sm text-[#5c3b8b] min-w-[70px] whitespace-nowrap">{s.time}</span>
                <p className="schedule-title m-0 text-sm text-[#251c35] flex-1">{s.title}</p>
              </div>
            )) : <p className="panel-empty text-sm text-[#817987] text-center py-4">No scheduled sessions today.</p>}
          </div>
          <div className="dash-panel rounded-xl border border-[#e5dfd8] bg-white p-5">
            <h2 className="font-playfair text-lg mb-4">Alerts</h2>
            {data.alerts?.length ? data.alerts.map((a, i) => (
              <div key={i} className="alert-item flex items-start gap-3 py-2.5 border-b border-[#e5dfd8] last:border-b-0">
                <span className="alert-icon flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#fef3e0] text-[10px] font-bold text-[#c4860a]">!</span>
                <p className="alert-text m-0 text-sm text-[#4a4450] leading-normal">{a}</p>
              </div>
            )) : <p className="panel-empty text-sm text-[#817987] text-center py-4">No alerts at the moment.</p>}
          </div>
        </div>
      </section>
    </AstrologerLayout>;
  }

  return <Shell><section className="dashboard">
    <QuickAskButton />
    <div className="dash-top"><div><p className="eyebrow">YOUR COSMIC SPACE</p><h1 className="dash-greeting">Welcome back, {data.user?.fullName?.split(' ')[0] || 'Seeker'} ✦</h1><p className="dash-subtext">The stars have been waiting for you.</p></div></div>
    <div className="dash-stats">{stat('Wallet Balance', `₹${data.wallet?.availableBalance || 0}`, 'Available', '★')}{stat('Questions', `${(data.questions?.freeRemaining || 0) + (data.questions?.purchasedRemaining || 0)} remaining`, `${data.questions?.pending || 0} pending`, '✦')}{stat('Appointments', data.appointments?.upcomingCount || 0, 'Upcoming', '◷')}{stat('Live Now', liveNow.length || 0, 'Sessions live', '●')}</div>

    {liveNow.length > 0 && (
      <div className="dash-live-section">
        <h2>● Live Now</h2>
        <div className="dash-live-grid">
          {liveNow.slice(0, 3).map(s => (
            <Link key={s.id} to={`/user/live/${s.id}`} className="dash-live-card">
              <span className="live-pulse">● LIVE</span>
              <h3>{s.title}</h3>
              <p>{s.astrologerName} · {s.topic}</p>
              <span className="dash-live-viewers">{s.viewerCount} watching</span>
            </Link>
          ))}
        </div>
        {liveNow.length > 3 && <Link className="btn-view" to="/user/live">View All Live →</Link>}
      </div>
    )}

    <div className="astro-hero"><div><p>TOP ASTROLOGERS</p><h2>Connect with <em>trusted guides</em></h2><span>Your personalized recommendations based on your cosmic profile.</span></div><div className="hero-moon">☾</div></div>
    <div className="top-astro-grid">{data.topAstrologers?.map((a, i) => <div key={i} className="top-astro-card"><h3>{a.name}</h3><p>{a.specialty}</p><div className="top-astro-meta"><span>★ {a.rating}</span><span>{a.experience}</span></div><p className="top-astro-lang">{a.language}</p><div className="top-astro-bottom"><span className="top-astro-price">₹{a.price}</span><Link className="btn-view" to={`/user/astrologers/${a.id}`}>View Profile →</Link></div></div>)}</div>
  </section></Shell>;
}
