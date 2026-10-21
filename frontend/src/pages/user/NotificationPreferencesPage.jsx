import { useState, useEffect } from 'react';
import Shell from '../../components/common/Shell';
import Notice from '../../components/common/Notice';
import { getUserNotificationPrefs, updateUserNotificationPrefs } from '../../api/notificationApi';

const EVENTS = ['question_submitted','question_answered','question_overdue','appointment_booked','appointment_cancelled','payment_completed','refund_processed','subscription_created','subscription_expiring','live_session_starting','live_session_live','new_follower','new_message','dispute_opened'];

export default function NotificationPreferencesPage() {
  const [prefs, setPrefs] = useState([]);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    getUserNotificationPrefs().then(r => {
      const existing = r.data;
      setPrefs(EVENTS.map(e => {
        const found = existing.find(p => p.eventType === e);
        return { eventType: e, inApp: found?.inApp ?? true, email: found?.email ?? false, push: found?.push ?? true, sms: found?.sms ?? false };
      }));
    }).catch(() => setPrefs(EVENTS.map(e => ({ eventType: e, inApp: true, email: false, push: true, sms: false }))));
  }, []);

  const updatePref = (eventType, channel, value) => {
    setPrefs(prev => prev.map(p => p.eventType === eventType ? { ...p, [channel]: value } : p));
  };

  async function handleSave() {
    try { await updateUserNotificationPrefs(prefs); setMsg('Preferences saved.'); } catch (err) { setMsg(err.message); }
  }

  function formatEvent(e) { return e.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()); }

  return <Shell>
    <section className="notif-prefs-page">
      <div className="page-header"><h1>Notification Preferences</h1></div>
      <Notice message={msg} />
      <div className="prefs-table">
        <div className="prefs-header"><span>Event</span><span>In-App</span><span>Email</span><span>Push</span><span>SMS</span></div>
        {prefs.map(p => (
          <div key={p.eventType} className="prefs-row">
            <span className="prefs-event">{formatEvent(p.eventType)}</span>
            {['inApp','email','push','sms'].map(ch => (
              <label key={ch} className="prefs-toggle">
                <input type="checkbox" checked={p[ch]} onChange={e => updatePref(p.eventType, ch, e.target.checked)} />
              </label>
            ))}
          </div>
        ))}
      </div>
      <button className="primary" onClick={handleSave} style={{ marginTop: 20 }}>Save Preferences</button>
    </section>
  </Shell>;
}
