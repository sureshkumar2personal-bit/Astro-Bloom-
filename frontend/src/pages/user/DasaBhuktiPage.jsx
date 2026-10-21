import { useState } from 'react';
import { calculateDasha } from '../../api/freeCalculationApi';
import Shell from '../../components/common/Shell';

export default function DasaBhuktiPage() {
  const [form, setForm] = useState({ birthDateTime: '', moonLongitude: '' });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      setResult(await calculateDasha({ birthDateTime: new Date(form.birthDateTime).toISOString(), moonLongitude: Number(form.moonLongitude), yearsToGenerate: 120 }));
    } catch (err) { setError(err.message); setResult(null); }
    finally { setLoading(false); }
  }

  function fmtDate(v) { return v ? new Date(v).toLocaleDateString() : '-'; }

  return (<Shell>
    <section className="page">
      <div className="page-header-block">
        <p className="eyebrow">FREE TOOL</p>
        <h1>Dasa Bhukti Calculator</h1>
        <p className="subtitle">Calculate Mahadasha & Bhukthi timeline from your Moon longitude</p>
      </div>
      <form className="fc-form" onSubmit={handleSubmit}>
        <label>Birth Date & Time*<input type="datetime-local" value={form.birthDateTime} onChange={e => setForm({ ...form, birthDateTime: e.target.value })} required /></label>
        <label>Moon Longitude (0-360)*<input type="number" step="0.0001" min="0" max="360" value={form.moonLongitude} onChange={e => setForm({ ...form, moonLongitude: e.target.value })} required placeholder="e.g. 294.625" /></label>
        {error && <p className="fc-error">{error}</p>}
        <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Calculating...' : 'Calculate'}</button>
      </form>
      {result && (
        <div className="fc-result">
          <div className="fc-tiles">
            <div className="fc-tile"><span className="fc-tile-label">Birth Nakshatra</span><span className="fc-tile-num">{result.birthNakshatra.name}</span><small>Lord: {result.birthNakshatra.lordName}</small></div>
            <div className="fc-tile"><span className="fc-tile-label">Birth Dasa Balance</span><span className="fc-tile-num">{result.birthMahadasha.balanceYearsAtBirth} yrs</span></div>
            {result.current && (
              <div className="fc-tile"><span className="fc-tile-label">Current Running</span><span className="fc-tile-num">{result.current.mahadashaLordName} / {result.current.bhukthiLordName}</span><small>{fmtDate(result.current.bhukthiStartDate)} – {fmtDate(result.current.bhukthiEndDate)}</small></div>
            )}
          </div>
          <h3>Mahadasha Timeline</h3>
          <div className="fc-dasha-list">
            {result.timeline.map((md, i) => (
              <div key={i} className="fc-dasha-card">
                <button className="fc-dasha-header" type="button" onClick={() => setExpanded(expanded === i ? null : i)}>
                  <span><strong>{md.lordName}</strong> {md.isBirthMahadasha && <em className="fc-badge">Birth Dasa</em>}</span>
                  <span>{fmtDate(md.startDate)} – {fmtDate(md.endDate)}</span>
                </button>
                {expanded === i && (
                  <div className="fc-bhukthi-list">
                    {md.bhukthis.map((bh, j) => (
                      <div key={j} className="fc-bhukthi-row"><span>{bh.lordName} ({bh.durationYears} yrs)</span><span>{fmtDate(bh.startDate)} – {fmtDate(bh.endDate)}</span></div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  </Shell>);
}
