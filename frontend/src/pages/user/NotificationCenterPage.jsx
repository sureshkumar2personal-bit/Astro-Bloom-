import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Shell from '../../components/common/Shell';
import Notice from '../../components/common/Notice';
import { getUserNotifications, markNotificationsRead } from '../../api/notificationApi';

export default function NotificationCenterPage() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [msg, setMsg] = useState('');

  const load = () => getUserNotifications().then(r => { setNotifications(r.data.notifications); setUnreadCount(r.data.unreadCount); }).catch(() => {});
  useEffect(() => { load(); }, []);

  async function handleMarkAllRead() {
    try { await markNotificationsRead(); setMsg('All marked as read.'); load(); } catch (err) { setMsg(err.message); }
  }

  async function handleMarkRead(ids) {
    try { await markNotificationsRead(ids); load(); } catch (err) { setMsg(err.message); }
  }

  function timeAgo(d) {
    const diff = (Date.now() - new Date(d)) / 1000;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  return <Shell>
    <section className="notifications-page">
      <div className="page-header">
        <h1>Notifications {unreadCount > 0 && <span className="unread-badge">{unreadCount}</span>}</h1>
        <div className="header-actions">
          {unreadCount > 0 && <button className="outline-link" onClick={handleMarkAllRead}>Mark all read</button>}
          <Link className="outline-link" to="/user/notification-preferences">Preferences →</Link>
        </div>
      </div>
      <Notice message={msg} />
      {notifications.length === 0 ? <div className="empty-state"><p>No notifications yet.</p></div> : (
        <div className="notification-list">
          {notifications.map(n => (
            <div key={n.id} className={`notification-card ${!n.readAt ? 'unread' : ''}`} onClick={() => !n.readAt && handleMarkRead([n.id])}>
              <div className="notif-icon">{n.type.includes('question') ? '✦' : n.type.includes('payment') ? '★' : n.type.includes('live') ? '●' : n.type.includes('appointment') ? '◷' : '◈'}</div>
              <div className="notif-content">
                <h3>{n.title}</h3>
                <p>{n.body}</p>
                <span className="notif-time">{timeAgo(n.createdAt)}</span>
              </div>
              {!n.readAt && <span className="notif-dot" />}
            </div>
          ))}
        </div>
      )}
    </section>
  </Shell>;
}
