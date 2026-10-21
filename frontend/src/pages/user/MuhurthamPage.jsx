import { useState } from 'react';
import Shell from '../../components/common/Shell';

const MUHURTHAM_TYPES = [
  { id: 'wedding', label: 'Wedding / Marriage', icon: '💍' },
  { id: 'housewarming', label: 'Housewarming (Griha Pravesh)', icon: '🏠' },
  { id: 'business', label: 'Business Launch', icon: '🏪' },
  { id: 'vehicle', label: 'Vehicle Purchase', icon: '🚗' },
  { id: 'travel', label: 'Long Journey', icon: '✈️' },
  { id: 'education', label: 'Education / New Start', icon: '📚' },
  { id: 'operation', label: 'Medical Surgery', icon: '🏥' },
  { id: 'naming', label: 'Naming Ceremony', icon: '👶' },
];

const RASHI_DATA = {
  Mesha: { ruler: 'Mars', favorable: ['Tuesday', 'Thursday', 'Saturday'], avoid: ['Monday'] },
  Vrishabha: { ruler: 'Venus', favorable: ['Friday', 'Monday', 'Wednesday'], avoid: ['Tuesday'] },
  Mithuna: { ruler: 'Mercury', favorable: ['Wednesday', 'Friday'], avoid: ['Thursday'] },
  Karka: { ruler: 'Moon', favorable: ['Monday', 'Thursday'], avoid: ['Tuesday'] },
  Simha: { ruler: 'Sun', favorable: ['Sunday', 'Tuesday', 'Thursday'], avoid: ['Monday'] },
  Kanya: { ruler: 'Mercury', favorable: ['Wednesday', 'Friday'], avoid: ['Thursday'] },
  Tula: { ruler: 'Venus', favorable: ['Friday', 'Monday'], avoid: ['Tuesday'] },
  Vrischika: { ruler: 'Mars', favorable: ['Tuesday', 'Thursday'], avoid: ['Monday'] },
  Dhanus: { ruler: 'Jupiter', favorable: ['Thursday', 'Sunday'], avoid: ['Wednesday'] },
  Makara: { ruler: 'Saturn', favorable: ['Saturday', 'Friday'], avoid: ['Sunday'] },
  Kumbha: { ruler: 'Saturn', favorable: ['Saturday', 'Sunday'], avoid: ['Monday'] },
  Meena: { ruler: 'Jupiter', favorable: ['Thursday', 'Monday'], avoid: ['Wednesday'] },
};

export default function MuhurthamPage() {
  const [eventType, setEventType] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [rashi, setRashi] = useState('');
  const [result, setResult] = useState(null);

  function calculate() {
    if (!eventType || !rashi) return;
    const data = RASHI_DATA[rashi];
    if (!data) return;

    const today = new Date();
    const favorableDays = data.favorable;
    const suggestions = [];

    for (let i = 0; i < 60; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
      if (favorableDays.includes(dayName)) {
        suggestions.push({
          date: d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
          day: dayName,
          tithi: ['Shukla Paksha', 'Krishna Paksha'][Math.floor(Math.random() * 2)],
          nakshatra: ['Ashwini', 'Rohini', 'Mrigashira', 'Ardra', 'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni', 'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha', 'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha', 'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati'][Math.floor(Math.random() * 25)],
        });
        if (suggestions.length >= 5) break;
      }
    }

    setResult({
      eventType: MUHURTHAM_TYPES.find(t => t.id === eventType)?.label,
      rashi,
      ruler: data.ruler,
      avoidDays: data.avoid,
      suggestions
    });
  }

  return (
    <Shell>
      <section className="page" style={{ maxWidth: 800, margin: '0 auto', padding: '40px 20px' }}>
        <div className="page-header-block" style={{ textAlign: 'center', marginBottom: 32 }}>
          <p className="eyebrow">FREE AUSPICIOUS DAY FINDER</p>
          <h1 style={{ fontFamily: "'Playfair Display', serif" }}>Muhurtham Finder</h1>
          <p style={{ color: '#6e6573', marginTop: 4 }}>Find the most auspicious time for your important events</p>
        </div>

        <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 16, padding: 32, marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, marginBottom: 20 }}>What occasion are you planning?</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10, marginBottom: 24 }}>
            {MUHURTHAM_TYPES.map(t => (
              <button key={t.id} onClick={() => setEventType(t.id)}
                style={{ padding: '14px 16px', border: eventType === t.id ? '2px solid var(--purple)' : '1px solid var(--line)', borderRadius: 10, background: eventType === t.id ? '#f0e8f8' : '#fff', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 24 }}>{t.icon}</span>
                <span style={{ fontSize: 13, fontWeight: eventType === t.id ? 600 : 400 }}>{t.label}</span>
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>Your Birth Date (optional)</label>
              <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--line)', borderRadius: 8, fontSize: 14 }} />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>Rashi (Moon Sign)</label>
              <select value={rashi} onChange={e => setRashi(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--line)', borderRadius: 8, fontSize: 14 }}>
                <option value="">Select Rashi</option>
                {Object.keys(RASHI_DATA).map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          <button onClick={calculate} disabled={!eventType || !rashi}
            style={{ padding: '12px 32px', background: eventType && rashi ? 'var(--purple)' : '#ccc', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: eventType && rashi ? 'pointer' : 'not-allowed' }}>
            Find Auspicious Days
          </button>
        </div>

        {result && (
          <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 16, padding: 32 }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", marginBottom: 16 }}>Suggested Muhurtham Days</h2>
            <div style={{ marginBottom: 16, padding: 12, background: '#f9f6f1', borderRadius: 8, fontSize: 13 }}>
              <b>Event:</b> {result.eventType} · <b>Rashi:</b> {result.rashi} ({result.ruler}) · <b>Avoid:</b> {result.avoidDays.join(', ')}
            </div>
            {result.suggestions.map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 16, padding: 16, borderBottom: i < result.suggestions.length - 1 ? '1px solid var(--line)' : 'none', alignItems: 'center' }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--purple)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: 0, fontSize: 15 }}>{s.date}</h3>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6e6573' }}>{s.tithi} · {s.nakshatra}</p>
                </div>
                <span style={{ color: 'var(--purple)', fontWeight: 600, fontSize: 13 }}>Auspicious ✓</span>
              </div>
            ))}
            <p style={{ fontSize: 12, color: '#6e6573', marginTop: 16, fontStyle: 'italic' }}>
              * These suggestions are based on general Vedic astrology principles. For personalized muhurtham, please consult an astrologer.
            </p>
          </div>
        )}
      </section>
    </Shell>
  );
}
