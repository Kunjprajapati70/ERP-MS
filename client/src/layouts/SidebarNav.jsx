import {
  Box,
  Chip,
  Divider,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Typography,
} from '@mui/material';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import MonitorHeartOutlinedIcon from '@mui/icons-material/MonitorHeartOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import WarehouseOutlinedIcon from '@mui/icons-material/WarehouseOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import AssignmentReturnedOutlinedIcon from '@mui/icons-material/AssignmentReturnedOutlined';
import PointOfSaleOutlinedIcon from '@mui/icons-material/PointOfSaleOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import HandshakeOutlinedIcon from '@mui/icons-material/HandshakeOutlined';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import HowToRegOutlinedIcon from '@mui/icons-material/HowToRegOutlined';
import RequestQuoteOutlinedIcon from '@mui/icons-material/RequestQuoteOutlined';
import VerifiedOutlinedIcon from '@mui/icons-material/VerifiedOutlined';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import PrecisionManufacturingOutlinedIcon from '@mui/icons-material/PrecisionManufacturingOutlined';
import LockResetIcon from '@mui/icons-material/LockReset';
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import { NavLink } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { hasPermission } from '../utils/permissions';

function canAccess(user, permissions = []) {
  if (!permissions.length) return true;
  return permissions.every((p) => hasPermission(user, p));
}

const navSections = [
  {
    label: 'Overview',
    items: [
      { label: 'System Status', to: '/', icon: <MonitorHeartOutlinedIcon fontSize="small" /> },
      {
        label: 'Dashboard',
        to: '/dashboard',
        icon: <DashboardOutlinedIcon fontSize="small" />,
        permissions: ['dashboard:read'],
      },
      {
        label: 'Reports',
        to: '/reports',
        icon: <AssessmentOutlinedIcon fontSize="small" />,
        permissions: ['reports:read'],
      },
    ],
  },
  {
    label: 'Operations',
    items: [
      {
        label: 'Products',
        to: '/operations/products',
        icon: <Inventory2OutlinedIcon fontSize="small" />,
        permissions: ['products:read'],
      },
      {
        label: 'Categories',
        to: '/operations/categories',
        icon: <CategoryOutlinedIcon fontSize="small" />,
        permissions: ['products:read'],
      },
      {
        label: 'Warehouses',
        to: '/operations/warehouses',
        icon: <WarehouseOutlinedIcon fontSize="small" />,
        permissions: ['inventory:read'],
      },
      {
        label: 'Inventory',
        to: '/operations/inventory',
        icon: <FactCheckOutlinedIcon fontSize="small" />,
        permissions: ['inventory:read'],
      },
      {
        label: 'Customers',
        to: '/operations/customers',
        icon: <PeopleAltOutlinedIcon fontSize="small" />,
        permissions: ['customers:read'],
      },
      {
        label: 'Suppliers',
        to: '/operations/suppliers',
        icon: <LocalShippingOutlinedIcon fontSize="small" />,
        permissions: ['suppliers:read'],
      },
      {
        label: 'Purchase Orders',
        to: '/operations/purchase-orders',
        icon: <ShoppingCartOutlinedIcon fontSize="small" />,
        permissions: ['purchases:read'],
      },
      {
        label: 'GRN',
        to: '/operations/grn',
        icon: <AssignmentReturnedOutlinedIcon fontSize="small" />,
        permissions: ['grn:read'],
      },
      {
        label: 'Sales Orders',
        to: '/operations/sales-orders',
        icon: <PointOfSaleOutlinedIcon fontSize="small" />,
        permissions: ['sales:read'],
      },
      {
        label: 'Invoices',
        to: '/operations/invoices',
        icon: <ReceiptLongOutlinedIcon fontSize="small" />,
        permissions: ['invoices:read'],
      },
      {
        label: 'Payments',
        to: '/operations/payments',
        icon: <PaymentsOutlinedIcon fontSize="small" />,
        permissions: ['payments:read'],
      },
      {
        label: 'CRM Leads',
        to: '/operations/leads',
        icon: <HandshakeOutlinedIcon fontSize="small" />,
        permissions: ['crm:read'],
      },
    ],
  },
  {
    label: 'HR',
    items: [
      {
        label: 'Employees',
        to: '/hr/employees',
        icon: <BadgeOutlinedIcon fontSize="small" />,
        permissions: ['hr:read'],
      },
      {
        label: 'Leave',
        to: '/hr/leave',
        icon: <EventAvailableOutlinedIcon fontSize="small" />,
        permissions: ['leave:read'],
      },
      {
        label: 'My Attendance',
        to: '/hr/my-attendance',
        icon: <HowToRegOutlinedIcon fontSize="small" />,
        permissions: ['attendance:self'],
      },
      {
        label: 'Attendance',
        to: '/hr/attendance',
        icon: <HowToRegOutlinedIcon fontSize="small" />,
        permissions: ['attendance:read'],
      },
      {
        label: 'Payroll',
        to: '/hr/payroll',
        icon: <RequestQuoteOutlinedIcon fontSize="small" />,
        permissions: ['payroll:read'],
      },
    ],
  },
  {
    label: 'Manufacturing',
    items: [
      {
        label: 'BOMs',
        to: '/manufacturing/boms',
        icon: <AccountTreeOutlinedIcon fontSize="small" />,
        permissions: ['manufacturing:read'],
      },
      {
        label: 'Work Orders',
        to: '/manufacturing/work-orders',
        icon: <PrecisionManufacturingOutlinedIcon fontSize="small" />,
        permissions: ['manufacturing:read'],
      },
      {
        label: 'QC',
        to: '/manufacturing/qc',
        icon: <VerifiedOutlinedIcon fontSize="small" />,
        permissions: ['qc:read'],
      },
    ],
  },
  {
    label: 'Account',
    items: [
      {
        label: 'Change password',
        to: '/account/change-password',
        icon: <LockResetIcon fontSize="small" />,
      },
    ],
  },
  {
    label: 'System',
    items: [
      {
        label: 'Users',
        to: '/system/users',
        icon: <PeopleOutlineIcon fontSize="small" />,
        permissions: ['users:read'],
      },
      {
        label: 'Roles & Permissions',
        to: '/system/roles',
        icon: <AdminPanelSettingsOutlinedIcon fontSize="small" />,
        permissions: ['roles:read'],
      },
      {
        label: 'Audit Logs',
        to: '/system/audit-logs',
        icon: <HistoryOutlinedIcon fontSize="small" />,
        permissions: ['audit:read'],
      },
    ],
  },
];

