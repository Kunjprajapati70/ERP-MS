import apiClient from './apiClient';

export async function fetchUsers(params = {}) {
  const { data } = await apiClient.get('/users', { params });
  return data;
}

export async function fetchUser(id) {
  const { data } = await apiClient.get(`/users/${id}`);
  return data;
}

export async function createUser(payload) {
  const { data } = await apiClient.post('/users', payload);
  return data;
}

export async function updateUser(id, payload) {
  const { data } = await apiClient.patch(`/users/${id}`, payload);
  return data;
}

export async function deleteUser(id) {
  const { data } = await apiClient.delete(`/users/${id}`);
  return data;
}
