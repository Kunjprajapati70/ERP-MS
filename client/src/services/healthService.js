import apiClient from './apiClient';

export async function fetchHealth() {
  const { data } = await apiClient.get('/health');
  return data;
}
