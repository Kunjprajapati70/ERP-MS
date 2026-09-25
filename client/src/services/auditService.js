import apiClient from './apiClient';

export async function fetchAuditLogs(params = {}) {
  const { data } = await apiClient.get('/audit-logs', { params });
  return data;
}
