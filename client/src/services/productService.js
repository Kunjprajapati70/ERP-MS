import apiClient from './apiClient';

export async function fetchProducts(params = {}) {
  const { data } = await apiClient.get('/products', { params });
  return data;
}

export async function fetchProduct(id) {
  const { data } = await apiClient.get(`/products/${id}`);
  return data;
}

export async function createProduct(payload) {
  const { data } = await apiClient.post('/products', payload);
  return data;
}

export async function updateProduct(id, payload) {
  const { data } = await apiClient.patch(`/products/${id}`, payload);
  return data;
}

export async function deleteProduct(id) {
  const { data } = await apiClient.delete(`/products/${id}`);
  return data;
}

export async function adjustStock(id, payload) {
  const { data } = await apiClient.post(`/products/${id}/adjust-stock`, payload);
  return data;
}

export async function fetchInventorySummary() {
  const { data } = await apiClient.get('/products/inventory/summary');
  return data;
}

export async function fetchStockLedger(params = {}) {
  const { data } = await apiClient.get('/products/inventory/ledger', { params });
  return data;
}

export async function fetchCategories(params = {}) {
  const { data } = await apiClient.get('/categories', { params });
  return data;
}

export async function createCategory(payload) {
  const { data } = await apiClient.post('/categories', payload);
  return data;
}

export async function updateCategory(id, payload) {
  const { data } = await apiClient.patch(`/categories/${id}`, payload);
  return data;
}

export async function deleteCategory(id) {
  const { data } = await apiClient.delete(`/categories/${id}`);
  return data;
}

export async function fetchWarehouses(params = {}) {
  const { data } = await apiClient.get('/warehouses', { params });
  return data;
}

export async function createWarehouse(payload) {
  const { data } = await apiClient.post('/warehouses', payload);
  return data;
}

export async function updateWarehouse(id, payload) {
  const { data } = await apiClient.patch(`/warehouses/${id}`, payload);
  return data;
}

export async function deleteWarehouse(id) {
  const { data } = await apiClient.delete(`/warehouses/${id}`);
  return data;
}
