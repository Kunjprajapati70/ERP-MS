import apiClient from './apiClient';

export async function fetchSalesOrders(params = {}) {
  const { data } = await apiClient.get('/sales-orders', { params });
  return data;
}

export async function fetchSalesOrder(id) {
  const { data } = await apiClient.get(`/sales-orders/${id}`);
  return data;
}

export async function createSalesOrder(payload) {
  const { data } = await apiClient.post('/sales-orders', payload);
  return data;
}

export async function updateSalesOrder(id, payload) {
  const { data } = await apiClient.patch(`/sales-orders/${id}`, payload);
  return data;
}

export async function transitionSalesOrder(id, status) {
  const { data } = await apiClient.post(`/sales-orders/${id}/status`, { status });
  return data;
}

export async function deleteSalesOrder(id) {
  const { data } = await apiClient.delete(`/sales-orders/${id}`);
  return data;
}

export async function fetchInvoices(params = {}) {
  const { data } = await apiClient.get('/invoices', { params });
  return data;
}

export async function fetchInvoice(id) {
  const { data } = await apiClient.get(`/invoices/${id}`);
  return data;
}

export async function createInvoiceFromSalesOrder(salesOrderId, payload = {}) {
  const { data } = await apiClient.post(`/invoices/from-sales-order/${salesOrderId}`, payload);
  return data;
}

export async function fetchPayments(params = {}) {
  const { data } = await apiClient.get('/payments', { params });
  return data;
}

export async function recordPayment(payload) {
  const { data } = await apiClient.post('/payments', payload);
  return data;
}
