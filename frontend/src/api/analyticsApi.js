import { apiAuthGet } from './client';

export const getAstrologerAnalytics = () => apiAuthGet('/astrologer/analytics');
export const getAstrologerEarningsAnalytics = (period) => apiAuthGet(`/astrologer/analytics/earnings${period ? `?period=${period}` : ''}`);
export const getAstrologerAudienceAnalytics = () => apiAuthGet('/astrologer/analytics/audience');
