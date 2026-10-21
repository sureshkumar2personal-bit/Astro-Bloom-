import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getMySubscriptions, renewSubscription, upgradeSubscription, downgradeSubscription, cancelSubscription } from '../../api/subscriptionApi';
import { unfollowAstrologer } from '../../api/followApi';
import { getAstrologerPublicPlans } from '../../api/subscriptionApi';

const PLAN_ORDER = { silver: 1, gold: 2, platinum: 3 };
const PLAN_COLORS = { silver: '#928994', gold: '#db9a40', platinum: '#5c3b8b' };

function daysUntil(dateStr) {
  const diff = new Date(dateStr) - new Date();
  return Math.ceil(diff / 86400000);
}

export default function UserSubscriptionsPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('subscriptions');
  const [actionLoading, setActionLoading] = useState('');
  const [cancelModal, setCancelModal] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [upgradeModal, setUpgradeModal] = useState(null);
  const [upgradePlans, setUpgradePlans] = useState([]);
  const [downgradeModal, setDowngradeModal] = useState(null);
  const [downgradePlans, setDowngradePlans] = useState([]);

  function loadData() {
    setLoading(true);
    getMySubscriptions()
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(loadData, []);

  async function handleUnfollow(astrologerId) {
    if (!confirm('Unfollow this astrologer?')) return;
    try {
      await unfollowAstrologer(astrologerId);
      loadData();
    } catch (e) { alert(e.message); }
  }

  async function handleRenew(subId) {
    if (!confirm('Renew this subscription? Amount will be deducted from wallet.')) return;
    setActionLoading(subId);
    try {
      await renewSubscription(subId);
      loadData();
    } catch (e) { alert(e.message); }
    finally { setActionLoading(''); }
  }

  async function handleCancel() {
    if (!cancelModal) return;
    setActionLoading(cancelModal.id);
    try {
      await cancelSubscription(cancelModal.id, cancelReason);
      setCancelModal(null);
      setCancelReason('');
      loadData();
    } catch (e) { alert(e.message); }
    finally { setActionLoading(''); }
  }

  async function handleUpgrade(sub, newPlanId) {
    setActionLoading(sub.id);
    try {
      await upgradeSubscription(sub.id, newPlanId);
      setUpgradeModal(null);
      loadData();
    } catch (e) { alert(e.message); }
    finally { setActionLoading(''); }
  }

  async function handleDowngrade(sub, newPlanId) {
    setActionLoading(sub.id);
    try {
      await downgradeSubscription(sub.id, newPlanId);
      setDowngradeModal(null);
      loadData();
    } catch (e) { alert(e.message); }
    finally { setActionLoading(''); }
  }

  async function openUpgrade(sub) {
    try {
      const r = await getAstrologerPublicPlans(sub.astrologerId);
      const higherPlans = r.data.filter(p => (PLAN_ORDER[p.planCode] || 0) > (PLAN_ORDER[sub.planCode] || 0));
      setUpgradePlans(higherPlans);
      setUpgradeModal(sub);
    } catch (e) { alert(e.message); }
  }

  async function openDowngrade(sub) {
    try {
      const r = await getAstrologerPublicPlans(sub.astrologerId);
      const lowerPlans = r.data.filter(p => (PLAN_ORDER[p.planCode] || 0) < (PLAN_ORDER[sub.planCode] || 0));
      setDowngradePlans(lowerPlans);
      setDowngradeModal(sub);
    } catch (e) { alert(e.message); }
  }

  if (loading) return <section className="page"><p style={{ color: '#6e6573', padding: 40 }}>Loading...</p></section>;
  if (!data) return <section className="page"><p style={{ color: '#6e6573', padding: 40 }}>Error loading data</p></section>;

  const { following = [], activeSubscriptions = [], expiredSubscriptions = [] } = data;

  return (
    <section className="page">
      <div className="page-header-block">
        <p className="eyebrow">MY CONNECTIONS</p>
        <h1>Subscriptions & Following</h1>
        <p className="subtitle">Manage astrologers you follow and your active subscriptions</p>
      </div>

      {/* Summary */}
      <div className="atonement-summary-row">
        <div className="atonement-summary-card"><small>Following</small><b>{following.length}</b></div>
        <div className="atonement-summary-card" style={{ borderColor: '#27ae60' }}><small>Active Subs</small><b style={{ color: '#27ae60' }}>{activeSubscriptions.length}</b></div>
        <div className="atonement-summary-card"><small>Past Subs</small><b>{expiredSubscriptions.length}</b></div>
      </div>

      {/* Tabs */}
      <div className="subs-tabs">
        <button className={activeTab === 'subscriptions' ? 'active' : ''} onClick={() => setActiveTab('subscriptions')}>
          Active Subscriptions {activeSubscriptions.length > 0 && <span className="subs-tab-count">{activeSubscriptions.length}</span>}
        </button>
        <button className={activeTab === 'following' ? 'active' : ''} onClick={() => setActiveTab('following')}>
          Following {following.length > 0 && <span className="subs-tab-count">{following.length}</span>}
        </button>
        <button className={activeTab === 'expired' ? 'active' : ''} onClick={() => setActiveTab('expired')}>
          Past {expiredSubscriptions.length > 0 && <span className="subs-tab-count">{expiredSubscriptions.length}</span>}
        </button>
      </div>

      {/* Active Subscriptions Tab */}
      {activeTab === 'subscriptions' && (
        <div className="subs-list">
          {activeSubscriptions.length === 0 ? (
            <div className="subs-empty-state">
              <p style={{ fontSize: 40, margin: 0 }}>⭐</p>
              <p>No active subscriptions yet.</p>
              <p style={{ fontSize: 13 }}>Subscribe to astrologers to unlock exclusive perks.</p>
              <Link to="/user/astrologers" className="btn-primary" style={{ display: 'inline-block', marginTop: 12 }}>Explore Astrologers</Link>
            </div>
          ) : activeSubscriptions.map(s => {
            const daysLeft = daysUntil(s.expiresAt);
            const isExpiringSoon = daysLeft <= 7 && daysLeft > 0;
            const isExpired = daysLeft <= 0;
            return (
              <div key={s.id} className="subs-active-card">
                <div className="subs-active-header">
                  <div>
                    <span className="subs-plan-badge" style={{ background: PLAN_COLORS[s.planCode] || '#999' }}>{s.planName}</span>
                    <h3>{s.displayName}</h3>
                    <small style={{ color: '#6e6573' }}>
                      Started {new Date(s.startedAt).toLocaleDateString()} · Expires {new Date(s.expiresAt).toLocaleDateString()}
                    </small>
                  </div>
                  <div className="subs-days-badge" style={{ borderColor: isExpiringSoon ? '#db9a40' : isExpired ? '#c0392b' : '#27ae60' }}>
                    <b style={{ color: isExpiringSoon ? '#db9a40' : isExpired ? '#c0392b' : '#27ae60' }}>
                      {isExpired ? 'Expired' : `${daysLeft} days`}
                    </b>
                    <small>{isExpired ? 'Expired' : isExpiringSoon ? 'Expiring soon' : 'Remaining'}</small>
                  </div>
                </div>

                {isExpiringSoon && !isExpired && (
                  <div className="subs-expiring-notice">
                    Your {s.planName} plan expires in {daysLeft} day{daysLeft !== 1 ? 's' : ''}.
                    <button onClick={() => handleRenew(s.id)} disabled={actionLoading === s.id}>
                      {actionLoading === s.id ? 'Renewing...' : 'Renew Now'}
                    </button>
                  </div>
                )}

                <div className="subs-active-actions">
                  <Link to={`/user/astrologers/${s.astrologerId}`} className="btn-secondary btn-sm">View Profile</Link>
                  <button className="btn-secondary btn-sm" onClick={() => handleRenew(s.id)} disabled={actionLoading === s.id}>Renew</button>
                  <button className="btn-secondary btn-sm" onClick={() => openUpgrade(s)} disabled={actionLoading === s.id}>Upgrade</button>
                  <button className="btn-secondary btn-sm" onClick={() => openDowngrade(s)} disabled={actionLoading === s.id}>Downgrade</button>
                  <button className="btn-sm" style={{ color: '#c0392b' }} onClick={() => setCancelModal(s)}>Cancel</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Following Tab */}
      {activeTab === 'following' && (
        <div className="subs-list">
          {following.length === 0 ? (
            <div className="subs-empty-state">
              <p style={{ fontSize: 40, margin: 0 }}>🤝</p>
              <p>Not following any astrologer yet.</p>
              <p style={{ fontSize: 13 }}>Follow astrologers to receive their public updates.</p>
              <Link to="/user/astrologers" className="btn-primary" style={{ display: 'inline-block', marginTop: 12 }}>Explore Astrologers</Link>
            </div>
          ) : following.map(f => (
            <div key={f.id} className="subs-following-card">
              <div className="subs-following-info">
                <div className="subs-avatar">{(f.displayName || 'A')[0]}</div>
                <div>
                  <b>{f.displayName}</b>
                  <small>{f.professionalTitle || 'Astrologer'}</small>
                  <small>Following since {new Date(f.followedAt).toLocaleDateString()}</small>
                </div>
              </div>
              <div className="subs-following-actions">
                <Link to={`/user/astrologers/${f.astrologerId}`} className="btn-secondary btn-sm">View Profile</Link>
                <button className="btn-sm" style={{ color: '#c0392b' }} onClick={() => handleUnfollow(f.astrologerId)}>Unfollow</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Expired Tab */}
      {activeTab === 'expired' && (
        <div className="subs-list">
          {expiredSubscriptions.length === 0 ? (
            <div className="subs-empty-state">
              <p style={{ fontSize: 40, margin: 0 }}>📋</p>
              <p>No past subscriptions.</p>
            </div>
          ) : expiredSubscriptions.map(s => (
            <div key={s.id} className="subs-expired-card">
              <div>
                <span className="subs-plan-badge" style={{ background: PLAN_COLORS[s.planCode] || '#999', opacity: 0.7 }}>{s.planName}</span>
                <b>{s.displayName}</b>
                <small>{s.status === 'cancelled' ? 'Cancelled' : 'Expired'} · {new Date(s.expiresAt).toLocaleDateString()}</small>
              </div>
              <div>
                <Link to={`/user/astrologers/${s.astrologerId}`} className="btn-secondary btn-sm">View Plans</Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cancel Modal */}
      {cancelModal && (
        <div className="subs-modal-overlay" onClick={() => setCancelModal(null)}>
          <div className="subs-modal" onClick={e => e.stopPropagation()}>
            <h2>Cancel Subscription</h2>
            <p>You are about to cancel your <strong>{cancelModal.planName}</strong> subscription with <strong>{cancelModal.displayName}</strong>.</p>
            <div className="subs-modal-warning">
              <p>Benefits will remain until {new Date(cancelModal.expiresAt).toLocaleDateString()}.</p>
              <p>No refund will be issued for the remaining period.</p>
            </div>
            <label>Reason (optional)<textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)} rows={3} placeholder="Why are you cancelling?" /></label>
            <div className="subs-modal-actions">
              <button className="btn-secondary" onClick={() => setCancelModal(null)}>Keep Subscription</button>
              <button className="btn-danger" onClick={handleCancel} disabled={actionLoading === cancelModal.id}>
                {actionLoading === cancelModal.id ? 'Cancelling...' : 'Confirm Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Modal */}
      {upgradeModal && (
        <div className="subs-modal-overlay" onClick={() => setUpgradeModal(null)}>
          <div className="subs-modal" onClick={e => e.stopPropagation()}>
            <h2>Upgrade Plan</h2>
            <p>Upgrade your <strong>{upgradeModal.planName}</strong> plan with <strong>{upgradeModal.displayName}</strong>.</p>
            {upgradePlans.length === 0 ? (
              <p style={{ color: '#6e6573' }}>You are already on the highest plan.</p>
            ) : (
              <div className="subs-plan-options">
                {upgradePlans.map(p => (
                  <div key={p.id} className="subs-plan-option">
                    <div>
                      <span className="subs-plan-badge" style={{ background: PLAN_COLORS[p.planCode] || '#999' }}>{p.planName}</span>
                      <b>₹{p.price}</b>
                      <small>{p.durationDays} days</small>
                    </div>
                    <button className="btn-primary btn-sm" onClick={() => handleUpgrade(upgradeModal, p.id)} disabled={actionLoading === upgradeModal.id}>
                      Upgrade to {p.planName}
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button className="btn-secondary" onClick={() => setUpgradeModal(null)} style={{ marginTop: 12 }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Downgrade Modal */}
      {downgradeModal && (
        <div className="subs-modal-overlay" onClick={() => setDowngradeModal(null)}>
          <div className="subs-modal" onClick={e => e.stopPropagation()}>
            <h2>Downgrade Plan</h2>
            <p>Downgrade your <strong>{downgradeModal.planName}</strong> plan with <strong>{downgradeModal.displayName}</strong>.</p>
            <div className="subs-modal-warning">
              <p>Downgrade will apply immediately. Current benefits will be replaced with lower-tier benefits.</p>
            </div>
            {downgradePlans.length === 0 ? (
              <p style={{ color: '#6e6573' }}>You are already on the lowest plan.</p>
            ) : (
              <div className="subs-plan-options">
                {downgradePlans.map(p => (
                  <div key={p.id} className="subs-plan-option">
                    <div>
                      <span className="subs-plan-badge" style={{ background: PLAN_COLORS[p.planCode] || '#999' }}>{p.planName}</span>
                      <b>₹{p.price}</b>
                      <small>{p.durationDays} days</small>
                    </div>
                    <button className="btn-primary btn-sm" onClick={() => handleDowngrade(downgradeModal, p.id)} disabled={actionLoading === downgradeModal.id}>
                      Downgrade to {p.planName}
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button className="btn-secondary" onClick={() => setDowngradeModal(null)} style={{ marginTop: 12 }}>Cancel</button>
          </div>
        </div>
      )}
    </section>
  );
}
