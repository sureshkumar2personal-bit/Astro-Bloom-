import { apiAuthGet, apiAuthPost } from './client';

export const getAiUsage = () => apiAuthGet('/user/ai/usage');
export const getAiConversations = () => apiAuthGet('/user/ai/conversations');
export const createAiConversation = (data) => apiAuthPost('/user/ai/conversations', data);
export const getAiMessages = (conversationId) => apiAuthGet(`/user/ai/conversations/${conversationId}/messages`);
export const sendAiMessage = (data) => apiAuthPost('/user/ai/messages', data);
export const buyAiPack = (data) => apiAuthPost('/user/ai/packs/buy', data);
export const getAiPacks = () => apiAuthGet('/user/ai/packs');
