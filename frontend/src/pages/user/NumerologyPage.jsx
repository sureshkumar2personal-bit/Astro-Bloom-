import { useState } from 'react';
import { numerologyReport } from '../../api/freeCalculationApi';
import Shell from '../../components/common/Shell';

export default function NumerologyPage() {
  const [form, setForm] = useState({ fullName: '', dateOfBirth: '' });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try { setResult(await numerologyReport(form)); }
    catch (err) { setError(err.message); setResult(null); }
    finally { setLoading(false); }
  }

  return (<Shell>
    <section className="page">
      <div className="page-header-block">
        <p className="eyebrow">FREE TOOL</p>
        <h1>Numerology Report</h1>
      </div>
      <form className="fc-form" onSubmit={handleSubmit}>
        <label>Full Name<input value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} required /></label>
        <label>Date of Birth<input type="date" value={form.dateOfBirth} onChange={e => setForm({ ...form, dateOfBirth: e.target.value })} required /></label>
        {error && <p className="fc-error">{error}</p>}
        <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Calculating...' : 'Generate Report'}</button>
      </form>
      {result && (
        <div className="fc-result">
          <div className="fc-tiles">
            <div className="fc-tile"><span className="fc-tile-label">Birth Number</span><span className="fc-tile-num">{result.birthNumber}</span></div>
            <div className="fc-tile"><span className="fc-tile-label">Life Path Number</span><span className="fc-tile-num">{result.lifePathNumber}</span></div>
            <div className="fc-tile"><span className="fc-tile-label">Name Number</span><span className="fc-tile-num">{result.nameNumber}</span></div>
          </div>
          {[
            { title: 'Birth Number', num: result.birthNumber, meaning: result.birthNumberMeaning },
            { title: 'Life Path', num: result.lifePathNumber, meaning: result.lifePathMeaning },
            { title: 'Name Number', num: result.nameNumber, meaning: result.nameNumberMeaning }
          ].map(r => r.meaning && (
            <div key={r.title} className="fc-card-static">
              <h3>{r.title} Report — {r.num} ({r.meaning.title})</h3>
              <div className="fc-detail-grid">
                <div><dt>Planet</dt><dd>{r.meaning.planet}</dd></div>
                <div><dt>Meaning</dt><dd>{r.meaning.shortMeaning}</dd></div>
                <div><dt>Positive</dt><dd>{r.meaning.positiveTraits}</dd></div>
                <div><dt>Negative</dt><dd>{r.meaning.negativeTraits}</dd></div>
                <div><dt>Career</dt><dd>{r.meaning.careerHint}</dd></div>
                <div><dt>Relationship</dt><dd>{r.meaning.relationshipHint}</dd></div>
                <div><dt>Lucky Colors</dt><dd>{r.meaning.luckyColors}</dd></div>
                <div><dt>Lucky Days</dt><dd>{r.meaning.luckyDays}</dd></div>
                <div><dt>Lucky Numbers</dt><dd>{r.meaning.luckyNumbers}</dd></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  </Shell>);
}
