import { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import {
  BarChart3,
  Boxes,
  LayoutDashboard,
  Layers3,
  PackageCheck,
  Plus,
  ReceiptText,
  ShoppingCart,
  Tags,
  Truck,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const pages = [
  { label: 'Dashboard', route: '/dashboard', icon: LayoutDashboard },
  { label: 'Products', route: '/products', icon: Boxes },
  { label: 'Barcodes', route: '/barcodes', icon: PackageCheck },
  { label: 'Categories', route: '/categories', icon: Tags },
  { label: 'Suppliers', route: '/suppliers', icon: Truck },
  { label: 'Stock', route: '/stock', icon: Layers3 },
  { label: 'Purchase Orders', route: '/purchase-orders', icon: ShoppingCart },
  { label: 'Sales', route: '/sales', icon: ReceiptText },
  { label: 'Reports', route: '/reports', icon: BarChart3 },
];

const actions = [
  { label: 'Add Product', action: 'add-product', icon: Plus },
  { label: 'Create Purchase Order', action: 'add-purchase-order', icon: ShoppingCart },
  { label: 'Create Sale', action: 'add-sale', icon: ReceiptText },
];

const CommandPalette = ({ open, onOpenChange }) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!open) {
      setSearch('');
    }
  }, [open]);

  const handleCommand = (command) => {
    if (command.route) {
      navigate(command.route);
    }

    if (command.action) {
      window.dispatchEvent(new CustomEvent('inventory:quick-action', { detail: command.action }));
    }

    onOpenChange(false);
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="command-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => onOpenChange(false)}
        >
          <motion.div
            className="command-shell"
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.98 }}
            onClick={(event) => event.stopPropagation()}
          >
            <Command label="Inventory command palette" className="command-root">
              <Command.Input
                value={search}
                onValueChange={setSearch}
                className="command-input"
                placeholder="Search pages, products, or actions..."
              />
              <Command.List className="command-list">
                <Command.Empty className="command-empty">No matching command.</Command.Empty>
                <div className="command-group-label">Navigate</div>
                {pages.map((item) => (
                  <Command.Item
                    key={item.route}
                    value={item.label}
                    className="command-item"
                    onSelect={() => handleCommand(item)}
                  >
                    <item.icon size={16} />
                    <span>{item.label}</span>
                  </Command.Item>
                ))}
                <div className="command-group-label">Quick Actions</div>
                {actions.map((item) => (
                  <Command.Item
                    key={item.action}
                    value={item.label}
                    className="command-item"
                    onSelect={() => handleCommand(item)}
                  >
                    <item.icon size={16} />
                    <span>{item.label}</span>
                  </Command.Item>
                ))}
              </Command.List>
            </Command>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};

export { CommandPalette };