export default function SidebarNav({ onNavigate }) {
  const user = useSelector((state) => state.auth.user);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', color: 'inherit' }}>
      <Box
        sx={{
          px: 2.5,
          py: 2.75,
          background:
            'linear-gradient(135deg, rgba(79,195,220,0.18) 0%, rgba(255,255,255,0.04) 55%, transparent 100%)',
        }}
      >
        <Typography
          variant="overline"
          sx={{ color: 'rgba(232,244,248,0.65)', letterSpacing: 1.6 }}
        >
          Harbor ERP
        </Typography>
        <Typography
          variant="h5"
          sx={{
            fontWeight: 700,
            color: '#FFFFFF',
            letterSpacing: '-0.02em',
            mt: 0.25,
          }}
        >
          Control Center
        </Typography>
        {user?.role?.name && (
          <Chip
            size="small"
            label={user.role.displayName || user.role.name}
            sx={{
              mt: 1.25,
              bgcolor: 'rgba(79,195,220,0.18)',
              color: '#E8F4F8',
              borderColor: 'rgba(79,195,220,0.45)',
              fontWeight: 600,
            }}
            variant="outlined"
          />
        )}
      </Box>
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
      <Box sx={{ flex: 1, overflowY: 'auto', py: 1.25, px: 0.5 }}>
        {navSections.map((section) => {
          const visibleItems = section.items.filter(
            (item) => item.disabled || canAccess(user, item.permissions)
          );
          if (!visibleItems.length) return null;

          return (
            <List
              key={section.label}
              dense
              subheader={
                <ListSubheader
                  component="div"
                  sx={{
                    bgcolor: 'transparent',
                    color: 'rgba(232,244,248,0.5)',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    lineHeight: '32px',
                    fontSize: '0.68rem',
                  }}
                >
                  {section.label}
                </ListSubheader>
              }
            >
              {visibleItems.map((item) => (
                <ListItemButton
                  key={item.label}
                  component={item.disabled ? 'div' : NavLink}
                  to={item.disabled ? undefined : item.to}
                  disabled={item.disabled}
                  onClick={item.disabled ? undefined : onNavigate}
                  sx={{
                    mx: 1,
                    mb: 0.35,
                    borderRadius: 2,
                    color: 'rgba(232,244,248,0.82)',
                    '& .MuiListItemIcon-root': {
                      color: 'rgba(232,244,248,0.7)',
                    },
                    '&:hover': {
                      bgcolor: 'rgba(79,195,220,0.12)',
                    },
                    '&.active': {
                      bgcolor: 'rgba(79,195,220,0.22)',
                      color: '#FFFFFF',
                      boxShadow: 'inset 3px 0 0 #4FC3DC',
                      '& .MuiListItemIcon-root': {
                        color: '#4FC3DC',
                      },
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>{item.icon}</ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{ fontWeight: 600, fontSize: '0.9rem' }}
                    secondary={item.disabled ? 'Upcoming' : undefined}
                    secondaryTypographyProps={{
                      sx: { color: 'rgba(232,244,248,0.45)', fontSize: '0.7rem' },
                    }}
                  />
                </ListItemButton>
              ))}
            </List>
          );
        })}
      </Box>
    </Box>
  );
}
