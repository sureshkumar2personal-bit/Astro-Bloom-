import { apiGet } from './client';

export async function getAstrologers(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => { if (v && v !== false) params.set(k, String(v)); });
  return apiGet(`/user/astrologers?${params}`);
}

export async function getAstrologerProfile(astrologerId) {
  return apiGet(`/user/astrologers/${astrologerId}`);
}

export async function getAstrologerReviews(astrologerId, page = 1, limit = 10) {
  return apiGet(`/user/astrologers/${astrologerId}/reviews?page=${page}&limit=${limit}`);
}
