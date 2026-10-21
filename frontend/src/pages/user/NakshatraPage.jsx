import { useState } from 'react';
import { calculateNakshatra } from '../../api/freeCalculationApi';
import Shell from '../../components/common/Shell';

export default function NakshatraPage() {
  const [form, setForm] = useState({ dateOfBirth: '', timeOfBirth: '' });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try { setResult(await calculateNakshatra(form)); }
    catch (err) { setError(err.message); setResult(null); }
    finally { setLoading(false); }
  }

  return (<Shell>
    <section className="page">
      <div className="page-header-block">
        <p className="eyebrow">FREE TOOL</p>
        <h1>Nakshatra Finder</h1>
        <p className="subtitle">Find your birth Nakshatra, Pada, and Rasi</p>
      </div>
      <form className="fc-form" onSubmit={handleSubmit}>
        <div className="fc-row">
          <label>Date of Birth*<input type="date" value={form.dateOfBirth} onChange={e => setForm({ ...form, dateOfBirth: e.target.value })} required /></label>
          <label>Time of Birth*<input type="time" value={form.timeOfBirth} onChange={e => setForm({ ...form, timeOfBirth: e.target.value })} required /></label>
        </div>
        {error && <p className="fc-error">{error}</p>}
        <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Calculating...' : 'Find Nakshatra'}</button>
      </form>
      {result && (
        <div className="fc-result">
          <div className="fc-tiles">
            <div className="fc-tile"><span className="fc-tile-label">Nakshatra</span><span className="fc-tile-num">{result.nakshatra.name} ({result.nakshatra.number}/27)</span></div>
            <div className="fc-tile"><span className="fc-tile-label">Pada</span><span className="fc-tile-num">{result.nakshatra.pada}</span></div>
            <div className="fc-tile"><span className="fc-tile-label">Nakshatra Lord</span><span className="fc-tile-num">{result.nakshatra.lord}</span></div>
            <div className="fc-tile"><span className="fc-tile-label">Rasi (Moon Sign)</span><span className="fc-tile-num">{result.rasi.name} ({result.rasi.sanskrit})</span></div>
            <div className="fc-tile"><span className="fc-tile-label">Moon Longitude</span><span className="fc-tile-num">{result.moonLongitude}°</span></div>
          </div>
        </div>
      )}
    </section>
  </Shell>);
}
