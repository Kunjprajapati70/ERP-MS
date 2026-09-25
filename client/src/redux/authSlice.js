import { createSlice } from '@reduxjs/toolkit';

export const TOKEN_STORAGE_KEY = 'erp_access_token';
export const USER_STORAGE_KEY = 'erp_auth_user';

function readStoredUser() {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function persistSession(token, user) {
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  }
  if (user) {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  }
}

function clearSessionStorage() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
}

const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
const storedUser = readStoredUser();

const initialState = {
  token: storedToken || null,
  user: storedUser,
  status: storedToken && storedUser ? 'authenticated' : storedToken ? 'loading' : 'anonymous',
  error: null,
  initialized: Boolean(!storedToken || storedUser),
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, action) {
      const { token: accessToken, user } = action.payload;
      state.token = accessToken;
      state.user = user;
      state.status = 'authenticated';
      state.error = null;
      state.initialized = true;
      persistSession(accessToken, user);
    },
    setUser(state, action) {
      state.user = action.payload;
      if (state.token) {
        persistSession(state.token, action.payload);
      }
      state.status = 'authenticated';
      state.initialized = true;
      state.error = null;
    },
    setAuthLoading(state) {
      if (state.user && state.token) {
        return;
      }
      state.status = 'loading';
      state.error = null;
    },
    setAuthError(state, action) {
      state.status = state.token && state.user ? 'authenticated' : 'error';
      state.error = action.payload;
      state.initialized = true;
    },
    clearAuth(state) {
      state.token = null;
      state.user = null;
      state.status = 'anonymous';
      state.error = null;
      state.initialized = true;
      clearSessionStorage();
    },
    markInitialized(state) {
      state.initialized = true;
      if (!state.token) {
        state.status = 'anonymous';
      } else if (state.user) {
        state.status = 'authenticated';
      }
    },
  },
});

export const {
  setCredentials,
  setUser,
  setAuthLoading,
  setAuthError,
  clearAuth,
  markInitialized,
} = authSlice.actions;

export default authSlice.reducer;
