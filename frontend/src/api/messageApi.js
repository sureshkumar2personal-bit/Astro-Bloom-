import { apiAuthGet, apiAuthPost, apiAuthDelete } from './client';

export const getUserConversations = () => apiAuthGet('/user/conversations');
export const getAstrologerConversations = () => apiAuthGet('/astrologer/conversations');
export const getUserMessages = (conversationId, before) => apiAuthGet(`/user/conversations/${conversationId}/messages${before ? `?before=${before}` : ''}`);
export const getAstrologerMessages = (conversationId, before) => apiAuthGet(`/astrologer/conversations/${conversationId}/messages${before ? `?before=${before}` : ''}`);
export const sendUserMessage = (conversationId, data) => apiAuthPost(`/user/conversations/${conversationId}/messages`, data);
export const sendAstrologerMessage = (conversationId, data) => apiAuthPost(`/astrologer/conversations/${conversationId}/messages`, data);
export const startConversation = (astrologerId) => apiAuthPost('/user/start-conversation', { astrologerId });
export const markUserConversationRead = (conversationId) => apiAuthPost(`/user/conversations/${conversationId}/read`);
export const markAstrologerConversationRead = (conversationId) => apiAuthPost(`/astrologer/conversations/${conversationId}/read`);
export const deleteUserMessage = (conversationId, messageId) => apiAuthDelete(`/user/conversations/${conversationId}/messages/${messageId}`);
export const deleteAstrologerMessage = (conversationId, messageId) => apiAuthDelete(`/astrologer/conversations/${conversationId}/messages/${messageId}`);
