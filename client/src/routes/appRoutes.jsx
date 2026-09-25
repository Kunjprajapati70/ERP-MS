import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import AppLayout from '../layouts/AppLayout';
import AuthLayout from '../layouts/AuthLayout';
import CustomerPortalLayout from '../layouts/CustomerPortalLayout';
import ProtectedRoute from './ProtectedRoute';
import PermissionGuard from './PermissionGuard';
import CustomerRoute, { StaffOnlyRoute } from './CustomerRoute';
import SystemStatusPage from '../pages/SystemStatusPage';
import LoginPage from '../pages/auth/LoginPage';
import RegisterPage from '../pages/auth/RegisterPage';
import CustomerRegisterPage from '../pages/auth/CustomerRegisterPage';
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage';
import ResetPasswordPage from '../pages/auth/ResetPasswordPage';
import ChangePasswordPage from '../pages/auth/ChangePasswordPage';
import UsersPage from '../pages/system/UsersPage';
import RolesPage from '../pages/system/RolesPage';
import AuditLogsPage from '../pages/system/AuditLogsPage';
import ProductsPage from '../pages/operations/ProductsPage';
import CategoriesPage from '../pages/operations/CategoriesPage';
import WarehousesPage from '../pages/operations/WarehousesPage';
import InventoryPage from '../pages/operations/InventoryPage';
import CustomersPage from '../pages/operations/CustomersPage';
import SuppliersPage from '../pages/operations/SuppliersPage';
import PurchaseOrdersPage from '../pages/operations/PurchaseOrdersPage';
import GrnPage from '../pages/operations/GrnPage';
import SalesOrdersPage from '../pages/operations/SalesOrdersPage';
import InvoicesPage from '../pages/operations/InvoicesPage';
import PaymentsPage from '../pages/operations/PaymentsPage';
import LeadsPage from '../pages/operations/LeadsPage';
import EmployeesPage from '../pages/hr/EmployeesPage';
import LeavePage from '../pages/hr/LeavePage';
import AttendancePage from '../pages/hr/AttendancePage';
import EmployeeAttendancePage from '../pages/hr/EmployeeAttendancePage';
import PayrollPage from '../pages/hr/PayrollPage';
import BomsPage from '../pages/manufacturing/BomsPage';
import WorkOrdersPage from '../pages/manufacturing/WorkOrdersPage';
import QcPage from '../pages/manufacturing/QcPage';
import DashboardPage from '../pages/DashboardPage';
import ReportsPage from '../pages/ReportsPage';
import CustomerDashboardPage from '../pages/customer/CustomerDashboardPage';
import CustomerProductsPage from '../pages/customer/CustomerProductsPage';
import CustomerProductDetailPage from '../pages/customer/CustomerProductDetailPage';
import CustomerCartPage from '../pages/customer/CustomerCartPage';
import CustomerOrdersPage from '../pages/customer/CustomerOrdersPage';
import CustomerOrderDetailPage from '../pages/customer/CustomerOrderDetailPage';
import CustomerInvoicesPage from '../pages/customer/CustomerInvoicesPage';
import CustomerInvoiceDetailPage from '../pages/customer/CustomerInvoiceDetailPage';
import CustomerPaymentsPage from '../pages/customer/CustomerPaymentsPage';
import CustomerNotificationsPage from '../pages/customer/CustomerNotificationsPage';
import CustomerSupportPage from '../pages/customer/CustomerSupportPage';
import CustomerSupportDetailPage from '../pages/customer/CustomerSupportDetailPage';
import CustomerProfilePage from '../pages/customer/CustomerProfilePage';
import CustomerSettingsPage from '../pages/customer/CustomerSettingsPage';
import NotFoundPage from '../pages/errors/NotFoundPage';
import UnauthorizedPage from '../pages/errors/UnauthorizedPage';
import ForbiddenPage from '../pages/errors/ForbiddenPage';
import ServerErrorPage from '../pages/errors/ServerErrorPage';
import ServiceUnavailablePage from '../pages/errors/ServiceUnavailablePage';

