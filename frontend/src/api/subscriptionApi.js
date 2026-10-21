import { apiAuthPost, apiAuthGet, apiAuthPatch, apiAuthDelete } from './client';

export async function getAstrologerPlans() {
  return apiAuthGet('/astrologer/subscription-plans');
}

export async function createPlan(data) {
  return apiAuthPost('/astrologer/subscription-plans', data);
}

export async function getAstrologerPublicPlans(astrologerId) {
  const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/astrologers/${astrologerId}/subscription-plans`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to fetch plans');
  return json;
}

export async function subscribe(astrologerId, planId, autoRenew = false) {
  return apiAuthPost('/user/subscriptions', { astrologerId, planId, autoRenew });
}

export async function getMySubscriptions() {
  return apiAuthGet('/user/subscriptions');
}

export async function renewSubscription(subId) {
  return apiAuthPost(`/user/subscriptions/${subId}/renew`);
}

export async function upgradeSubscription(subId, newPlanId) {
  return apiAuthPost(`/user/subscriptions/${subId}/upgrade`, { newPlanId });
}

export async function downgradeSubscription(subId, newPlanId, applyFrom = 'next_cycle') {
  return apiAuthPost(`/user/subscriptions/${subId}/downgrade`, { newPlanId, applyFrom });
}

export async function cancelSubscription(subId, reason = '') {
  return apiAuthPost(`/user/subscriptions/${subId}/cancel`, { reason });
}
