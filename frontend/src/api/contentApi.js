import { apiGet, apiPost, apiAuthGet, apiAuthPost, apiAuthPut, apiAuthDelete } from './client';

export const createContent = (body) => apiAuthPost('/astrologer/contents', body);
export const updateContent = (contentId, body) => apiAuthPut(`/astrologer/contents/${contentId}`, body);
export const publishContent = (contentId, body) => apiAuthPost(`/astrologer/contents/${contentId}/publish`, body);
export const unpublishContent = (contentId) => apiAuthPost(`/astrologer/contents/${contentId}/unpublish`);
export const deleteContent = (contentId) => apiAuthDelete(`/astrologer/contents/${contentId}`);
export const getAstrologerContents = (params) => {
  const qs = new URLSearchParams(params).toString();
  return apiAuthGet(`/astrologer/contents?${qs}`);
};
export const getContentAnalytics = (contentId) => apiAuthGet(`/astrologer/contents/${contentId}/analytics`);
export const getDashboardContents = () => apiAuthGet('/user/contents/dashboard');
export const getFreeInformationContents = (params) => {
  const qs = params ? new URLSearchParams(params).toString() : '';
  return apiGet(`/user/contents/free-information?${qs}`);
};
export const getMyPerksContents = () => apiAuthGet('/user/contents/perks');
export const getContentDetail = (contentId) => apiAuthGet(`/user/contents/${contentId}`);
export const markContentViewed = (contentId) => apiAuthPost(`/user/contents/${contentId}/view`);
export const getContentNotifications = () => apiAuthGet('/user/content-notifications');
