import { useMemo, useState } from 'react';
import { NavLink as RouterNavLink, useLocation } from 'react-router-dom';
import {
  Box,
  Divider,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined';
import SupportAgentOutlinedIcon from '@mui/icons-material/SupportAgentOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import { alpha } from '@mui/material/styles';

const NAV = [
  { label: 'Dashboard', to: '/customer/dashboard', icon: DashboardOutlinedIcon },
  { label: 'Products', to: '/customer/products', icon: Inventory2OutlinedIcon },
  { label: 'Cart', to: '/customer/cart', icon: ShoppingCartOutlinedIcon },
  { label: 'My Orders', to: '/customer/orders', icon: ShoppingBagOutlinedIcon },
  { label: 'My Invoices', to: '/customer/invoices', icon: ReceiptLongOutlinedIcon },
  { label: 'My Payments', to: '/customer/payments', icon: PaymentsOutlinedIcon },
  { label: 'Notifications', to: '/customer/notifications', icon: NotificationsNoneOutlinedIcon },
  { label: 'Support', to: '/customer/support', icon: SupportAgentOutlinedIcon },
  { label: 'Profile', to: '/customer/profile', icon: PersonOutlineIcon },
  { label: 'Settings', to: '/customer/settings', icon: SettingsOutlinedIcon },
];

export default function CustomerSidebarNav({ onNavigate }) {
  const location = useLocation();
  const [hovered, setHovered] = useState(null);

  const items = useMemo(() => NAV, []);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', py: 1 }}>
      <Box sx={{ px: 2.5, py: 2 }}>
        <Typography
          variant="overline"
          sx={{ letterSpacing: 1.5, color: alpha('#fff', 0.55), fontWeight: 700 }}
        >
          Customer Portal
        </Typography>
        <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, mt: 0.5 }}>
          My Account
        </Typography>
      </Box>
      <Divider sx={{ borderColor: alpha('#fff', 0.12), mx: 2, mb: 1 }} />
      <List sx={{ flex: 1, px: 1.25 }}>
        {items.map((item) => {
          const Icon = item.icon;
          const active =
            location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
          return (
            <ListItemButton
              key={item.to}
              component={RouterNavLink}
              to={item.to}
              onClick={onNavigate}
              onMouseEnter={() => setHovered(item.to)}
              onMouseLeave={() => setHovered(null)}
              sx={{
                mb: 0.5,
                borderRadius: 2,
                color: alpha('#fff', active || hovered === item.to ? 1 : 0.72),
                bgcolor: active ? alpha('#4FC3DC', 0.22) : 'transparent',
                '&:hover': { bgcolor: alpha('#4FC3DC', 0.14) },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>
                <Icon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{ fontSize: 14, fontWeight: active ? 700 : 500 }}
              />
            </ListItemButton>
          );
        })}
      </List>
    </Box>
  );
}
