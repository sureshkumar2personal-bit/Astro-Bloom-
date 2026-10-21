import { Link, useNavigate } from 'react-router-dom';
import Shell from '../components/common/Shell';

const roles = [
  {
    icon: '🌙',
    title: 'I\'m a User',
    desc: 'Explore astrology insights, consult astrologers, and track your cosmic journey.',
    to: '/user/register',
    loginTo: '/user/login',
    eyebrow: 'SEEKER',
  },
  {
    icon: '⭐',
    title: 'I\'m an Astrologer',
    desc: 'Share your expertise, build your practice, and guide seekers worldwide.',
    to: '/astrologer/register',
    loginTo: '/astrologer/login',
    eyebrow: 'PRACTITIONER',
  },
];

export default function RoleSelectionPage() {
  const navigate = useNavigate();
  return (
    <Shell>
      <section className="page">
        <div className="page-header-block">
          <p className="eyebrow">JOIN COSMICCONNECT</p>
          <h1>Who are you?</h1>
          <p className="subtitle">Choose your path to get started</p>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <Link to="/register" style={{ marginRight: 16, fontSize: 13, color: 'var(--purple)', fontWeight: 500 }}>Create Account</Link>
          <Link to="/user/login" style={{ fontSize: 13, color: 'var(--purple)', fontWeight: 500 }}>Sign In</Link>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, maxWidth: 960, margin: '0 auto', padding: '0 20px' }}>
          {roles.map(r => (
            <div
              key={r.title}
              role="link"
              tabIndex={0}
              onClick={() => navigate(r.to)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(r.to); } }}
              style={{
                background: '#fff',
                border: '1px solid var(--line)',
                borderRadius: 16,
                padding: '40px 28px',
                textAlign: 'center',
                transition: 'border-color 0.2s, box-shadow 0.2s',
                cursor: 'pointer',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--purple)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(90,40,180,0.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <span style={{ fontSize: 48, marginBottom: 16 }}>{r.icon}</span>
              <p className="eyebrow" style={{ marginBottom: 8, fontSize: 11, letterSpacing: 2, color: 'var(--purple)' }}>{r.eyebrow}</p>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, margin: '0 0 12px', color: 'var(--ink)' }}>{r.title}</h2>
              <p style={{ fontSize: 14, color: '#6e6573', lineHeight: 1.6, margin: 0 }}>{r.desc}</p>
              <Link to={r.loginTo} onClick={e => e.stopPropagation()} style={{ marginTop: 16, fontSize: 13, color: 'var(--purple)', fontWeight: 500 }}>
                Already have an account? <span style={{ textDecoration: 'underline' }}>Sign in →</span>
              </Link>
            </div>
          ))}
        </div>
      </section>
    </Shell>
  );
}
