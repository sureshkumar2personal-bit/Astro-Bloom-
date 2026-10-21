import { apiAuthGet, apiAuthPost, apiAuthPatch } from './client';

export async function getAudienceDashboard() {
  return apiAuthGet('/astrologer/audience/dashboard');
}

export async function getAudienceUsers(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return apiAuthGet(`/astrologer/audience/users${qs ? '?' + qs : ''}`);
}

export async function getUserCrmDetail(userId) {
  return apiAuthGet(`/astrologer/audience/users/${userId}`);
}

export async function createContent(data) {
  return apiAuthPost('/astrologer/perks/content', data);
}

export async function publishContent(contentId) {
  return apiAuthPatch(`/astrologer/perks/content/${contentId}/publish`);
}

export async function listContent() {
  return apiAuthGet('/astrologer/perks/content');
}
