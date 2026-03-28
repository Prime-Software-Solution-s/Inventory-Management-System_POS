import { useState } from 'react';
import {
  BarChart3,
  Boxes,
  LayoutDashboard,
  Layers3,
  LogOut,
  MoonStar,
  PackageCheck,
  ReceiptText,
  ShoppingCart,
  SunMedium,
  Tags,
  Truck,
  Users,
  X,
} from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

const navigationItems = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { label: 'Staff', to: '/staff', icon: Users, adminOnly: true },
  { label: 'Products', to: '/products', icon: Boxes },
  { label: 'Barcodes', to: '/barcodes', icon: PackageCheck },
  { label: 'Categories', to: '/categories', icon: Tags },
  { label: 'Suppliers', to: '/suppliers', icon: Truck },
  { label: 'Stock', to: '/stock', icon: Layers3 },
  { label: 'Purchase Orders', to: '/purchase-orders', icon: ShoppingCart },
  { label: 'Sales', to: '/sales', icon: ReceiptText },
  { label: 'Reports', to: '/reports', icon: BarChart3 },
];

const Sidebar = ({ open, onClose }) => {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const { logout, user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [logoutOpen, setLogoutOpen] = useState(false);
  const visibleNavigationItems = navigationItems.filter(
    (item) => !item.adminOnly || isAdmin
  );

  const handleLogout = () => {
    logout();
    setLogoutOpen(false);
    onClose?.();
    navigate('/login', { replace: true });
  };

  return (
    <>
      <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
        <span className="sidebar-glow sidebar-glow-one" />
        <span className="sidebar-glow sidebar-glow-two" />

        <div className="sidebar-brand-panel">
          <div className="sidebar-header">
            <div className="sidebar-brand-block">
              <span className="sidebar-brand-mark">IO</span>
              <div className="sidebar-brand-copy">
                <strong>InventoryOS</strong>
                <p>Warehouse control</p>
              </div>
            </div>

            <div className="sidebar-brand-tools">
              <button
                className="icon-button sidebar-theme-toggle"
                type="button"
                onClick={toggleTheme}
                aria-label="Toggle theme"
              >
                {isDark ? <SunMedium size={17} /> : <MoonStar size={17} />}
              </button>
              <button className="icon-button sidebar-close" type="button" onClick={onClose}>
                <X size={18} />
              </button>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-nav-frame">
            <div className="sidebar-link-stack">
              {visibleNavigationItems.map(({ label, to, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}
                  onClick={onClose}
                >
                  <span className="sidebar-link-icon">
                    <Icon size={18} />
                  </span>
                  <span className="sidebar-link-copy">
                    <strong>{label}</strong>
                  </span>
                </NavLink>
              ))}
            </div>
          </div>
        </nav>

        <div className="sidebar-action-stack">
          <button className="sidebar-action-button sidebar-action-danger" type="button" onClick={() => setLogoutOpen(true)}>
            <span className="sidebar-action-copy">
              <strong>Log Out</strong>
              <span>End current session</span>
            </span>
            <LogOut size={16} />
          </button>
        </div>

      </aside>
      {open ? <button className="sidebar-overlay" type="button" onClick={onClose} /> : null}

      <Modal
        open={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        title="Log Out"
        description="Leave the current InventoryOS session on this device."
        panelClassName="logout-modal-panel"
        headerClassName="logout-modal-header"
        bodyClassName="logout-modal-body"
        footerClassName="logout-modal-footer"
        footer={
          <>
            <Button variant="ghost" className="logout-modal-cancel" onClick={() => setLogoutOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" className="logout-modal-confirm" onClick={handleLogout}>
              Log Out
            </Button>
          </>
        }
      >
        <div className="logout-modal-shell">
          <div className="logout-modal-hero">
            <div className="logout-modal-icon">
              <LogOut size={20} />
            </div>
            <div className="logout-modal-copy-block">
              <strong>Ready to sign out?</strong>
              <p>Your current authenticated session will close and you will return to the login screen.</p>
            </div>
          </div>
          <div className="logout-modal-note">
            <span>Active user</span>
            <strong>{user?.name || user?.email || 'Current session'}</strong>
            <p>Complete any open form changes before logging out.</p>
          </div>
        </div>
      </Modal>
    </>
  );
};

export { Sidebar };