function GuestOnly({ children }) {
  const { token, status, user } = useSelector((state) => state.auth);
  if (token && (status === 'authenticated' || user)) {
    if (user?.role?.name === 'CUSTOMER') {
      return <Navigate to="/customer/dashboard" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

export const appRoutes = [
  {
    element: (
      <GuestOnly>
        <AuthLayout />
      </GuestOnly>
    ),
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
      { path: '/customer/register', element: <CustomerRegisterPage /> },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
      { path: '/reset-password', element: <ResetPasswordPage /> },
    ],
  },
  {
    path: '/customer',
    element: (
      <ProtectedRoute>
        <CustomerRoute>
          <CustomerPortalLayout />
        </CustomerRoute>
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      { path: 'dashboard', element: <CustomerDashboardPage /> },
      { path: 'products', element: <CustomerProductsPage /> },
      { path: 'products/:id', element: <CustomerProductDetailPage /> },
      { path: 'cart', element: <CustomerCartPage /> },
      { path: 'orders', element: <CustomerOrdersPage /> },
      { path: 'orders/:id', element: <CustomerOrderDetailPage /> },
      { path: 'invoices', element: <CustomerInvoicesPage /> },
      { path: 'invoices/:id', element: <CustomerInvoiceDetailPage /> },
      { path: 'payments', element: <CustomerPaymentsPage /> },
      { path: 'notifications', element: <CustomerNotificationsPage /> },
      { path: 'support', element: <CustomerSupportPage /> },
      { path: 'support/:id', element: <CustomerSupportDetailPage /> },
      { path: 'profile', element: <CustomerProfilePage /> },
      { path: 'settings', element: <CustomerSettingsPage /> },
      { path: '*', element: <Navigate to="/404" replace /> },
    ],
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <StaffOnlyRoute>
          <AppLayout />
        </StaffOnlyRoute>
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <SystemStatusPage /> },
      {
        path: 'dashboard',
        element: (
          <PermissionGuard permissions={['dashboard:read']}>
            <DashboardPage />
          </PermissionGuard>
        ),
      },
      {
        path: 'reports',
        element: (
          <PermissionGuard permissions={['reports:read']}>
            <ReportsPage />
          </PermissionGuard>
        ),
      },
      { path: 'account/change-password', element: <ChangePasswordPage /> },
      {
        path: 'operations/products',
        element: (
          <PermissionGuard permissions={['products:read']}>
            <ProductsPage />
          </PermissionGuard>
        ),
      },
      {
        path: 'operations/categories',
        element: (
          <PermissionGuard permissions={['products:read']}>
            <CategoriesPage />
          </PermissionGuard>
        ),
      },
      {
        path: 'operations/warehouses',
        element: (
          <PermissionGuard permissions={['inventory:read']}>
            <WarehousesPage />
          </PermissionGuard>
        ),
      },
      {
        path: 'operations/inventory',
        element: (
          <PermissionGuard permissions={['inventory:read']}>
            <InventoryPage />
          </PermissionGuard>
        ),
      },
      {
        path: 'operations/customers',
        element: (
          <PermissionGuard permissions={['customers:read']}>
            <CustomersPage />
          </PermissionGuard>
        ),
      },
      {
        path: 'operations/suppliers',
        element: (
          <PermissionGuard permissions={['suppliers:read']}>
            <SuppliersPage />
          </PermissionGuard>
        ),
      },
      {
        path: 'operations/purchase-orders',
        element: (
          <PermissionGuard permissions={['purchases:read']}>
            <PurchaseOrdersPage />
          </PermissionGuard>
        ),
      },
      {
        path: 'operations/grn',
        element: (
          <PermissionGuard permissions={['grn:read']}>
            <GrnPage />
          </PermissionGuard>
        ),
      },
      {
        path: 'operations/sales-orders',
        element: (
          <PermissionGuard permissions={['sales:read']}>
            <SalesOrdersPage />
          </PermissionGuard>
        ),
      },
      {
        path: 'operations/invoices',
        element: (
          <PermissionGuard permissions={['invoices:read']}>
            <InvoicesPage />
          </PermissionGuard>
        ),
      },
      {
        path: 'operations/payments',
        element: (
          <PermissionGuard permissions={['payments:read']}>
            <PaymentsPage />
          </PermissionGuard>
        ),
      },
      {
        path: 'operations/leads',
        element: (
          <PermissionGuard permissions={['crm:read']}>
            <LeadsPage />
          </PermissionGuard>
        ),
      },
      {
        path: 'hr/employees',
        element: (
          <PermissionGuard permissions={['hr:read']}>
            <EmployeesPage />
          </PermissionGuard>
        ),
      },
      {
        path: 'hr/leave',
        element: (
          <PermissionGuard permissions={['leave:read']}>
            <LeavePage />
          </PermissionGuard>
        ),
      },
      {
        path: 'hr/my-attendance',
        element: (
          <PermissionGuard permissions={['attendance:self']}>
            <EmployeeAttendancePage />
          </PermissionGuard>
        ),
      },
      {
        path: 'hr/attendance',
        element: (
          <PermissionGuard permissions={['attendance:read']}>
            <AttendancePage />
          </PermissionGuard>
        ),
      },
      {
        path: 'hr/payroll',
        element: (
          <PermissionGuard permissions={['payroll:read']}>
            <PayrollPage />
          </PermissionGuard>
        ),
      },
      {
        path: 'manufacturing/boms',
        element: (
          <PermissionGuard permissions={['manufacturing:read']}>
            <BomsPage />
          </PermissionGuard>
        ),
      },
      {
        path: 'manufacturing/work-orders',
        element: (
          <PermissionGuard permissions={['manufacturing:read']}>
            <WorkOrdersPage />
          </PermissionGuard>
        ),
      },
      {
        path: 'manufacturing/qc',
        element: (
          <PermissionGuard permissions={['qc:read']}>
            <QcPage />
          </PermissionGuard>
        ),
      },
      {
        path: 'system/users',
        element: (
          <PermissionGuard permissions={['users:read']}>
            <UsersPage />
          </PermissionGuard>
        ),
      },
      {
        path: 'system/roles',
        element: (
          <PermissionGuard permissions={['roles:read']}>
            <RolesPage />
          </PermissionGuard>
        ),
      },
      {
        path: 'system/audit-logs',
        element: (
          <PermissionGuard permissions={['audit:read']}>
            <AuditLogsPage />
          </PermissionGuard>
        ),
      },
    ],
  },
  { path: '/401', element: <UnauthorizedPage /> },
  { path: '/403', element: <ForbiddenPage /> },
  { path: '/404', element: <NotFoundPage /> },
  { path: '/500', element: <ServerErrorPage /> },
  { path: '/503', element: <ServiceUnavailablePage /> },
  { path: '*', element: <NotFoundPage /> },
];
