import { apiAuthPost, apiAuthGet } from './client';

export async function purchaseQuestion(campaignId) {
  return apiAuthPost('/user/question-purchases', { campaignId });
}

export async function getPurchaseDetails(purchaseId) {
  return apiAuthGet(`/user/question-purchases/${purchaseId}`);
}

export async function getMyPurchases() {
  return apiAuthGet('/user/question-purchases');
}
