import { alpha, createTheme } from '@mui/material/styles';

const fontBody = '"Manrope", "Segoe UI", sans-serif';
const fontDisplay = '"Sora", "Manrope", sans-serif';

export function createAppTheme(mode = 'light') {
  const isLight = mode === 'light';

  const primaryMain = isLight ? '#0B4F6C' : '#4FC3DC';
  const secondaryMain = isLight ? '#E07A3D' : '#F0A06A';
  const bgDefault = isLight ? '#E8F1F5' : '#06141C';
  const bgPaper = isLight ? '#FFFFFF' : '#0D1F2A';
  const textPrimary = isLight ? '#0A2540' : '#E8F4F8';
  const textSecondary = isLight ? '#4A6578' : '#9BB4C2';
  const divider = isLight ? '#C5D8E2' : '#1E3A48';

  return createTheme({
    palette: {
      mode,
      primary: {
        main: primaryMain,
        light: isLight ? '#1A6F8F' : '#7DD6E8',
        dark: isLight ? '#073A50' : '#2A9BB5',
        contrastText: '#FFFFFF',
      },
      secondary: {
        main: secondaryMain,
        contrastText: '#FFFFFF',
      },
      background: {
        default: bgDefault,
        paper: bgPaper,
      },
      text: {
        primary: textPrimary,
        secondary: textSecondary,
      },
      divider,
      success: { main: isLight ? '#1B7A4E' : '#4ADE80' },
      warning: { main: isLight ? '#C47A12' : '#FBBF24' },
      error: { main: isLight ? '#C0352B' : '#F87171' },
      info: { main: isLight ? '#0E7C9B' : '#38BDF8' },
      action: {
        hover: alpha(primaryMain, isLight ? 0.06 : 0.12),
        selected: alpha(primaryMain, isLight ? 0.1 : 0.18),
      },
    },
    typography: {
      fontFamily: fontBody,
      h1: { fontFamily: fontDisplay, fontWeight: 700, letterSpacing: '-0.03em' },
      h2: { fontFamily: fontDisplay, fontWeight: 700, letterSpacing: '-0.03em' },
      h3: { fontFamily: fontDisplay, fontWeight: 650, letterSpacing: '-0.02em' },
      h4: { fontFamily: fontDisplay, fontWeight: 650, letterSpacing: '-0.02em', fontSize: '1.65rem' },
      h5: { fontFamily: fontDisplay, fontWeight: 600, letterSpacing: '-0.015em' },
      h6: { fontFamily: fontDisplay, fontWeight: 600 },
      overline: {
        fontFamily: fontDisplay,
        fontWeight: 600,
        letterSpacing: '0.12em',
        fontSize: '0.7rem',
      },
      button: {
        fontFamily: fontDisplay,
        textTransform: 'none',
        fontWeight: 650,
        letterSpacing: '0.01em',
      },
      subtitle1: { fontWeight: 600 },
      body1: { lineHeight: 1.6 },
      body2: { lineHeight: 1.55 },
    },
    shape: { borderRadius: 12 },
    breakpoints: {
      values: { xs: 0, sm: 600, md: 900, lg: 1200, xl: 1536 },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundImage: isLight
              ? `radial-gradient(ellipse 900px 480px at 0% -10%, ${alpha('#4FC3DC', 0.22)}, transparent 55%),
                 radial-gradient(ellipse 700px 420px at 100% 0%, ${alpha('#0B4F6C', 0.1)}, transparent 50%),
                 radial-gradient(ellipse 600px 400px at 80% 100%, ${alpha('#E07A3D', 0.08)}, transparent 45%)`
              : `radial-gradient(ellipse 800px 500px at 10% -5%, ${alpha('#4FC3DC', 0.12)}, transparent 50%),
                 radial-gradient(ellipse 600px 400px at 100% 20%, ${alpha('#0B4F6C', 0.35)}, transparent 55%)`,
            backgroundAttachment: 'fixed',
          },
          '*::-webkit-scrollbar': { width: 8, height: 8 },
          '*::-webkit-scrollbar-thumb': {
            backgroundColor: alpha(textSecondary, 0.35),
            borderRadius: 8,
          },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            borderRadius: 10,
            paddingInline: 16,
            minHeight: 40,
          },
          containedPrimary: {
            backgroundImage: isLight
              ? `linear-gradient(135deg, #0B4F6C 0%, #0E7C9B 100%)`
              : `linear-gradient(135deg, #2A9BB5 0%, #4FC3DC 100%)`,
            '&:hover': {
              backgroundImage: isLight
                ? `linear-gradient(135deg, #073A50 0%, #0B4F6C 100%)`
                : `linear-gradient(135deg, #4FC3DC 0%, #7DD6E8 100%)`,
            },
          },
          sizeSmall: { minHeight: 32, paddingInline: 12 },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
          outlined: {
            borderColor: divider,
            boxShadow: isLight ? `0 1px 2px ${alpha('#0A2540', 0.04)}` : 'none',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 14,
            border: `1px solid ${divider}`,
            boxShadow: isLight
              ? `0 8px 24px ${alpha('#0B4F6C', 0.06)}`
              : `0 8px 24px ${alpha('#000', 0.35)}`,
            backgroundImage: isLight
              ? `linear-gradient(180deg, ${alpha('#FFFFFF', 0.95)} 0%, ${alpha('#F7FBFD', 0.98)} 100%)`
              : 'none',
            transition: 'transform 180ms ease, box-shadow 180ms ease',
            '&:hover': {
              transform: 'translateY(-1px)',
              boxShadow: isLight
                ? `0 12px 28px ${alpha('#0B4F6C', 0.1)}`
                : `0 12px 28px ${alpha('#000', 0.45)}`,
            },
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backdropFilter: 'blur(12px)',
            backgroundColor: isLight ? alpha('#FFFFFF', 0.82) : alpha('#0D1F2A', 0.85),
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundImage: isLight
              ? `linear-gradient(180deg, #0B4F6C 0%, #0A3D54 48%, #083246 100%)`
              : `linear-gradient(180deg, #0A2430 0%, #06141C 100%)`,
            color: '#E8F4F8',
            borderRight: 'none',
          },
        },
      },
      MuiInputLabel: {
        defaultProps: {
          shrink: true,
        },
        styleOverrides: {
          root: {
            fontSize: '0.88rem',
            fontWeight: 500,
          },
        },
      },
      MuiTextField: {
        defaultProps: {
          size: 'small',
          InputLabelProps: {
            shrink: true,
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            backgroundColor: isLight ? alpha('#FFFFFF', 0.7) : alpha('#06141C', 0.4),
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { fontWeight: 600, borderRadius: 8 },
        },
      },
      MuiTableHead: {
        styleOverrides: {
          root: {
            '& .MuiTableCell-head': {
              backgroundColor: isLight ? alpha('#0B4F6C', 0.06) : alpha('#4FC3DC', 0.08),
              color: textPrimary,
              fontFamily: fontDisplay,
              fontWeight: 650,
              whiteSpace: 'nowrap',
            },
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderColor: divider,
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 16,
            margin: 16,
            width: '100%',
          },
        },
      },
      MuiContainer: {
        defaultProps: {
          maxWidth: 'xl',
        },
      },
    },
  });
}
