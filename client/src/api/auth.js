import { api } from './client';

const loginRequest = async (payload) => {
  const { data } = await api.post('/auth/login', payload);
  return data;
};

const createStaffAccountRequest = async (payload) => {
  const { data } = await api.post('/auth/staff', payload);
  return data;
};

const listStaffAccountsRequest = async () => {
  const { data } = await api.get('/auth/staff');
  return data;
};

const getStaffAccountDetailsRequest = async (staffId) => {
  const { data } = await api.get(`/auth/staff/${staffId}/details`);
  return data;
};

const forgotPasswordRequest = async (payload) => {
  const { data } = await api.post('/auth/forgot-password', payload);
  return data;
};

const resetPasswordRequest = async ({ token, password }) => {
  const { data } = await api.post(`/auth/reset-password/${token}`, { password });
  return data;
};

const getCurrentUserRequest = async () => {
  const { data } = await api.get('/auth/me');
  return data;
};

export {
  createStaffAccountRequest,
  forgotPasswordRequest,
  getStaffAccountDetailsRequest,
  getCurrentUserRequest,
  loginRequest,
  listStaffAccountsRequest,
  resetPasswordRequest,
};
