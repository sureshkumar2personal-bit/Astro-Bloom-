import { apiGet, apiPost, apiAuthGet, apiAuthPost, apiAuthPatch, apiAuthPut } from './client';

// User
export const requestEmergencyCall = (data) => apiAuthPost('/user/emergency', data);
export const payEmergencyRequest = (requestId) => apiAuthPost(`/user/emergency/${requestId}/pay`);
export const getUserEmergencyRequests = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return apiAuthGet(`/user/emergency${qs ? '?' + qs : ''}`);
};
export const cancelEmergencyRequest = (requestId, reason) => apiAuthPatch(`/user/emergency/${requestId}/cancel`, { reason });

// Astrologer
export const toggleEmergencyAvailability = (available) => apiAuthPatch('/astrologer/emergency/toggle', { available });
export const getAstrologerEmergencyRequests = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return apiAuthGet(`/astrologer/emergency${qs ? '?' + qs : ''}`);
};
export const acceptEmergencyRequest = (requestId) => apiAuthPatch(`/astrologer/emergency/${requestId}/accept`);
export const rejectEmergencyRequest = (requestId, reason) => apiAuthPatch(`/astrologer/emergency/${requestId}/reject`, { reason });
export const startEmergencyCall = (requestId) => apiAuthPatch(`/astrologer/emergency/${requestId}/start`);
export const endEmergencyCall = (requestId) => apiAuthPatch(`/astrologer/emergency/${requestId}/end`);
export const getAstrologerRates = () => apiAuthGet('/astrologer/rates');
export const updateAstrologerRates = (data) => apiAuthPut('/astrologer/rates', data);

// ── Emergency Slot Management (new slot-based flow) ──────────────────────

// Astrologer: slot CRUD
export const createEmergencySlot = (data) => apiAuthPost('/astrologer/emergency/slots', data);
export const getEmergencySlots = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return apiAuthGet(`/astrologer/emergency/slots${qs ? '?' + qs : ''}`);
};
export const updateEmergencySlot = (slotId, data) => apiAuthPatch(`/astrologer/emergency/slots/${slotId}`, data);
export const updateEmergencySlotStatus = (slotId, status) => apiAuthPatch(`/astrologer/emergency/slots/${slotId}/status`, { status });
export const deleteEmergencySlot = (slotId) => apiAuthDelete(`/astrologer/emergency/slots/${slotId}`);
export const getAstrologerEmergencyDashboard = () => apiAuthGet('/astrologer/emergency/dashboard');

// Astrologer: request queue (new flow)
export const getEmergencyQueueRequests = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return apiAuthGet(`/astrologer/emergency/requests${qs ? '?' + qs : ''}`);
};

// User: slot-based booking
export const getEmergencyAstrologers = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return apiAuthGet(`/user/emergency/astrologers${qs ? '?' + qs : ''}`);
};
export const getEmergencyAstrologerSlots = (astrologerId) => apiAuthGet(`/user/emergency/astrologers/${astrologerId}/slots`);
export const bookEmergencySlot = (data) => apiAuthPost('/user/emergency/request', data);
export const getUserEmergencyQueue = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return apiAuthGet(`/user/emergency/requests${qs ? '?' + qs : ''}`);
};
export const rateEmergencyCall = (requestId, data) => apiAuthPost(`/user/emergency/${requestId}/rating`, data);
export const getEmergencyOptions = () => apiAuthGet('/user/emergency/options');
