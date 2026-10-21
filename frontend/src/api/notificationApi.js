import { apiAuthGet, apiAuthPatch, apiAuthPut } from './client';

export const getUserNotifications = (unreadOnly) => apiAuthGet(`/user/notifications${unreadOnly ? '?unreadOnly=true' : ''}`);
export const getAstrologerNotifications = (unreadOnly) => apiAuthGet(`/astrologer/notifications${unreadOnly ? '?unreadOnly=true' : ''}`);
export const markNotificationsRead = (ids) => apiAuthPatch('/user/notifications/read', { notificationIds: ids });
export const astrologerMarkNotificationsRead = (ids) => apiAuthPatch('/astrologer/notifications/read', { notificationIds: ids });
export const getUserNotificationPrefs = () => apiAuthGet('/user/notification-preferences');
export const getAstrologerNotificationPrefs = () => apiAuthGet('/astrologer/notification-preferences');
export const updateUserNotificationPrefs = (preferences) => apiAuthPut('/user/notification-preferences', { preferences });
export const updateAstrologerNotificationPrefs = (preferences) => apiAuthPut('/astrologer/notification-preferences', { preferences });
