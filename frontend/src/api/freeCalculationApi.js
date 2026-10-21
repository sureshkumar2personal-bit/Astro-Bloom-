import { apiPost } from './client';

export const numerologyReport = (body) => apiPost('/free-calculations/numerology', body);
export const calculateDasha = (body) => apiPost('/free-calculations/dasha', body);
export const calculateBirthChart = (body) => apiPost('/free-calculations/birth-chart', body);
export const calculateNakshatra = (body) => apiPost('/free-calculations/nakshatra', body);
export const calculatePanchangam = (body) => apiPost('/free-calculations/panchangam', body);
export const calculateMarriageMatching = (body) => apiPost('/free-calculations/marriage-matching', body);
export const searchBabyNames = (body) => apiPost('/free-calculations/baby-names', body);
