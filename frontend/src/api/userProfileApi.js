import { apiGet, apiAuthGet, apiAuthPost, apiAuthPut, apiAuthPatch, apiAuthDelete } from './client';

// User profile
export const getMyFullProfile = () => apiAuthGet('/user/profile/full');
export const updateUserProfile = (data) => apiAuthPatch('/user/profile', data);

// User astrology / family profiles
export const getAstrologyProfiles = () => apiAuthGet('/user/astrology-profiles');
export const getAstrologyProfile = (id) => apiAuthGet(`/user/astrology-profiles/${id}`);
export const createAstrologyProfile = (data) => apiAuthPost('/user/astrology-profiles', data);
export const updateAstrologyProfile = (id, data) => apiAuthPatch(`/user/astrology-profiles/${id}`, data);
export const deleteAstrologyProfile = (id) => apiAuthDelete(`/user/astrology-profiles/${id}`);
export const setDefaultAstrologyProfile = (id) => apiAuthPatch(`/user/astrology-profiles/${id}/default`);
export const getAstrologyProfileHistory = (id) => apiAuthGet(`/user/astrology-profiles/${id}/history`);

// Astrologer profile (enhanced)
export const getAstrologerProfileFull = () => apiAuthGet('/astrologer/profile/me');

// Public astrologer profile (for users)
export const getAstrologerPublicProfile = (id) => apiAuthGet(`/user/astrologers/${id}/profile`);
