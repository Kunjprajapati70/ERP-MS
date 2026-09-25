import apiClient from './apiClient';

export async function fetchEmployees(params = {}) {
  const { data } = await apiClient.get('/employees', { params });
  return data;
}
export async function createEmployee(payload) {
  const { data } = await apiClient.post('/employees', payload);
  return data;
}
export async function updateEmployee(id, payload) {
  const { data } = await apiClient.patch(`/employees/${id}`, payload);
  return data;
}
export async function deleteEmployee(id) {
  const { data } = await apiClient.delete(`/employees/${id}`);
  return data;
}

export async function fetchLeaveRequests(params = {}) {
  const { data } = await apiClient.get('/leave-requests', { params });
  return data;
}
export async function createLeaveRequest(payload) {
  const { data } = await apiClient.post('/leave-requests', payload);
  return data;
}
export async function reviewLeaveRequest(id, decision, reviewNotes = '') {
  const { data } = await apiClient.post(`/leave-requests/${id}/review`, { decision, reviewNotes });
  return data;
}
export async function cancelLeaveRequest(id) {
  const { data } = await apiClient.post(`/leave-requests/${id}/cancel`);
  return data;
}

export async function fetchBOMs(params = {}) {
  const { data } = await apiClient.get('/boms', { params });
  return data;
}
export async function createBOM(payload) {
  const { data } = await apiClient.post('/boms', payload);
  return data;
}
export async function updateBOM(id, payload) {
  const { data } = await apiClient.patch(`/boms/${id}`, payload);
  return data;
}
export async function deleteBOM(id) {
  const { data } = await apiClient.delete(`/boms/${id}`);
  return data;
}

export async function fetchWorkOrders(params = {}) {
  const { data } = await apiClient.get('/work-orders', { params });
  return data;
}
export async function createWorkOrder(payload) {
  const { data } = await apiClient.post('/work-orders', payload);
  return data;
}
export async function transitionWorkOrder(id, status) {
  const { data } = await apiClient.post(`/work-orders/${id}/status`, { status });
  return data;
}
export async function deleteWorkOrder(id) {
  const { data } = await apiClient.delete(`/work-orders/${id}`);
  return data;
}

export async function fetchAttendance(params = {}) {
  const { data } = await apiClient.get('/attendance', { params });
  return data;
}
export async function markAttendance(payload) {
  const { data } = await apiClient.post('/attendance', payload);
  return data;
}
export async function checkOutAttendance(id, payload = {}) {
  const { data } = await apiClient.post(`/attendance/${id}/checkout`, payload);
  return data;
}
export async function fetchMyTodayAttendance() {
  const { data } = await apiClient.get('/attendance/my-today');
  return data;
}
export async function myCheckInAttendance(payload = {}) {
  const { data } = await apiClient.post('/attendance/my-check-in', payload);
  return data;
}
export async function myCheckOutAttendance(payload = {}) {
  const { data } = await apiClient.post('/attendance/my-check-out', payload);
  return data;
}
export async function fetchMyAttendanceHistory(params = {}) {
  const { data } = await apiClient.get('/attendance/my-history', { params });
  return data;
}

export async function fetchPayrollRuns(params = {}) {
  const { data } = await apiClient.get('/payroll', { params });
  return data;
}
export async function fetchPayrollRun(id) {
  const { data } = await apiClient.get(`/payroll/${id}`);
  return data;
}
export async function createPayrollRun(payload) {
  const { data } = await apiClient.post('/payroll', payload);
  return data;
}
export async function transitionPayroll(id, status) {
  const { data } = await apiClient.post(`/payroll/${id}/status`, { status });
  return data;
}

export async function fetchQCInspections(params = {}) {
  const { data } = await apiClient.get('/qc-inspections', { params });
  return data;
}
export async function createQCInspection(payload) {
  const { data } = await apiClient.post('/qc-inspections', payload);
  return data;
}
export async function completeQCInspection(id, payload) {
  const { data } = await apiClient.post(`/qc-inspections/${id}/complete`, payload);
  return data;
}
