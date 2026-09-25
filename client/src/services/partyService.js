import apiClient from './apiClient';

export async function fetchCustomers(params = {}) {
  const { data } = await apiClient.get('/customers', { params });
  return data;
}
export async function createCustomer(payload) {
  const { data } = await apiClient.post('/customers', payload);
  return data;
}
export async function updateCustomer(id, payload) {
  const { data } = await apiClient.patch(`/customers/${id}`, payload);
  return data;
}
export async function deleteCustomer(id) {
  const { data } = await apiClient.delete(`/customers/${id}`);
  return data;
}

export async function fetchSuppliers(params = {}) {
  const { data } = await apiClient.get('/suppliers', { params });
  return data;
}
export async function createSupplier(payload) {
  const { data } = await apiClient.post('/suppliers', payload);
  return data;
}
export async function updateSupplier(id, payload) {
  const { data } = await apiClient.patch(`/suppliers/${id}`, payload);
  return data;
}
export async function deleteSupplier(id) {
  const { data } = await apiClient.delete(`/suppliers/${id}`);
  return data;
}

export async function fetchPurchaseOrders(params = {}) {
  const { data } = await apiClient.get('/purchase-orders', { params });
  return data;
}
export async function fetchPurchaseOrder(id) {
  const { data } = await apiClient.get(`/purchase-orders/${id}`);
  return data;
}
export async function createPurchaseOrder(payload) {
  const { data } = await apiClient.post('/purchase-orders', payload);
  return data;
}
export async function updatePurchaseOrder(id, payload) {
  const { data } = await apiClient.patch(`/purchase-orders/${id}`, payload);
  return data;
}
export async function transitionPurchaseOrder(id, status) {
  const { data } = await apiClient.post(`/purchase-orders/${id}/status`, { status });
  return data;
}
export async function deletePurchaseOrder(id) {
  const { data } = await apiClient.delete(`/purchase-orders/${id}`);
  return data;
}

export async function fetchGRNs(params = {}) {
  const { data } = await apiClient.get('/grns', { params });
  return data;
}
export async function createGRN(payload) {
  const { data } = await apiClient.post('/grns', payload);
  return data;
}
export async function confirmGRN(id) {
  const { data } = await apiClient.post(`/grns/${id}/confirm`);
  return data;
}
export async function cancelGRN(id) {
  const { data } = await apiClient.post(`/grns/${id}/cancel`);
  return data;
}
