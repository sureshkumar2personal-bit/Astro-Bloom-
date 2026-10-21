import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Brand from './Brand';
import AstrologerHeader from '../astrologer/AstrologerHeader';
import { clearSession, apiAuthPost } from '../../api/client';

function navClass(path, to) {
  return path === to || path.startsWith(to + '/') ? 'active' : undefined;
}

function isLoggedIn() {
  return !!(localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken'));
}

function getUserType() {
  const p = window.location.pathname;
  if (p.startsWith('/astrologer')) return 'astrologer';
  return 'user';
}

function getLoginPath() {
  const t = getUserType();
  if (t === 'astrologer') return '/astrologer/login';
  return '/user/login';
}

function getRegisterPath() {
  const t = getUserType();
  if (t === 'astrologer') return '/astrologer/register';
  return '/user/register';
}

export default function Shell({ children }) {
  const { pathname } = useLocation();
  const nav = useNavigate();
  const [logged] = useState(isLoggedIn);
  const isAstrologer = pathname.startsWith('/astrologer');
  const isAuthPage = pathname.includes('/login') || pathname.includes('/register') || pathname.includes('/forgot-password') || pathname.includes('/onboarding');


  function handleLogout() {
    const p = window.location.pathname;
    const logoutPath = p.startsWith('/astrologer') ? '/auth/astrologer/logout' : '/auth/logout';
    apiAuthPost(logoutPath).catch(() => {}).finally(() => {
      clearSession();
      nav(getLoginPath());
    });
  }

  // Not logged in - show limited nav
  if (!logged && !isAuthPage) {
    return (
      <main className="shell">
        <header>
          <div className="page-container">
            <Brand />
            <nav>
              <Link to="/user/contents/free-information" className={navClass(pathname, '/user/contents/free-information')}>Free Info</Link>
              <Link to="/user/free-calculations" className={navClass(pathname, '/user/free-calculations')}>Free Tools</Link>
              <Link to="/user/login" className="nav-cta" style={{ marginLeft: 'auto', background: 'var(--purple)', color: '#fff', fontWeight: 600 }}>Login</Link>
              <Link to="/register" className="nav-cta">Register</Link>
            </nav>
          </div>
        </header>
        <div className="shell-content">
          {children}
        </div>
        <footer>
          <div className="page-container">
            &copy; 2026 CosmicConnect <span>&bull;</span> Guidance written in the stars
          </div>
        </footer>
      </main>
    );
  }

  // Astrologer — delegate header to dedicated shared component
  if (isAstrologer && logged) {
    return (
      <main className="shell">
        <AstrologerHeader />
        <div className="shell-content">
          {children}
        </div>
        <footer>
          <div className="page-container">
            &copy; 2026 CosmicConnect <span>&bull;</span> Guidance written in the stars
          </div>
        </footer>
      </main>
    );
  }

  return (
    <main className="shell">
      <header>
        <div className="page-container">
          <Brand />
          <nav>
          <>
              <Link to="/user/dashboard" className={navClass(pathname, '/user/dashboard')}>Dashboard</Link>
              <Link to="/user/horoscope" className={navClass(pathname, '/user/horoscope')}>Horoscope</Link>
              <Link to="/user/astrologers" className={navClass(pathname, '/user/astrologers')}>Explore</Link>
              <Link to="/user/profile" className={navClass(pathname, '/user/profile')}>Profile</Link>
              <Link to="/user/live" className={navClass(pathname, '/user/live')}>Live</Link>
              <Link to="/user/questions" className={navClass(pathname, '/user/questions')}>Questions</Link>
              <Link to="/user/appointments" className={navClass(pathname, '/user/appointments')}>Appointments</Link>
              <Link to="/user/wallet" className={navClass(pathname, '/user/wallet')}>Wallet</Link>
              <Link to="/user/subscriptions" className={navClass(pathname, '/user/subscriptions')}>Subscriptions</Link>
              <Link to="/user/emergency-calls" className={navClass(pathname, '/user/emergency-calls')}>Emergency</Link>
              <i className="nav-break" />
              <Link to="/user/notifications-bell" className={navClass(pathname, '/user/notifications-bell')}>Notifications</Link>
              <Link to="/user/consultation-history" className={navClass(pathname, '/user/consultation-history')}>History</Link>
              <Link to="/user/messages" className={navClass(pathname, '/user/messages')}>Messages</Link>
              <Link to="/user/muhurtham" className={navClass(pathname, '/user/muhurtham')}>Muhurtham</Link>
              <Link to="/user/payments" className={navClass(pathname, '/user/payments')}>Payments</Link>
              <Link to="/user/contents/free-information" className={navClass(pathname, '/user/contents/free-information')}>Free Info</Link>
              <Link to="/user/contents/perks" className={navClass(pathname, '/user/contents/perks')}>Perks</Link>
              <Link to="/user/atonements" className={navClass(pathname, '/user/atonements')}>Remedies</Link>
              <Link to="/user/disputes" className={navClass(pathname, '/user/disputes')}>Disputes</Link>
              <Link to="/user/free-calculations" className={navClass(pathname, '/user/free-calculations')}>Free Tools</Link>
              <a onClick={handleLogout} style={{ marginLeft: 'auto', opacity: 0.6, cursor: 'pointer' }}>Logout</a>
          </>
        </nav>
        </div>
      </header>
      <div className="shell-content">
        {children}
      </div>
      <footer>
        <div className="page-container">
          &copy; 2026 CosmicConnect <span>&bull;</span> Guidance written in the stars
        </div>
      </footer>
    </main>
  );
}
