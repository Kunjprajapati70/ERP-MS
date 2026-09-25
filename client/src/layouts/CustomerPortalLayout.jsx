import { useCallback, useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Avatar,
  Badge,
  Box,
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
import { useTheme } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import LogoutIcon from '@mui/icons-material/Logout';
import LockResetIcon from '@mui/icons-material/LockReset';
import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import CustomerSidebarNav from './CustomerSidebarNav';
import { clearAuth } from '../redux/authSlice';
import { useThemeMode } from '../theme/ThemeModeProvider';
import { logoutRequest } from '../services/authService';
import { fetchCustomerUnreadCount } from '../services/customerPortalService';
import { CustomerCartProvider, useCustomerCart } from '../context/CustomerCartContext';

const DRAWER_WIDTH = 268;

function CustomerPortalShell() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const { mode, toggleColorMode } = useThemeMode();
  const { count: cartCount } = useCustomerCart();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [unread, setUnread] = useState(0);

  const displayName = user ? `${user.firstName} ${user.lastName}` : 'Customer';

  const loadUnread = useCallback(async () => {
    try {
      const res = await fetchCustomerUnreadCount();
      setUnread(res.data?.count || 0);
    } catch {
      /* non-blocking */
    }
  }, []);

  useEffect(() => {
    loadUnread();
    const id = setInterval(loadUnread, 60000);
    return () => clearInterval(id);
  }, [loadUnread]);

  const handleLogout = async () => {
    try {
      await logoutRequest();
    } catch {
      /* ignore */
    }
    dispatch(clearAuth());
    toast.info('Signed out');
    navigate('/login', { replace: true });
  };

  const drawer = (
    <Box
      sx={{
        height: '100%',
        background: (t) =>
          t.palette.mode === 'light'
            ? 'linear-gradient(180deg, #0A3A52 0%, #0B4F6C 55%, #0E5F7A 100%)'
            : 'linear-gradient(180deg, #06141C 0%, #0A2430 100%)',
      }}
    >
      <CustomerSidebarNav onNavigate={() => setMobileOpen(false)} />
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
          bgcolor: 'background.paper',
          color: 'text.primary',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Toolbar sx={{ gap: 1 }}>
          {isMobile && (
            <IconButton edge="start" onClick={() => setMobileOpen(true)} aria-label="Open menu">
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700, fontSize: { xs: '1rem', sm: '1.15rem' } }}>
            Customer Portal
          </Typography>
          <IconButton onClick={toggleColorMode} aria-label="Toggle theme">
            {mode === 'light' ? <DarkModeOutlinedIcon /> : <LightModeOutlinedIcon />}
          </IconButton>
          <IconButton onClick={() => navigate('/customer/cart')} aria-label="Cart">
            <Badge badgeContent={cartCount} color="secondary" max={99}>
              <ShoppingCartOutlinedIcon />
            </Badge>
          </IconButton>
          <IconButton onClick={() => navigate('/customer/notifications')} aria-label="Notifications">
            <Badge badgeContent={unread} color="error" max={99}>
              <NotificationsNoneOutlinedIcon />
            </Badge>
          </IconButton>
          <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} aria-label="Account menu">
            <Avatar sx={{ width: 34, height: 34, bgcolor: 'primary.main', fontSize: 14 }}>
              {displayName.charAt(0)}
            </Avatar>
          </IconButton>
          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
            <Box sx={{ px: 2, py: 1.5, minWidth: 200 }}>
              <Typography fontWeight={700}>{displayName}</Typography>
              <Typography variant="body2" color="text.secondary">
                {user?.email}
              </Typography>
            </Box>
            <MenuItem
              onClick={() => {
                setAnchorEl(null);
                navigate('/customer/profile');
              }}
            >
              Profile
            </MenuItem>
            <MenuItem
              onClick={() => {
                setAnchorEl(null);
                navigate('/customer/settings');
              }}
            >
              <ListItemIcon>
                <LockResetIcon fontSize="small" />
              </ListItemIcon>
              Settings
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

      <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box', border: 0 },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          open
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box', border: 0 },
          }}
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          minWidth: 0,
          pt: { xs: 8, sm: 9 },
          px: { xs: 1.5, sm: 2.5, md: 3 },
          pb: 4,
        }}
      >
        <Stack spacing={0}>
          <Outlet context={{ refreshUnread: loadUnread }} />
        </Stack>
      </Box>
    </Box>
  );
}

export default function CustomerPortalLayout() {
  return (
    <CustomerCartProvider>
      <CustomerPortalShell />
    </CustomerCartProvider>
  );
}
