import { createContext, useContext, useMemo } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { useDispatch, useSelector } from 'react-redux';
import { createAppTheme } from './createAppTheme';
import { setThemeMode } from '../redux/uiSlice';

const ThemeModeContext = createContext({
  mode: 'light',
  toggleColorMode: () => {},
});

export function ThemeModeProvider({ children }) {
  const dispatch = useDispatch();
  const mode = useSelector((state) => state.ui.themeMode);

  const value = useMemo(
    () => ({
      mode,
      toggleColorMode: () => {
        dispatch(setThemeMode(mode === 'light' ? 'dark' : 'light'));
      },
    }),
    [dispatch, mode]
  );

  const theme = useMemo(() => createAppTheme(mode), [mode]);

  return (
    <ThemeModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </ThemeModeContext.Provider>
  );
}

export function useThemeMode() {
  return useContext(ThemeModeContext);
}
