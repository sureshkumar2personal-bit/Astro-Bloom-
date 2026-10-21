import { apiAuthGet, apiAuthPost, apiAuthPatch } from './client';

// ─── Astrologer Atonement APIs ──────────────────────────────────────────
export const getAtonementDashboard = () => apiAuthGet('/astrologer/atonements/dashboard');
export const getAstrologerAtonements = (params) => {
  const qs = params ? new URLSearchParams(params).toString() : '';
  return apiAuthGet(`/astrologer/atonements?${qs}`);
};
export const getAstrologerAtonementDetail = (id) => apiAuthGet(`/astrologer/atonements/${id}`);
export const createAtonement = (body) => apiAuthPost('/astrologer/atonements', body);
export const updateAtonement = (id, body) => apiAuthPatch(`/astrologer/atonements/${id}`, body);
export const updateAtonementStatus = (id, body) => apiAuthPatch(`/astrologer/atonements/${id}/status`, body);
export const notifyAtonementUser = (id) => apiAuthPost(`/astrologer/atonements/${id}/notify-user`);

// ─── Astrologer Revenue APIs ────────────────────────────────────────────
export const getAtonementRevenue = (params) => {
  const qs = params ? new URLSearchParams(params).toString() : '';
  return apiAuthGet(`/astrologer/atonements/revenue?${qs}`);
};
export const getAtonementRevenueDetail = (id) => apiAuthGet(`/astrologer/atonements/revenue/${id}`);

// ─── Astrologer Discount Code APIs ──────────────────────────────────────
export const getDiscountCodes = () => apiAuthGet('/astrologer/discount-codes');
export const createDiscountCode = (body) => apiAuthPost('/astrologer/discount-codes', body);
export const pauseDiscountCode = (id, body) => apiAuthPatch(`/astrologer/discount-codes/${id}/pause`, body);

// ─── User Atonement APIs ────────────────────────────────────────────────
export const getUserAtonements = (params) => {
  const qs = params ? new URLSearchParams(params).toString() : '';
  return apiAuthGet(`/user/atonements?${qs}`);
};
export const getUserAtonementDetail = (id) => apiAuthGet(`/user/atonements/${id}`);
export const markAtonementStarted = (id) => apiAuthPost(`/user/atonements/${id}/mark-started`);
export const uploadAtonementProof = (id, body) => apiAuthPost(`/user/atonements/${id}/proofs`, body);
export const payAtonement = (id, body) => apiAuthPost(`/user/atonements/${id}/pay`, body);
export const validateDiscountCode = (body) => apiAuthPost('/user/discount-codes/validate', body);
