import { apiPost, apiAuthGet, apiAuthPut, apiAuthPatch, apiAuthDelete } from './client';

const BASE = '/api/astrologer/staff';

export const getStaffList = () => apiAuthGet(BASE);
export const createStaff = (data) => apiPost(BASE, data);
export const getStaffDetail = (staffId) => apiAuthGet(`${BASE}/${staffId}`);
export const updatePermissions = (staffId, data) => apiAuthPut(`${BASE}/${staffId}/permissions`, data);
export const disableStaff = (staffId) => apiAuthPatch(`${BASE}/${staffId}/disable`);
export const enableStaff = (staffId) => apiAuthPatch(`${BASE}/${staffId}/enable`);
export const removeStaff = (staffId) => apiAuthDelete(`${BASE}/${staffId}`);
export const getActivityLogs = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return apiAuthGet(`${BASE}/activity-logs${qs ? '?' + qs : ''}`);
};
export const activateKillSwitch = (data) => apiPost(`${BASE}/kill-switch`, data);
export const restoreKillSwitch = (data) => apiPost(`${BASE}/kill-switch/restore`, data);
export const getSecurityEvents = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return apiAuthGet(`${BASE}/security-events${qs ? '?' + qs : ''}`);
};
export const acceptInvite = (data) => apiPost(`${BASE}/accept-invite`, data);
export const staffLogin = (data) => apiPost(`${BASE}/login`, data);
export const refreshStaffToken = (data) => apiPost(`${BASE}/refresh-token`, data);
