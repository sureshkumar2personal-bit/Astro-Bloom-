import { apiAuthPost, apiAuthGet, apiAuthPatch } from './client';

export async function submitQuestion(data) {
  return apiAuthPost('/user/questions', data);
}

export async function getQuestionTracking(questionId) {
  return apiAuthGet(`/user/questions/${questionId}/tracking`);
}

export async function getMyQuestions() {
  return apiAuthGet('/user/questions');
}

export async function getAstrologerQueue(status) {
  const params = status ? `?status=${status}` : '';
  return apiAuthGet(`/astrologer/questions/queue${params}`);
}

export async function startReviewQuestion(questionId) {
  return apiAuthPatch(`/astrologer/questions/astrologer/${questionId}/start-review`);
}

export async function submitAnswer(questionId, data) {
  return apiAuthPost(`/astrologer/questions/astrologer/${questionId}/answer`, data);
}
