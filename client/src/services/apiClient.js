import axios from 'axios';
import { toast } from 'react-toastify';
import { TOKEN_STORAGE_KEY, USER_STORAGE_KEY } from '../redux/authSlice';

const FATAL_AUTH_CODES = new Set([
  'TOKEN_EXPIRED',
  'INVALID_TOKEN',
  'USER_NOT_FOUND',
  'PASSWORD_CHANGED',
]);

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1',
  timeout: 45000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

function expireLocalSession() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config || {};

    if (!error.response) {
      const isMe = String(config.url || '').includes('/auth/me');
      if (isMe && !config.__retried) {
        config.__retried = true;
        await new Promise((resolve) => setTimeout(resolve, 800));
        return apiClient.request(config);
      }
      return Promise.reject({
        success: false,
        message: 'Unable to connect to the server. Please try again.',
        errorCode: 'NETWORK_ERROR',
        isNetworkError: true,
      });
    }

    const status = error.response.status;
    const data = error.response.data || {};
    const url = config.url || '';
    const isAuthEndpoint = /\/auth\/(login|register|forgot-password|reset-password|me)/.test(url);

    if (status === 401 && !isAuthEndpoint && FATAL_AUTH_CODES.has(data.errorCode)) {
      expireLocalSession();
      if (!window.location.pathname.startsWith('/login')) {
        toast.error(data.message || 'Session expired. Please sign in again.');
        window.location.assign('/login');
      }
    }

    return Promise.reject({
      success: false,
      message: data.message || 'Request failed',
      errorCode: data.errorCode || 'REQUEST_FAILED',
      status,
      details: data.details,
    });
  }
);

export default apiClient;
