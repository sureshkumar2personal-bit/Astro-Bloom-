import { apiAuthPost, apiAuthGet } from './client';

export async function getWalletBalance() {
  return apiAuthGet('/user/wallet/balance');
}

export async function topUpWallet(amount) {
  return apiAuthPost('/user/wallet/topup', { amount });
}

export async function getTransactions() {
  return apiAuthGet('/user/wallet/transactions');
}

export async function getAstrologerWalletBalance() {
  return apiAuthGet('/astrologer/wallet/astrologer/balance');
}

export async function getAstrologerTransactions() {
  return apiAuthGet('/astrologer/wallet/astrologer/transactions');
}
