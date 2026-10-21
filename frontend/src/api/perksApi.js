import { apiAuthGet, apiAuthPost } from './client';

export async function getMyPerks() {
  return apiAuthGet('/user/perks');
}

export async function usePerk(perkId, serviceType, referenceId) {
  return apiAuthPost(`/user/perks/${perkId}/use`, { serviceType, referenceId });
}
