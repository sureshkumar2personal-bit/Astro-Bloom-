import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { apiAuthPost, clearSession } from '../../api/client';

function navClass(path, to) {
  return path === to || path.startsWith(to + '/') ? 'active' : undefined;
}

const PRIMARY_NAV = [
  { label: 'Dashboard', to: '/astrologer/dashboard' },
  { label: 'Profile', to: '/astrologer/profile' },
  { label: 'Schedule', to: '/astrologer/schedule' },
  { label: 'Earnings', to: '/astrologer/earnings' },
  { label: 'Live', to: '/astrologer/live' },
  { label: 'Questions', to: '/astrologer/questions' },
  { label: 'Appointments', to: '/astrologer/appointments' },
  { label: 'Wallet', to: '/astrologer/wallet' },
];

const MORE_NAV = [
  { label: 'Campaigns', to: '/astrologer/text-question-sales' },
  { label: 'Templates', to: '/astrologer/templates' },
  { label: 'Withdraw', to: '/astrologer/wallet/withdraw' },
  { label: 'Audience', to: '/astrologer/audience' },
  { label: 'Client Notes', to: '/astrologer/client-notes' },
  { label: 'Messages', to: '/astrologer/messages' },
  { label: 'Analytics', to: '/astrologer/analytics' },
  { label: 'Reviews', to: '/astrologer/reviews' },
  { label: 'Content', to: '/astrologer/contents' },
  { label: 'Remedies', to: '/astrologer/atonements/dashboard' },
  { label: 'Plans', to: '/astrologer/subscription-plans' },
  { label: 'Profile Score', to: '/astrologer/profile-completion' },
  { label: 'Team', to: '/astrologer/accounts' },
  { label: 'Disputes', to: '/astrologer/disputes' },
  { label: 'Perks', to: '/astrologer/perks/content' },
  { label: 'Emergency', to: '/astrologer/emergency' },
];

export default function AstrologerHeader() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const handleLogout = () => {
    apiAuthPost('/auth/astrologer/logout')
      .catch(() => {})
      .finally(() => {
        clearSession();
        navigate('/astrologer/login');
      });
  };

  return (
    <header className="astro-header border-b border-[#e5dfd8]">
      <div className="page-container flex items-center justify-between gap-4">
        {/* Logo */}
        <div className="astro-header-left flex-shrink-0">
          <Link to="/astrologer/dashboard" className="brand flex items-center gap-1.5 text-[#251c35] no-underline">
            <span className="brand-mark">✦</span>
            <span>Cosmic<span>Connect</span></span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <div className="astro-header-center hidden flex-1 justify-center md:flex">
          <nav className="astro-nav-desktop flex items-center gap-2 flex-wrap">
            {PRIMARY_NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`nav-link ${navClass(pathname, item.to)}`}
              >
                {item.label}
              </Link>
            ))}
            <div className="astro-nav-more-wrap relative inline-flex flex-shrink-0">
              <button
                type="button"
                className="astro-nav-more-toggle rounded-full border border-[#e0dcd7] bg-white px-3.5 py-1.5 font-medium text-sm text-[#555] transition-all hover:bg-[#5c3b8b] hover:text-white hover:border-[#5c3b8b]"
                onClick={() => setMoreOpen((v) => !v)}
              >
                More ▾
              </button>
              {moreOpen && (
                <div className="astro-nav-more-menu absolute top-full right-0 z-50 mt-1 min-w-[200px] rounded-md border border-[#e5dfd8] bg-white py-1 shadow-lg">
                  {MORE_NAV.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={`block px-3 py-2 text-sm font-medium text-[#555] no-underline hover:bg-[#5c3b8b] hover:text-white ${navClass(pathname, item.to)}`}
                      onClick={() => setMoreOpen(false)}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </nav>
        </div>

        {/* Right side: Logout + Mobile menu */}
        <div className="astro-header-right flex-shrink-0 flex items-center gap-2">
          <button
            type="button"
            className="astro-logout-btn hidden rounded-full border border-[#e5dfd8] bg-white px-4 py-1.5 font-medium text-sm text-[#555] transition-all hover:bg-[#b44040] hover:text-white hover:border-[#b44040] md:inline-block"
            onClick={handleLogout}
          >
            Logout
          </button>
          <button
            type="button"
            className="astro-mobile-menu-btn md:hidden rounded-md border border-[#e5dfd8] bg-white px-2.5 py-1.5 text-xl text-[#5c3b8b]"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
          >
            ☰
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div
          className="astro-mobile-overlay fixed inset-0 z-99 bg-black/50"
          onClick={() => setMobileOpen(false)}
        >
          <div
            className="astro-mobile-drawer fixed top-0 right-0 h-full w-72 max-w-80% overflow-y-auto bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="astro-mobile-header flex items-center justify-between border-b border-[#e5dfd8] px-5 py-4">
              <Link to="/astrologer/dashboard" className="brand flex items-center gap-1.5 text-[#251c35] no-underline" onClick={() => setMobileOpen(false)}>
                <span className="brand-mark">✦</span>
                <span>Cosmic<span>Connect</span></span>
              </Link>
              <button
                type="button"
                className="rounded border-none bg-transparent text-xl text-[#251c35] cursor-pointer"
                onClick={() => setMobileOpen(false)}
              >
                ✕
              </button>
            </div>
            <nav className="astro-mobile-nav py-2">
              {[...PRIMARY_NAV, ...MORE_NAV].map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`block px-4 py-2.5 text-sm font-medium text-[#555] no-underline ${navClass(pathname, item.to)}`}
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <button
              type="button"
              className="astro-mobile-logout m-3 block w-[calc(100%-24px)] rounded-md border border-[#fca5a5] bg-[#fef2f2] px-4 py-2.5 text-center text-sm font-medium text-[#b44040] cursor-pointer"
              onClick={() => {
                setMobileOpen(false);
                handleLogout();
              }}
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
