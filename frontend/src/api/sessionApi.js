import { apiPost, apiAuthGet, apiAuthDelete } from './client';

export const forgotPassword = (data) => apiPost('/auth/user/forgot-password', data);
export const astrologerForgotPassword = (data) => apiPost('/auth/astrologer/forgot-password', data);
export const resetPassword = (data) => apiPost('/auth/user/reset-password', data);
export const astrologerResetPassword = (data) => apiPost('/auth/astrologer/reset-password', data);
export const getUserSessions = () => apiAuthGet('/user/sessions');
export const getAstrologerSessions = () => apiAuthGet('/astrologer/sessions');
export const revokeSession = (sessionId) => apiAuthDelete(`/user/sessions/${sessionId}`);
export const astrologerRevokeSession = (sessionId) => apiAuthDelete(`/astrologer/sessions/${sessionId}`);
export const revokeAllSessions = () => apiAuthDelete('/user/sessions');
export const astrologerRevokeAllSessions = () => apiAuthDelete('/astrologer/sessions');
