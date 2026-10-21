import { useState } from 'react';
import { searchBabyNames } from '../../api/freeCalculationApi';
import Shell from '../../components/common/Shell';

const NAKSHATRAS = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra',
  'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni',
  'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
  'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha',
  'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati'
];

export default function BabyNamePage() {
  const [form, setForm] = useState({ nakshatra: '', pada: '', startingLetter: '' });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try { setResult(await searchBabyNames({ nakshatra: form.nakshatra, pada: form.pada ? Number(form.pada) : undefined, startingLetter: form.startingLetter || undefined })); }
    catch (err) { setError(err.message); setResult(null); }
    finally { setLoading(false); }
  }

  return (<Shell>
    <section className="page">
      <div className="page-header-block">
        <p className="eyebrow">FREE TOOL</p>
        <h1>Baby Names by Nakshatra</h1>
        <p className="subtitle">Find names based on Nakshatra, Pada, or starting letter</p>
      </div>
      <form className="fc-form" onSubmit={handleSubmit}>
        <label>Nakshatra*
          <select value={form.nakshatra} onChange={e => setForm({ ...form, nakshatra: e.target.value })} required>
            <option value="">Select Nakshatra</option>
            {NAKSHATRAS.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <div className="fc-row">
          <label>Pada (1-4)<input type="number" min="1" max="4" value={form.pada} onChange={e => setForm({ ...form, pada: e.target.value })} placeholder="Optional" /></label>
          <label>Starting Letter<input value={form.startingLetter} onChange={e => setForm({ ...form, startingLetter: e.target.value })} placeholder="e.g. A" maxLength={1} /></label>
        </div>
        {error && <p className="fc-error">{error}</p>}
        <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Searching...' : 'Search Names'}</button>
      </form>
      {result && (
        <div className="fc-result">
          <div className="fc-tiles">
            <div className="fc-tile"><span className="fc-tile-label">Nakshatra</span><span className="fc-tile-num">{result.nakshatra}</span></div>
            <div className="fc-tile"><span className="fc-tile-label">Names Found</span><span className="fc-tile-num">{result.count}</span></div>
          </div>
          <div className="fc-names-grid">
            {result.names.map(name => (
              <div key={name} className="fc-name-card">{name}</div>
            ))}
          </div>
        </div>
      )}
    </section>
  </Shell>);
}
