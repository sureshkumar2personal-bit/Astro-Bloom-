import { apiGet, apiPost, apiAuthGet, apiAuthPost, apiAuthPatch } from './client';

const BASE_USER = '/user/question-disputes';
const BASE_ASTRO = '/astrologer/question-disputes';

// User
export const raiseDispute = (data) => apiAuthPost(BASE_USER, data);
export const getUserDisputes = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return apiAuthGet(`${BASE_USER}${qs ? '?' + qs : ''}`);
};
export const getUserDisputeDetail = (disputeId) => apiAuthGet(`${BASE_USER}/${disputeId}`);
export const sendUserDisputeMessage = (disputeId, message) => apiAuthPost(`${BASE_USER}/${disputeId}/messages`, { message });

// Astrologer
export const getAstrologerDisputes = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return apiAuthGet(`${BASE_ASTRO}${qs ? '?' + qs : ''}`);
};
export const getAstrologerDisputeDetail = (disputeId) => apiAuthGet(`${BASE_ASTRO}/${disputeId}`);
export const respondToDispute = (disputeId, response) => apiAuthPatch(`${BASE_ASTRO}/${disputeId}/respond`, { response });
export const markDisputeReviewing = (disputeId) => apiAuthPatch(`${BASE_ASTRO}/${disputeId}/reviewing`);
export const sendAstrologerDisputeMessage = (disputeId, message) => apiAuthPost(`${BASE_ASTRO}/${disputeId}/messages`, { message });
