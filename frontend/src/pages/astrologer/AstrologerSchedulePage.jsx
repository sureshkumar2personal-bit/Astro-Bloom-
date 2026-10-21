import { useEffect, useState } from 'react';
import Shell from '../../components/common/Shell';
import { apiAuthGet, apiAuthPut } from '../../api/client';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function AstrologerSchedulePage() {
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    apiAuthGet('/astrologer/schedule')
      .then(r => {
        const existing = r.data || [];
        const full = DAYS.map((day, i) => {
          const found = existing.find(s => s.day_of_week === i);
          return { dayOfWeek: i, day, startTime: found?.start_time || '09:00', endTime: found?.end_time || '17:00', isAvailable: found?.is_available ?? (i === 0 || i === 6 ? false : true) };
        });
        setSchedule(full);
      })
      .catch(() => {
        setSchedule(DAYS.map((day, i) => ({ dayOfWeek: i, day, startTime: '09:00', endTime: '17:00', isAvailable: i > 0 && i < 6 })));
      })
      .finally(() => setLoading(false));
  }, []);

  const update = (i, field, value) => {
    setSchedule(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s));
  };

  const save = async () => {
    setSaving(true);
    setMessage('');
    try {
      await apiAuthPut('/astrologer/schedule', { schedule });
      setMessage('Schedule saved!');
      setTimeout(() => setMessage(''), 3000);
    } catch (e) {
      setMessage(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Shell><section className="page" style={{ padding: 40 }}><p>Loading...</p></section></Shell>;

  return (
    <Shell>
      <section className="page" style={{ maxWidth: 800, margin: '0 auto', padding: '40px 20px' }}>
        <div className="page-header-block">
          <p className="eyebrow">AVAILABILITY</p>
          <h1 style={{ fontFamily: "'Playfair Display', serif" }}>Manage Your Schedule</h1>
          <p style={{ color: '#6e6573', marginTop: 4 }}>Set and publish your weekly availability for consultations. Users can book 30-minute slots inside these hours.</p>
        </div>

        {message && <div style={{ padding: '10px 16px', borderRadius: 8, background: message.includes('saved') ? '#e8f5e9' : '#fce4ec', fontSize: 13, marginBottom: 16 }}>{message}</div>}

        <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: 16, overflow: 'hidden' }}>
          {schedule.map((s, i) => (
            <div key={s.dayOfWeek} style={{ display: 'grid', gridTemplateColumns: '140px 1fr 1fr 80px', alignItems: 'center', padding: '14px 20px', borderBottom: i < 6 ? '1px solid var(--line)' : 'none', background: s.isAvailable ? '#fff' : '#fafafa' }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{s.day}</div>
              <div>
                <label style={{ fontSize: 11, color: '#6e6573' }}>Start</label>
                <input type="time" value={s.startTime} onChange={e => update(i, 'startTime', e.target.value)}
                  disabled={!s.isAvailable}
                  style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--line)', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#6e6573' }}>End</label>
                <input type="time" value={s.endTime} onChange={e => update(i, 'endTime', e.target.value)}
                  disabled={!s.isAvailable}
                  style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--line)', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24, cursor: 'pointer' }}>
                  <input type="checkbox" checked={s.isAvailable} onChange={e => update(i, 'isAvailable', e.target.checked)} style={{ display: 'none' }} />
                  <span style={{ position: 'absolute', inset: 0, background: s.isAvailable ? 'var(--purple)' : '#ccc', borderRadius: 12, transition: '0.3s' }} />
                  <span style={{ position: 'absolute', top: 2, left: s.isAvailable ? 22 : 2, width: 20, height: 20, background: '#fff', borderRadius: '50%', transition: '0.3s' }} />
                </label>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
          <button onClick={save} disabled={saving}
            style={{ padding: '12px 32px', background: 'var(--purple)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            {saving ? 'Saving...' : 'Save Schedule'}
          </button>
        </div>
      </section>
    </Shell>
  );
}
