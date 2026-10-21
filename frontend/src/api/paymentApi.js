import { apiAuthGet, apiAuthPost } from './client';

export const getUserPayments = (status) => apiAuthGet(`/user/payments${status ? `?status=${status}` : ''}`);
export const getAstrologerPayments = () => apiAuthGet('/astrologer/payments');
export const getUserEscrow = () => apiAuthGet('/user/escrow');
export const getAstrologerEscrow = () => apiAuthGet('/astrologer/escrow');
export const getPaymentSummary = () => apiAuthGet('/user/payment-summary');
export const getEarningsSummary = () => apiAuthGet('/astrologer/earnings-summary');
export const getReceipt = (paymentId) => apiAuthGet(`/user/receipt/${paymentId}`);
