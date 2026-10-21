import { apiAuthGet, apiAuthPost, apiAuthPut, apiAuthDelete } from './client';

export const getAstrologerSlots = () => apiAuthGet('/astrologer/slots');
export const createSlot = (data) => apiAuthPost('/astrologer/slots', data);
export const updateSlot = (slotId, data) => apiAuthPut(`/astrologer/slots/${slotId}`, data);
export const deleteSlot = (slotId) => apiAuthDelete(`/astrologer/slots/${slotId}`);
export const getAvailableSlots = (astrologerId, date) => apiAuthGet(`/user/available-slots/${astrologerId}?date=${date}`);
export const getUserAppointments = (status) => apiAuthGet(`/user/appointments${status ? `?status=${status}` : ''}`);
export const getAstrologerAppointments = (status) => apiAuthGet(`/astrologer/appointments${status ? `?status=${status}` : ''}`);
export const createAppointment = (data) => apiAuthPost('/user/appointments', data);
export const payAppointment = (appointmentId) => apiAuthPost(`/user/appointments/${appointmentId}/pay`);
export const cancelAppointment = (appointmentId, reason) => apiAuthPost(`/user/appointments/${appointmentId}/cancel`, { reason });
export const astrologerCancelAppointment = (appointmentId, reason) => apiAuthPost(`/astrologer/appointments/${appointmentId}/cancel`, { reason });
export const startCall = (appointmentId) => apiAuthPost(`/astrologer/appointments/${appointmentId}/start-call`);
export const endCall = (appointmentId) => apiAuthPost(`/astrologer/appointments/${appointmentId}/end-call`);
