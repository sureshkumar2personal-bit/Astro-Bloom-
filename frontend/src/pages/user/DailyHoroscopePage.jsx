import { useEffect, useState } from 'react';
import Shell from '../../components/common/Shell';
import { apiAuthGet } from '../../api/client';

const SIGNS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
const SYMBOLS = { Aries:'♈', Taurus:'♉', Gemini:'♊', Cancer:'♋', Leo:'♌', Virgo:'♍', Libra:'♎', Scorpio:'♏', Sagittarius:'♐', Capricorn:'♑', Aquarius:'♒', Pisces:'♓' };

export default function DailyHoroscopePage() {
  const [selected, setSelected] = useState('');
  const [horoscope, setHoroscope] = useState(null);
  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    apiAuthGet('/horoscope/daily/all')
      .then(r => { setAll(r.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selected) { setHoroscope(null); return; }
    setLoading(true);
    apiAuthGet(`/horoscope/daily?sign=${selected}`)
      .then(r => { setHoroscope(r.data); setLoading(false); })
      .catch(() => { setHoroscope(null); setLoading(false); });
  }, [selected]);

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const ratingBar = (label, value, max = 5) => (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 3 }}>
        <span>{label}</span><span style={{ color: 'var(--purple)', fontWeight: 600 }}>{value}/{max}</span>
      </div>
      <div style={{ height: 6, background: 'var(--line)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${(value/max)*100}%`, background: 'linear-gradient(90deg, var(--purple), var(--gold))', borderRadius: 3, transition: 'width 0.5s' }} />
      </div>
    </div>
  );

  return (
    <Shell>
      <section className="page" style={{ maxWidth: 900, margin: '0 auto', padding: '40px 20px' }}>
        <div className="page-header-block" style={{ textAlign: 'center', marginBottom: 32 }}>
          <p className="eyebrow">DAILY COSMIC GUIDANCE</p>
          <h1 style={{ fontFamily: "'Playfair Display', serif" }}>Your Horoscope</h1>
          <p style={{ color: '#6e6573', marginTop: 4 }}>{today}</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 10, marginBottom: 32 }}>
          {SIGNS.map(s => (
            <button key={s} onClick={() => setSelected(s)} style={{
              padding: '12px 8px', border: selected === s ? '2px solid var(--purple)' : '1px solid var(--line)',
              borderRadius: 12, background: selected === s ? '#f0e8f8' : '#fff', cursor: 'pointer',
              textAlign: 'center', transition: 'all 0.2s'
            }}>
              <span style={{ fontSize: 28 }}>{SYMBOLS[s]}</span>
              <p style={{ fontSize: 12, marginTop: 4, fontWeight: selected === s ? 600 : 400 }}>{s}</p>
            </button>
          ))}
        </div>

        {loading && <p style={{ textAlign: 'center', color: '#6e6573' }}>Loading...</p>}

        {horoscope && !loading && (
          <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 16, padding: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <span style={{ fontSize: 40 }}>{SYMBOLS[horoscope.zodiac_sign]}</span>
              <div>
                <h2 style={{ fontFamily: "'Playfair Display', serif", margin: 0 }}>{horoscope.zodiac_sign}</h2>
                <p style={{ fontSize: 13, color: '#6e6573', margin: 0 }}>Today's Reading</p>
              </div>
            </div>
            <p style={{ lineHeight: 1.7, color: 'var(--ink)', marginBottom: 24 }}>{horoscope.prediction}</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div>
                {ratingBar('Love', horoscope.love_rating)}
                {ratingBar('Career', horoscope.career_rating)}
              </div>
              <div>
                {ratingBar('Health', horoscope.health_rating)}
                {ratingBar('Luck', horoscope.luck_rating)}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 24, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
              {horoscope.lucky_color && <span style={{ fontSize: 13 }}>🎨 Lucky Color: <b>{horoscope.lucky_color}</b></span>}
              {horoscope.lucky_number && <span style={{ fontSize: 13 }}>🔢 Lucky Number: <b>{horoscope.lucky_number}</b></span>}
            </div>
          </div>
        )}

        {!selected && !loading && (
          <p style={{ textAlign: 'center', color: '#6e6573', padding: 40 }}>Select your zodiac sign above to view today's horoscope</p>
        )}
      </section>
    </Shell>
  );
}
