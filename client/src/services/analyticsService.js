import apiClient from './apiClient';

export async function fetchDashboardOverview() {
  const { data } = await apiClient.get('/dashboard/overview');
  return data;
}

export async function fetchSalesTrend(days = 14) {
  const { data } = await apiClient.get('/dashboard/sales-trend', { params: { days } });
  return data;
}

export async function fetchSalesReport(params = {}) {
  const { data } = await apiClient.get('/reports/sales', { params });
  return data;
}

export async function fetchReceivablesReport() {
  const { data } = await apiClient.get('/reports/receivables');
  return data;
}

export async function fetchInventoryReport() {
  const { data } = await apiClient.get('/reports/inventory');
  return data;
}

export async function fetchPaymentsReport(params = {}) {
  const { data } = await apiClient.get('/reports/payments', { params });
  return data;
}

export async function fetchLeads(params = {}) {
  const { data } = await apiClient.get('/leads', { params });
  return data;
}

export async function createLead(payload) {
  const { data } = await apiClient.post('/leads', payload);
  return data;
}

export async function updateLead(id, payload) {
  const { data } = await apiClient.patch(`/leads/${id}`, payload);
  return data;
}

export async function convertLead(id, payload = {}) {
  const { data } = await apiClient.post(`/leads/${id}/convert`, payload);
  return data;
}

export async function deleteLead(id) {
  const { data } = await apiClient.delete(`/leads/${id}`);
  return data;
}
