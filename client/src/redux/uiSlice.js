import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  sidebarOpen: true,
  themeMode: localStorage.getItem('erp_theme_mode') || 'light',
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar(state) {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen(state, action) {
      state.sidebarOpen = action.payload;
    },
    setThemeMode(state, action) {
      state.themeMode = action.payload;
      localStorage.setItem('erp_theme_mode', action.payload);
    },
  },
});

export const { toggleSidebar, setSidebarOpen, setThemeMode } = uiSlice.actions;
export default uiSlice.reducer;
