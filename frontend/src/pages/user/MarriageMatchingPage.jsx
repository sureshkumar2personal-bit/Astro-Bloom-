import { useState } from 'react';
import { calculateMarriageMatching } from '../../api/freeCalculationApi';
import Shell from '../../components/common/Shell';

const initPerson = { name: '', dateOfBirth: '', timeOfBirth: '' };

export default function MarriageMatchingPage() {
  const [boy, setBoy] = useState({ ...initPerson });
  const [girl, setGirl] = useState({ ...initPerson });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try { setResult(await calculateMarriageMatching({ boy, girl })); }
    catch (err) { setError(err.message); setResult(null); }
    finally { setLoading(false); }
  }

  function PersonForm({ title, value, onChange }) {
    return (
      <div className="fc-person-form">
        <h3>{title}</h3>
        <label>Name<input value={value.name} onChange={e => onChange({ ...value, name: e.target.value })} required /></label>
        <div className="fc-row">
          <label>Date of Birth*<input type="date" value={value.dateOfBirth} onChange={e => onChange({ ...value, dateOfBirth: e.target.value })} required /></label>
          <label>Time of Birth*<input type="time" value={value.timeOfBirth} onChange={e => onChange({ ...value, timeOfBirth: e.target.value })} required /></label>
        </div>
      </div>
    );
  }

  return (<Shell>
    <section className="page">
      <div className="page-header-block">
        <p className="eyebrow">FREE TOOL</p>
        <h1>Marriage Matching</h1>
        <p className="subtitle">10 Porutham compatibility check</p>
      </div>
      <form className="fc-form" onSubmit={handleSubmit}>
        <PersonForm title="Boy Details" value={boy} onChange={setBoy} />
        <PersonForm title="Girl Details" value={girl} onChange={setGirl} />
        {error && <p className="fc-error">{error}</p>}
        <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Calculating...' : 'Calculate Matching'}</button>
      </form>
      {result && (
        <div className="fc-result">
          <div className="fc-tiles">
            <div className="fc-tile"><span className="fc-tile-label">Boy</span><span className="fc-tile-num">{result.boy.name}</span><small>{result.boy.nakshatra} ({result.boy.rasi}) Pada {result.boy.pada}</small></div>
            <div className="fc-tile"><span className="fc-tile-label">Girl</span><span className="fc-tile-num">{result.girl.name}</span><small>{result.girl.nakshatra} ({result.girl.rasi}) Pada {result.girl.pada}</small></div>
            <div className="fc-tile"><span className="fc-tile-label">Score</span><span className={`fc-tile-num ${result.compatible ? 'fc-pass' : 'fc-fail'}`}>{result.totalScore}/{result.maxScore}</span><small>{result.compatible ? 'Compatible ✓' : 'Not Compatible ✗'}</small></div>
          </div>
          <h3>Porutham Details</h3>
          <div className="fc-table-wrap">
            <table className="fc-table">
              <thead><tr><th>Porutham</th><th>Status</th></tr></thead>
              <tbody>
                {result.poruthams.map((p, i) => (
                  <tr key={i}><td>{p.name}</td><td className={p.score ? 'fc-pass' : 'fc-fail'}>{p.score ? '✓ Yes' : '✗ No'}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  </Shell>);
}
