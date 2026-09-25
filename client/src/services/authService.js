import apiClient from './apiClient';

export async function loginRequest(payload) {
  const { data } = await apiClient.post('/auth/login', payload);
  return data;
}

export async function registerRequest(payload) {
  const { data } = await apiClient.post('/auth/register', payload);
  return data;
}

export async function logoutRequest() {
  const { data } = await apiClient.post('/auth/logout');
  return data;
}

export async function fetchCurrentUser() {
  const { data } = await apiClient.get('/auth/me');
  return data;
}

export async function changePasswordRequest(payload) {
  const { data } = await apiClient.patch('/auth/change-password', payload);
  return data;
}

export async function forgotPasswordRequest(payload) {
  const { data } = await apiClient.post('/auth/forgot-password', payload);
  return data;
}

export async function resetPasswordRequest(payload) {
  const { data } = await apiClient.post('/auth/reset-password', payload);
  return data;
}
