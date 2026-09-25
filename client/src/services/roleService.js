import apiClient from './apiClient';

export async function fetchRoles(params = {}) {
  const { data } = await apiClient.get('/roles', { params });
  return data;
}

export async function fetchRole(id) {
  const { data } = await apiClient.get(`/roles/${id}`);
  return data;
}

export async function updateRole(id, payload) {
  const { data } = await apiClient.patch(`/roles/${id}`, payload);
  return data;
}

export async function fetchPermissionCatalog() {
  const { data } = await apiClient.get('/roles/permissions/catalog');
  return data;
}
