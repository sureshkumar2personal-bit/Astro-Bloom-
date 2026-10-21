import { apiAuthPost, apiAuthGet, apiAuthPut, apiAuthPatch } from './client';

export async function createCampaign(data) {
  return apiAuthPost('/astrologer/question-campaigns', data);
}

export async function getCampaigns() {
  return apiAuthGet('/astrologer/question-campaigns');
}

export async function getCampaign(campaignId) {
  return apiAuthGet(`/astrologer/question-campaigns/${campaignId}`);
}

export async function updateCampaign(campaignId, data) {
  return apiAuthPut(`/astrologer/question-campaigns/${campaignId}`, data);
}

export async function activateCampaign(campaignId) {
  return apiAuthPatch(`/astrologer/question-campaigns/${campaignId}/activate`);
}

export async function pauseCampaign(campaignId) {
  return apiAuthPatch(`/astrologer/question-campaigns/${campaignId}/pause`);
}

export async function stopCampaign(campaignId) {
  return apiAuthPatch(`/astrologer/question-campaigns/${campaignId}/stop`);
}

export async function getAstrologerActiveCampaigns(astrologerId) {
  const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/astrologer/question-campaigns/astrologer/${astrologerId}/active`);
  return res.json();
}
