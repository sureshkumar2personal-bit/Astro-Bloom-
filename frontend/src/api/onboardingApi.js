import { apiAuthGet, apiAuthPut, apiAuthPost } from './client';

export const getMyProfile = () => apiAuthGet('/user/profile');
export const updateMyProfile = (data) => apiAuthPut('/user/profile', data);
export const updateMyPreferences = (data) => apiAuthPut('/user/preferences', data);
export const sendOtp = (data) => apiAuthPost('/user/send-otp', data);
export const verifyOtp = (data) => apiAuthPost('/user/verify-otp', data);
export const getAstrologerOnboarding = () => apiAuthGet('/astrologer/onboarding');
export const updateAstrologerOnboarding = (data) => apiAuthPut('/astrologer/onboarding', data);
