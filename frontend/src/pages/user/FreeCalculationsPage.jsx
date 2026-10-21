import { Link } from 'react-router-dom';
import Shell from '../../components/common/Shell';

const tools = [
  { to: '/user/free-calculations/numerology', title: 'Numerology', desc: 'Birth Number, Life Path, Name Number with detailed meanings', icon: '🔢' },
  { to: '/user/free-calculations/birth-chart', title: 'Birth Chart', desc: 'Planet positions, Rasi chart, Nakshatra & Pada from your birth details', icon: '🌌' },
  { to: '/user/free-calculations/nakshatra', title: 'Nakshatra Finder', desc: 'Find your birth Nakshatra, Pada, and Rasi from date & time of birth', icon: '⭐' },
  { to: '/user/free-calculations/dasha', title: 'Dasa Bhukti', desc: 'Calculate your Mahadasha & Bhukthi timeline from Moon longitude', icon: '🗓️' },
  { to: '/user/free-calculations/marriage-matching', title: 'Marriage Matching', desc: '10 Porutham compatibility check for boy & girl birth details', icon: '💍' },
  { to: '/user/free-calculations/panchang', title: 'Panchang', desc: 'Daily Tithi, Nakshatra, Yoga, Karana from date & location', icon: '📅' },
  { to: '/user/free-calculations/baby-names', title: 'Baby Names', desc: 'Find baby names by Nakshatra, Pada, and starting letter', icon: '👶' }
];

export default function FreeCalculationsPage() {
  return (<Shell>
    <section className="page">
      <div className="page-header-block">
        <p className="eyebrow">FREE TOOLS</p>
        <h1>Free Calculations</h1>
        <p className="subtitle">Astrology tools powered by real astronomical data — no cost, no signup required.</p>
      </div>
      <div className="fc-grid">
        {tools.map(t => (
          <Link to={t.to} key={t.to} className="fc-card">
            <span className="fc-icon">{t.icon}</span>
            <h3>{t.title}</h3>
            <p>{t.desc}</p>
            <span className="fc-arrow">→</span>
          </Link>
        ))}
      </div>
    </section>
  </Shell>);
}
