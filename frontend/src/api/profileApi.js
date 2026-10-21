import { apiAuthGet, apiAuthPut, apiAuthPost } from './client';

export async function getMyProfile() {
  return apiAuthGet('/astrologer/profile/me');
}

export async function updateMyProfile(form) {
  return apiAuthPut('/astrologer/profile/me', form);
}

export async function uploadCertificate(formData) {
  return apiAuthPost('/astrologer/profile/certificates', formData);
}

export async function submitForReview() {
  return apiAuthPost('/astrologer/profile/submit-review', {});
}
