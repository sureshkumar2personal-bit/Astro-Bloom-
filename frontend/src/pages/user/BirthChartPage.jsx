import { useState } from 'react';
import { calculateBirthChart } from '../../api/freeCalculationApi';
import Shell from '../../components/common/Shell';

export default function BirthChartPage() {
  const [form, setForm] = useState({ name: '', dateOfBirth: '', timeOfBirth: '', placeOfBirth: '', latitude: '', longitude: '', timezone: 'Asia/Kolkata' });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const payload = { ...form, latitude: form.latitude ? Number(form.latitude) : undefined, longitude: form.longitude ? Number(form.longitude) : undefined };
      setResult(await calculateBirthChart(payload));
    } catch (err) { setError(err.message); setResult(null); }
    finally { setLoading(false); }
  }

  return (<Shell>
    <section className="page">
      <div className="page-header-block">
        <p className="eyebrow">FREE TOOL</p>
        <h1>Birth Chart Calculator</h1>
        <p className="subtitle">Planet longitudes, Rasi, Nakshatra & Pada from your birth details</p>
      </div>
      <form className="fc-form" onSubmit={handleSubmit}>
        <label>Name<input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
        <div className="fc-row">
          <label>Date of Birth*<input type="date" value={form.dateOfBirth} onChange={e => setForm({ ...form, dateOfBirth: e.target.value })} required /></label>
          <label>Time of Birth*<input type="time" value={form.timeOfBirth} onChange={e => setForm({ ...form, timeOfBirth: e.target.value })} required /></label>
        </div>
        <label>Place of Birth<input value={form.placeOfBirth} onChange={e => setForm({ ...form, placeOfBirth: e.target.value })} placeholder="e.g. Chennai, India" /></label>
        <div className="fc-row">
          <label>Latitude<input inputMode="decimal" value={form.latitude} onChange={e => setForm({ ...form, latitude: e.target.value })} placeholder="13.0827" /></label>
          <label>Longitude<input inputMode="decimal" value={form.longitude} onChange={e => setForm({ ...form, longitude: e.target.value })} placeholder="80.2707" /></label>
        </div>
        {error && <p className="fc-error">{error}</p>}
        <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Calculating...' : 'Calculate'}</button>
      </form>
      {result && (
        <div className="fc-result">
          <div className="fc-moon-strip">
            <div className="fc-tile"><span className="fc-tile-label">Moon Rasi</span><span className="fc-tile-num">{result.moonProfile.rasi.name}</span></div>
            <div className="fc-tile"><span className="fc-tile-label">Nakshatra</span><span className="fc-tile-num">{result.moonProfile.nakshatra.name}</span></div>
            <div className="fc-tile"><span className="fc-tile-label">Pada</span><span className="fc-tile-num">{result.moonProfile.nakshatra.pada}</span></div>
          </div>
          <h3>Planet Positions</h3>
          <div className="fc-table-wrap">
            <table className="fc-table">
              <thead><tr><th>Planet</th><th>Rasi</th><th>Degree</th><th>Nakshatra</th><th>Pada</th></tr></thead>
              <tbody>
                {result.planets.map(p => (
                  <tr key={p.code}><td>{p.name}</td><td>{p.rasi.name}</td><td>{p.degreeInRasi}°</td><td>{p.nakshatra.name}</td><td>{p.nakshatra.pada}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <h3>Rasi Chart</h3>
          <div className="fc-rasi-grid">
            {Object.entries(result.chart).map(([rasi, planets]) => (
              <div key={rasi} className="fc-rasi-cell"><strong>{rasi}</strong><span>{planets.length ? planets.join(', ') : '-'}</span></div>
            ))}
          </div>
        </div>
      )}
    </section>
  </Shell>);
}
