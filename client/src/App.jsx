import { Suspense, lazy } from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { LoadingScreen } from './components/common/LoadingScreen';
import { useAuth } from './contexts/AuthContext';

const lazyPage = (loader, exportName) =>
  lazy(() => loader().then((module) => ({ default: module[exportName] })));

const LoginPage = lazyPage(() => import('./pages/auth/LoginPage'), 'LoginPage');
const ForgotPasswordPage = lazyPage(
  () => import('./pages/auth/ForgotPasswordPage'),
  'ForgotPasswordPage'
);
const ResetPasswordPage = lazyPage(
  () => import('./pages/auth/ResetPasswordPage'),
  'ResetPasswordPage'
);
const DashboardPage = lazyPage(() => import('./pages/dashboard/DashboardPage'), 'DashboardPage');
const StaffPage = lazyPage(() => import('./pages/staff/StaffPage'), 'StaffPage');
const ProductsPage = lazyPage(() => import('./pages/products/ProductsPage'), 'ProductsPage');
const BarcodesPage = lazyPage(() => import('./pages/barcodes/BarcodesPage'), 'BarcodesPage');
const CategoriesPage = lazyPage(() => import('./pages/categories/CategoriesPage'), 'CategoriesPage');
const SuppliersPage = lazyPage(() => import('./pages/suppliers/SuppliersPage'), 'SuppliersPage');
const StockPage = lazyPage(() => import('./pages/stock/StockPage'), 'StockPage');
const PurchaseOrdersPage = lazyPage(
  () => import('./pages/orders/PurchaseOrdersPage'),
  'PurchaseOrdersPage'
);
const SalesPage = lazyPage(() => import('./pages/sales/SalesPage'), 'SalesPage');
const ReportsPage = lazyPage(() => import('./pages/reports/ReportsPage'), 'ReportsPage');

const PublicRoute = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingScreen message="Preparing login experience" />;
  }

  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Outlet />;
};

const RootRedirect = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingScreen message="Loading InventoryOS" />;
  }

  return <Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />;
};

function App() {
  return (
    <Suspense fallback={<LoadingScreen message="Loading workspace" />}>
      <Routes>
        <Route path="/" element={<RootRedirect />} />

        <Route element={<PublicRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
        </Route>

        <Route path="/register" element={<Navigate to="/login" replace />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/staff" element={<StaffPage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/barcodes" element={<BarcodesPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/suppliers" element={<SuppliersPage />} />
            <Route path="/stock" element={<StockPage />} />
            <Route path="/purchase-orders" element={<PurchaseOrdersPage />} />
            <Route path="/sales" element={<SalesPage />} />
            <Route path="/reports" element={<ReportsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default App;
