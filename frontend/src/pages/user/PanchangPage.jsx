import { useState } from 'react';
import { calculatePanchangam } from '../../api/freeCalculationApi';
import Shell from '../../components/common/Shell';

export default function PanchangPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ date: today, latitude: '13.0827', longitude: '80.2707', timezone: 'Asia/Kolkata' });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try { setResult(await calculatePanchangam({ ...form, latitude: Number(form.latitude), longitude: Number(form.longitude) })); }
    catch (err) { setError(err.message); setResult(null); }
    finally { setLoading(false); }
  }

  return (<Shell>
    <section className="page">
      <div className="page-header-block">
        <p className="eyebrow">FREE TOOL</p>
        <h1>Daily Panchang</h1>
        <p className="subtitle">Tithi, Nakshatra, Yoga, Karana for any date and location</p>
      </div>
      <form className="fc-form" onSubmit={handleSubmit}>
        <label>Date*<input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required /></label>
        <div className="fc-row">
          <label>Latitude<input inputMode="decimal" value={form.latitude} onChange={e => setForm({ ...form, latitude: e.target.value })} required /></label>
          <label>Longitude<input inputMode="decimal" value={form.longitude} onChange={e => setForm({ ...form, longitude: e.target.value })} required /></label>
        </div>
        {error && <p className="fc-error">{error}</p>}
        <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Calculating...' : 'Calculate'}</button>
      </form>
      {result && (
        <div className="fc-result">
          <div className="fc-tiles fc-tiles-wide">
            <div className="fc-tile fc-tile-highlight"><span className="fc-tile-label">Date</span><span className="fc-tile-num">{result.date}</span><small>{result.weekday}</small></div>
          </div>
          <div className="fc-tiles">
            <div className="fc-tile"><span className="fc-tile-label">Tithi</span><span className="fc-tile-num">{result.tithi.name}</span><small>#{result.tithi.number}</small></div>
            <div className="fc-tile"><span className="fc-tile-label">Nakshatra</span><span className="fc-tile-num">{result.nakshatra.name}</span></div>
            <div className="fc-tile"><span className="fc-tile-label">Yoga</span><span className="fc-tile-num">{result.yoga.name}</span></div>
            <div className="fc-tile"><span className="fc-tile-label">Karana</span><span className="fc-tile-num">{result.karana.name}</span></div>
            <div className="fc-tile"><span className="fc-tile-label">Moon Sign</span><span className="fc-tile-num">{result.moonSign}</span></div>
            <div className="fc-tile"><span className="fc-tile-label">Sun Sign</span><span className="fc-tile-num">{result.sunSign}</span></div>
          </div>
          <div className="fc-longitudes">
            <span>Sun: {result.longitudes.sun}°</span>
            <span>Moon: {result.longitudes.moon}°</span>
          </div>
        </div>
      )}
    </section>
  </Shell>);
}
