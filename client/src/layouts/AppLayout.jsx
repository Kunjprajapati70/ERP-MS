import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Avatar,
  Box,
  Chip,
  Divider,
  Drawer,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  Stack,
  Toolbar,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import LogoutIcon from '@mui/icons-material/Logout';
import LockResetIcon from '@mui/icons-material/LockReset';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import SidebarNav from './SidebarNav';
import { setSidebarOpen } from '../redux/uiSlice';
import { clearAuth } from '../redux/authSlice';
import { useThemeMode } from '../theme/ThemeModeProvider';
import { logoutRequest } from '../services/authService';
import NotificationBell from '../components/NotificationBell';
import AttendancePunchWidget from '../components/AttendancePunchWidget';
import { isAttendanceEligible } from '../utils/permissions';

const DRAWER_WIDTH = 280;

export default function AppLayout() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const sidebarOpen = useSelector((state) => state.ui.sidebarOpen);
  const user = useSelector((state) => state.auth.user);
  const { mode, toggleColorMode } = useThemeMode();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);

  const appName = import.meta.env.VITE_APP_NAME || 'Enterprise ERP';
  const displayName = user ? `${user.firstName} ${user.lastName}` : 'User';
  const roleName = user?.role?.displayName || user?.role?.name || '';
  const showAttendancePunch = isAttendanceEligible(user);

  const handleDrawerToggle = () => {
    if (isMobile) {
      setMobileOpen((prev) => !prev);
    } else {
      dispatch(setSidebarOpen(!sidebarOpen));
    }
  };

  const handleLogout = async () => {
    setAnchorEl(null);
    try {
      await logoutRequest();
    } catch (_) {
      // Still clear local session if API logout fails
    }
    dispatch(clearAuth());
    toast.info('Signed out');
    navigate('/login', { replace: true });
  };

  const drawerContent = <SidebarNav onNavigate={() => isMobile && setMobileOpen(false)} />;
  const desktopSidebar = !isMobile && sidebarOpen;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        color="inherit"
        elevation={0}
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          width: {
            md: desktopSidebar ? `calc(100% - ${DRAWER_WIDTH}px)` : '100%',
          },
          ml: { md: desktopSidebar ? `${DRAWER_WIDTH}px` : 0 },
          transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        }}
      >
        <Toolbar sx={{ gap: 0.5, px: { xs: 1.5, sm: 2 } }}>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            aria-label="Toggle navigation"
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography
              variant="h6"
              noWrap
              sx={{
                fontWeight: 700,
                fontSize: { xs: '1rem', sm: '1.15rem' },
              }}
            >
              {appName}
            </Typography>
            {roleName && (
              <Typography
                variant="caption"
                color="text.secondary"
                noWrap
                sx={{ display: { xs: 'none', sm: 'block' } }}
              >
                {roleName}
              </Typography>
            )}
          </Box>
          <IconButton onClick={toggleColorMode} aria-label="Toggle color mode" color="inherit">
            {mode === 'light' ? <DarkModeOutlinedIcon /> : <LightModeOutlinedIcon />}
          </IconButton>
          {showAttendancePunch ? <AttendancePunchWidget /> : null}
          <NotificationBell />
          <IconButton
            onClick={(e) => setAnchorEl(e.currentTarget)}
            aria-label="Open profile menu"
            sx={{ ml: 0.25 }}
          >
            <Avatar
              sx={{
                width: 36,
                height: 36,
                fontSize: 13,
                fontWeight: 700,
                bgcolor: 'primary.main',
                backgroundImage: (t) =>
                  `linear-gradient(135deg, ${t.palette.primary.main}, ${t.palette.info.main})`,
              }}
            >
              {displayName
                .split(' ')
                .map((p) => p[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()}
            </Avatar>
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            slotProps={{ paper: { sx: { minWidth: 220, mt: 1, borderRadius: 2 } } }}
          >
            <MenuItem disabled sx={{ opacity: '1 !important' }}>
              <ListItemIcon>
                <PersonOutlineIcon fontSize="small" />
              </ListItemIcon>
              <Box>
                <Typography variant="body2" fontWeight={700}>
                  {displayName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {roleName}
                </Typography>
              </Box>
            </MenuItem>
            <Divider />
            <MenuItem
              onClick={() => {
                setAnchorEl(null);
                navigate('/account/change-password');
              }}
            >
              <ListItemIcon>
                <LockResetIcon fontSize="small" />
              </ListItemIcon>
              Change password
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              Sign out
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{
          width: { md: desktopSidebar ? DRAWER_WIDTH : 0 },
          flexShrink: { md: 0 },
          transition: theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
              maxWidth: '86vw',
            },
          }}
        >
          {drawerContent}
        </Drawer>
        <Drawer
          variant="persistent"
          open={desktopSidebar}
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
            },
          }}
        >
          {drawerContent}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: desktopSidebar ? `calc(100% - ${DRAWER_WIDTH}px)` : '100%' },
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Toolbar />
        <Box
          sx={{
            flex: 1,
            p: { xs: 1.5, sm: 2, md: 3 },
            pb: { xs: 3, md: 4 },
            maxWidth: '100%',
          }}
        >
          <Box
            sx={{
              maxWidth: 1400,
              mx: 'auto',
              width: '100%',
            }}
          >
            <Outlet />
          </Box>
        </Box>
        <Box
          component="footer"
          sx={{
            px: { xs: 2, md: 3 },
            py: 1.5,
            borderTop: 1,
            borderColor: 'divider',
            bgcolor: (t) => alpha(t.palette.background.paper, 0.6),
          }}
        >
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            justifyContent="space-between"
            spacing={0.5}
            alignItems={{ xs: 'flex-start', sm: 'center' }}
          >
            <Typography variant="caption" color="text.secondary">
              {appName} · Operations workspace
            </Typography>
            <Chip size="small" label="Phases 0–8" variant="outlined" color="primary" />
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}
