import { useEffect, useState } from 'react';
import Shell from '../../components/common/Shell';
import { getAudienceDashboard } from '../../api/audienceApi';

export default function AstrologerRatesPage() {
  const [dash, setDash] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAudienceDashboard()
      .then(r => setDash(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Shell><section className="rates-page"><h1>Rates &amp; Plans</h1><p>Loading...</p></section></Shell>;
  if (!dash) return <Shell><section className="rates-page"><h1>Error</h1></section></Shell>;

  return (
    <Shell>
      <section className="rates-page">
        <p className="eyebrow">PRICING</p>
        <h1>Rates &amp; Plans</h1>

        <div className="dash-stats">
          <div className="dash-stat"><span>👥</span><small>Total Followers</small><b>{dash.totalFollowers}</b></div>
          <div className="dash-stat"><span>⭐</span><small>Total Subscribers</small><b>{dash.totalSubscribers}</b></div>
        </div>

        <div className="profile-section">
          <h2>Plan Distribution</h2>
          {Object.keys(dash.planDistribution).length === 0 && <p className="subs-empty">No subscribers yet.</p>}
          {Object.entries(dash.planDistribution).map(([code, count]) => (
            <div key={code} className="subs-row">
              <div className="subs-info">
                <b>{code.charAt(0).toUpperCase() + code.slice(1)}</b>
                <span>{count} active subscriber{count !== 1 ? 's' : ''}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="profile-section">
          <h2>Manage Plans</h2>
          <p className="muted">Subscription plans are managed from the profile edit page. Each plan's benefits and pricing can be configured there.</p>
        </div>
      </section>
    </Shell>
  );
}
