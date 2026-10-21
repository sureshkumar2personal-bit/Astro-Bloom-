import { apiAuthPost, apiAuthDelete, apiAuthGet } from './client';

export async function followAstrologer(astrologerId) {
  return apiAuthPost(`/user/follows/${astrologerId}`);
}

export async function unfollowAstrologer(astrologerId) {
  return apiAuthDelete(`/user/follows/${astrologerId}`);
}

export async function checkFollowStatus(astrologerId) {
  return apiAuthGet(`/user/follows/check/${astrologerId}`);
}
