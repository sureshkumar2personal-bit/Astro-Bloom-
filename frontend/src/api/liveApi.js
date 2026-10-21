import { apiAuthGet, apiAuthPost } from './client';

export async function getLiveSessions(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return apiAuthGet(`/user/live-sessions${qs ? '?' + qs : ''}`);
}

export async function getLiveSessionDetails(sessionId) {
  return apiAuthGet(`/user/live-sessions/${sessionId}`);
}

export async function checkLiveAccess(sessionId) {
  return apiAuthGet(`/user/live-sessions/${sessionId}/access-check`);
}

export async function joinLiveSession(sessionId) {
  return apiAuthPost(`/user/live-sessions/${sessionId}/join`);
}

export async function payLiveEntry(sessionId) {
  return apiAuthPost(`/user/live-sessions/${sessionId}/pay-entry`);
}

export async function purchaseLiveQuestion(sessionId) {
  return apiAuthPost(`/user/live-sessions/${sessionId}/questions/purchase`);
}

export async function submitLiveQuestion(sessionId, payload) {
  return apiAuthPost(`/user/live-sessions/${sessionId}/questions`, payload);
}

export async function getMyLiveQuestion(sessionId) {
  return apiAuthGet(`/user/live-sessions/${sessionId}/my-question`);
}

export async function getLiveChat(sessionId) {
  return apiAuthGet(`/user/live-sessions/${sessionId}/chat`);
}

export async function sendLiveChat(sessionId, message) {
  return apiAuthPost(`/user/live-sessions/${sessionId}/chat`, { message });
}
