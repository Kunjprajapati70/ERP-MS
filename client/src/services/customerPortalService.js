import apiClient from './apiClient';

export async function registerCustomerRequest(payload) {
  const { data } = await apiClient.post('/auth/customer/register', payload);
  return data;
}

export async function fetchCustomerProfile() {
  const { data } = await apiClient.get('/customer/profile');
  return data;
}

export async function updateCustomerProfile(payload) {
  const { data } = await apiClient.put('/customer/profile', payload);
  return data;
}

export async function fetchCustomerAddresses() {
  const { data } = await apiClient.get('/customer/addresses');
  return data;
}

export async function addCustomerAddress(payload) {
  const { data } = await apiClient.post('/customer/addresses', payload);
  return data;
}

export async function deleteCustomerAddress(id) {
  const { data } = await apiClient.delete(`/customer/addresses/${id}`);
  return data;
}

export async function fetchCustomerDashboard() {
  const { data } = await apiClient.get('/customer/dashboard');
  return data;
}

export async function fetchCustomerProducts(params) {
  const { data } = await apiClient.get('/customer/products', { params });
  return data;
}

export async function fetchCustomerProduct(id) {
  const { data } = await apiClient.get(`/customer/products/${id}`);
  return data;
}

export async function fetchCustomerOrders(params) {
  const { data } = await apiClient.get('/customer/orders', { params });
  return data;
}

export async function placeCustomerOrder(payload) {
  const { data } = await apiClient.post('/customer/orders', payload);
  return data;
}

export async function fetchCustomerOrder(id) {
  const { data } = await apiClient.get(`/customer/orders/${id}`);
  return data;
}

export async function fetchCustomerInvoices(params) {
  const { data } = await apiClient.get('/customer/invoices', { params });
  return data;
}

export async function fetchCustomerInvoice(id) {
  const { data } = await apiClient.get(`/customer/invoices/${id}`);
  return data;
}

export async function downloadCustomerInvoicePdf(id) {
  const response = await apiClient.get(`/customer/invoices/${id}/pdf`, {
    responseType: 'blob',
  });
  return response.data;
}

export async function fetchCustomerPayments(params) {
  const { data } = await apiClient.get('/customer/payments', { params });
  return data;
}

export async function fetchCustomerNotifications(params) {
  const { data } = await apiClient.get('/customer/notifications', { params });
  return data;
}

export async function fetchCustomerUnreadCount() {
  const { data } = await apiClient.get('/customer/notifications/unread-count');
  return data;
}

export async function markCustomerNotificationRead(id) {
  const { data } = await apiClient.patch(`/customer/notifications/${id}/read`);
  return data;
}

export async function markAllCustomerNotificationsRead() {
  const { data } = await apiClient.patch('/customer/notifications/read-all');
  return data;
}

export async function fetchCustomerSupport(params) {
  const { data } = await apiClient.get('/customer/support', { params });
  return data;
}

export async function fetchCustomerSupportTicket(id) {
  const { data } = await apiClient.get(`/customer/support/${id}`);
  return data;
}

export async function createCustomerSupport(payload) {
  const { data } = await apiClient.post('/customer/support', payload);
  return data;
}

export async function replyCustomerSupport(id, payload) {
  const { data } = await apiClient.post(`/customer/support/${id}/reply`, payload);
  return data;
}
