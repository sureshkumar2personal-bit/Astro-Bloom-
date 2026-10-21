import { apiAuthGet, apiAuthPost, apiAuthPut } from './client';

export async function createLiveSession(payload) {
  return apiAuthPost('/astrologer/live-sessions', payload);
}

export async function getAstrologerLiveSessions(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return apiAuthGet(`/astrologer/live-sessions${qs ? '?' + qs : ''}`);
}

export async function updateLiveSession(sessionId, payload) {
  return apiAuthPut(`/astrologer/live-sessions/${sessionId}`, payload);
}

export async function cancelLiveSession(sessionId) {
  return apiAuthPost(`/astrologer/live-sessions/${sessionId}/cancel`);
}

export async function startLiveSession(sessionId) {
  return apiAuthPost(`/astrologer/live-sessions/${sessionId}/start`);
}

export async function endLiveSession(sessionId) {
  return apiAuthPost(`/astrologer/live-sessions/${sessionId}/end`);
}

export async function getLiveQuestionQueue(sessionId) {
  return apiAuthGet(`/astrologer/live-sessions/${sessionId}/questions`);
}

export async function markQuestionAnswering(questionId) {
  return apiAuthPost(`/astrologer/live-questions/${questionId}/answering`);
}

export async function markQuestionAnswered(questionId) {
  return apiAuthPost(`/astrologer/live-questions/${questionId}/answered`);
}

export async function skipQuestion(questionId, reason) {
  return apiAuthPost(`/astrologer/live-questions/${questionId}/skip`, { reason });
}
