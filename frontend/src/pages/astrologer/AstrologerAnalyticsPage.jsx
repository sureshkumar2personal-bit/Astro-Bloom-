import { useState, useEffect } from 'react';
import Shell from '../../components/common/Shell';
import { getAstrologerAnalytics, getAstrologerEarningsAnalytics, getAstrologerAudienceAnalytics } from '../../api/analyticsApi';

export default function AstrologerAnalyticsPage() {
  const [overview, setOverview] = useState(null);
  const [earnings, setEarnings] = useState(null);
  const [audience, setAudience] = useState(null);
  const [period, setPeriod] = useState('30d');

  useEffect(() => {
    getAstrologerAnalytics().then(r => setOverview(r.data)).catch(() => {});
    getAstrologerAudienceAnalytics().then(r => setAudience(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    getAstrologerEarningsAnalytics(period).then(r => setEarnings(r.data)).catch(() => {});
  }, [period]);

  return <Shell>
    <section className="analytics-page">
      <div className="page-header"><h1>Analytics Dashboard</h1></div>
      {overview && <div className="analytics-overview">
        <div className="stat-card"><span className="stat-icon">👁</span><small>Profile Views</small><b>{overview.profileViews}</b></div>
        <div className="stat-card"><span className="stat-icon">✦</span><small>Questions Answered</small><b>{overview.questionsAnswered}</b></div>
        <div className="stat-card"><span className="stat-icon">★</span><small>Total Earnings</small><b>₹{overview.totalEarnings}</b></div>
        <div className="stat-card"><span className="stat-icon">◷</span><small>Subscribers</small><b>{overview.subscriberCount}</b></div>
        <div className="stat-card"><span className="stat-icon">♡</span><small>Followers</small><b>{overview.followerCount}</b></div>
        <div className="stat-card"><span className="stat-icon">●</span><small>Live Sessions</small><b>{overview.liveSessionCount}</b></div>
        <div className="stat-card"><span className="stat-icon">☆</span><small>Avg Rating</small><b>{overview.averageRating} ({overview.totalReviews})</b></div>
      </div>}
      <div className="analytics-section">
        <h2>Earnings <span className="period-select">
          {[['7d','7D'],['30d','30D'],['90d','90D'],['365d','1Y']].map(([v, l]) => <button key={v} className={period === v ? 'active' : ''} onClick={() => setPeriod(v)}>{l}</button>)}
        </span></h2>
        {earnings && <div className="earnings-breakdown">
          {earnings.byService?.map(s => <div key={s.serviceType} className="earn-row"><span>{s.serviceType}</span><span>{s.count} items</span><b>₹{s.total}</b></div>)}
          {earnings.byMonth?.map(m => <div key={m.month} className="earn-row"><span>{m.month}</span><b>₹{m.total}</b></div>)}
          <div className="earn-row total"><span>Commission paid</span><b>₹{earnings.totalCommissionPaid}</b></div>
        </div>}
      </div>
      {audience && <div className="analytics-section">
        <h2>Audience</h2>
        <div className="audience-stats">
          <div className="stat-row"><span>Followers</span><b>{audience.totalFollowers}</b></div>
          <div className="stat-row"><span>Subscribers</span><b>{audience.totalSubscribers}</b></div>
        </div>
        {audience.topQuestionCategories?.length > 0 && <div className="top-categories">
          <h3>Top Question Categories</h3>
          {audience.topQuestionCategories.map(c => <div key={c.category} className="cat-row"><span>{c.category}</span><b>{c.count}</b></div>)}
        </div>}
        {audience.recentFollowers?.length > 0 && <div className="recent-list">
          <h3>Recent Followers</h3>
          {audience.recentFollowers.map(f => <div key={f.id} className="recent-item"><span>{f.full_name}</span><span>{new Date(f.followed_at || f.created_at).toLocaleDateString()}</span></div>)}
        </div>}
      </div>}
    </section>
  </Shell>;
}
