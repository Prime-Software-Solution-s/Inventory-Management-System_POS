import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  Activity,
  Boxes,
  CircleDollarSign,
  Clock3,
  PackageSearch,
  ReceiptText,
  ShieldAlert,
  ShoppingCart,
  UserPlus,
  Users,
} from 'lucide-react';
import {
  createStaffAccountRequest,
  getStaffAccountDetailsRequest,
  listStaffAccountsRequest,
} from '../../api/auth';
import { getErrorMessage } from '../../api/client';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';
import { SectionHeader } from '../../components/common/SectionHeader';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency, formatDate, formatNumber } from '../../utils/formatters';

const formatRelativeTime = (value) => {
  if (!value) {
    return 'No activity yet';
  }

  const diffMs = Date.now() - new Date(value).getTime();
  const diffMinutes = Math.max(1, Math.floor(diffMs / (1000 * 60)));

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);

  if (diffDays < 30) {
    return `${diffDays}d ago`;
  }

  return formatDate(value);
};

const getActivityState = (member) => {
  if (!member) {
    return { tone: 'neutral', label: 'No Selection' };
  }

  if (!member.lastLoginAt) {
    return { tone: 'neutral', label: 'Pending Login' };
  }

  const lastActiveTime = new Date(member.lastActiveAt || member.lastLoginAt).getTime();
  const diffMinutes = (Date.now() - lastActiveTime) / (1000 * 60);

  if (diffMinutes <= 15) {
    return { tone: 'success', label: 'Online' };
  }

  if (diffMinutes <= 60 * 24 * 7) {
    return { tone: 'warning', label: 'Recently Active' };
  }

  return { tone: 'neutral', label: 'Idle' };
};

const getInitials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'ST';

const CreateStaffModal = ({ open, onClose, onSubmit, isSubmitting }) => {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
      });
    }
  }, [open, reset]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create Staff Account"
      description="Create a protected staff login for warehouse or store operations."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Staff'}
          </Button>
        </>
      }
    >
      <div className="form-grid compact-grid">
        <label className="field">
          <span>Full Name</span>
          <input className="input-shell" {...register('name', { required: 'Name is required.' })} />
          {errors.name ? <small>{errors.name.message}</small> : null}
        </label>

        <label className="field">
          <span>Email</span>
          <input
            className="input-shell"
            type="email"
            {...register('email', { required: 'Email is required.' })}
          />
          {errors.email ? <small>{errors.email.message}</small> : null}
        </label>
      </div>

      <div className="form-grid compact-grid">
        <label className="field">
          <span>Password</span>
          <input
            className="input-shell"
            type="password"
            {...register('password', {
              required: 'Password is required.',
              minLength: {
                value: 6,
                message: 'Password must be at least 6 characters.',
              },
            })}
          />
          {errors.password ? <small>{errors.password.message}</small> : null}
        </label>

        <label className="field">
          <span>Confirm Password</span>
          <input
            className="input-shell"
            type="password"
            {...register('confirmPassword', {
              validate: (value) => value === watch('password') || 'Passwords do not match.',
            })}
          />
          {errors.confirmPassword ? <small>{errors.confirmPassword.message}</small> : null}
        </label>
      </div>
    </Modal>
  );
};

const StaffPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState('');

  const staffQuery = useQuery({
    queryKey: ['staff-accounts'],
    queryFn: listStaffAccountsRequest,
    enabled: isAdmin,
  });

  const staffAccounts = staffQuery.data?.items || [];

  useEffect(() => {
    if (!staffAccounts.length) {
      if (selectedStaffId) {
        setSelectedStaffId('');
      }
      return;
    }

    const stillExists = staffAccounts.some((member) => member.id === selectedStaffId);

    if (!selectedStaffId || !stillExists) {
      setSelectedStaffId(staffAccounts[0].id);
    }
  }, [staffAccounts, selectedStaffId]);

  const selectedStaff = staffAccounts.find((member) => member.id === selectedStaffId) || null;

  const staffDetailsQuery = useQuery({
    queryKey: ['staff-account-details', selectedStaffId],
    queryFn: () => getStaffAccountDetailsRequest(selectedStaffId),
    enabled: isAdmin && Boolean(selectedStaffId),
  });

  const createStaffMutation = useMutation({
    mutationFn: createStaffAccountRequest,
    onSuccess: (response) => {
      toast.success(`${response.user.name} staff account created.`);
      setFormOpen(false);
      setSelectedStaffId(response.user.id);
      queryClient.invalidateQueries({ queryKey: ['staff-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['staff-account-details'] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  if (!isAdmin) {
    return (
      <div className="page-stack viewport-page">
        <SectionHeader
          eyebrow="Access Control"
          title="Staff Management"
          description="Only administrators can create staff accounts and monitor team activity."
        />

        <Card className="page-panel">
          <div className="page-panel-scroll">
            <EmptyState
              icon={ShieldAlert}
              title="Admin access required"
              description="This workspace is reserved for administrators managing staff authentication and activity."
            />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="page-stack viewport-page">
      <SectionHeader
        eyebrow="Access Control"
        title="Staff Management"
        description="Create staff logins and monitor sign-in activity from one secure admin workspace."
        action={
          <Button icon={UserPlus} onClick={() => setFormOpen(true)}>
            Create Staff
          </Button>
        }
      />

      <Card className="page-panel staff-page-panel">
        <div className="page-panel-scroll staff-page-scroll">
          {staffQuery.isLoading ? (
            <p className="muted-copy">Loading staff accounts...</p>
          ) : !staffAccounts.length ? (
            <EmptyState
              icon={Users}
              title="No staff accounts yet"
              description="Create the first staff login so warehouse or retail team members can access operations securely."
              action={
                <Button icon={UserPlus} onClick={() => setFormOpen(true)}>
                  Create Staff
                </Button>
              }
            />
          ) : (
            <div className="staff-workspace">
              <Card className="staff-selection-shell">
                <div className="staff-selection-copy">
                  <span className="section-eyebrow">Staff Selector</span>
                  <h3>Switch between team members</h3>
                  <p>Select a staff account to review stock handling, sales, orders, and recent activity.</p>
                </div>

                <label className="field staff-selector-field">
                  <span>Select Staff</span>
                  <select
                    className="input-shell"
                    value={selectedStaffId}
                    onChange={(event) => setSelectedStaffId(event.target.value)}
                  >
                    {staffAccounts.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name} ({member.email})
                      </option>
                    ))}
                  </select>
                </label>
              </Card>

              {staffDetailsQuery.isLoading ? (
                <p className="muted-copy">Loading selected staff details...</p>
              ) : (
                <>
                  <Card className="staff-detail-hero">
                    <div className="staff-detail-main">
                      <div className="staff-avatar staff-detail-avatar">
                        {getInitials(selectedStaff?.name)}
                      </div>
                      <div className="staff-detail-copy">
                        <span className="section-eyebrow">Selected Staff</span>
                        <h3>{selectedStaff?.name}</h3>
                        <p>{selectedStaff?.email}</p>
                      </div>
                    </div>

                    <div className="staff-detail-meta">
                      <span className={`status-badge status-${getActivityState(selectedStaff).tone}`}>
                        {getActivityState(selectedStaff).label}
                      </span>
                      <span>
                        Last login: {selectedStaff?.lastLoginAt ? formatDate(selectedStaff.lastLoginAt) : 'Never'}
                      </span>
                      <span>
                        Last active:{' '}
                        {selectedStaff?.lastActiveAt ? formatRelativeTime(selectedStaff.lastActiveAt) : 'No activity yet'}
                      </span>
                      <span>Created: {selectedStaff?.createdAt ? formatDate(selectedStaff.createdAt) : 'N/A'}</span>
                    </div>
                  </Card>

                  <div className="metric-grid compact-metrics staff-detail-metrics">
                    <Card className="staff-metric-card">
                      <div className="metric-card-header">
                        <span>Products Managed</span>
                        <div className="metric-icon">
                          <Boxes size={18} />
                        </div>
                      </div>
                      <strong>{formatNumber(staffDetailsQuery.data?.summary?.productsManaged)}</strong>
                      <p>Products created, updated, or stock-adjusted by this staff member.</p>
                    </Card>

                    <Card className="staff-metric-card">
                      <div className="metric-card-header">
                        <span>Low Stock</span>
                        <div className="metric-icon">
                          <PackageSearch size={18} />
                        </div>
                      </div>
                      <strong>{formatNumber(staffDetailsQuery.data?.summary?.lowStockCount)}</strong>
                      <p>Managed items currently sitting below the low-stock threshold.</p>
                    </Card>

                    <Card className="staff-metric-card">
                      <div className="metric-card-header">
                        <span>Out Of Stock</span>
                        <div className="metric-icon">
                          <PackageSearch size={18} />
                        </div>
                      </div>
                      <strong>{formatNumber(staffDetailsQuery.data?.summary?.outOfStockCount)}</strong>
                      <p>Managed products that are unavailable for sale or fulfilment.</p>
                    </Card>

                    <Card className="staff-metric-card">
                      <div className="metric-card-header">
                        <span>Sales Processed</span>
                        <div className="metric-icon">
                          <ReceiptText size={18} />
                        </div>
                      </div>
                      <strong>{formatNumber(staffDetailsQuery.data?.summary?.salesCount)}</strong>
                      <p>Completed sales directly created by the selected staff account.</p>
                    </Card>

                    <Card className="staff-metric-card">
                      <div className="metric-card-header">
                        <span>Sales Value</span>
                        <div className="metric-icon">
                          <CircleDollarSign size={18} />
                        </div>
                      </div>
                      <strong>{formatCurrency(staffDetailsQuery.data?.summary?.salesValue)}</strong>
                      <p>Total sale value closed by this staff member.</p>
                    </Card>

                    <Card className="staff-metric-card">
                      <div className="metric-card-header">
                        <span>Purchase Orders</span>
                        <div className="metric-icon">
                          <ShoppingCart size={18} />
                        </div>
                      </div>
                      <strong>{formatNumber(staffDetailsQuery.data?.summary?.purchaseOrdersCount)}</strong>
                      <p>Orders created or status-managed by the selected staff member.</p>
                    </Card>
                  </div>

                  <Card className="staff-operations-shell">
                    <div className="staff-panel-head">
                      <div className="staff-panel-copy">
                        <span className="section-eyebrow">Operational Summary</span>
                        <h3>{selectedStaff?.name} performance snapshot</h3>
                        <p>Live account details and inventory-linked stats for the selected staff member.</p>
                      </div>
                      <div className="staff-panel-chip">
                        <Clock3 size={14} />
                        <span>Live view</span>
                      </div>
                    </div>

                    <div className="staff-operations-grid">
                      <div className="staff-operations-stat">
                        <span>Managed Inventory Value</span>
                        <strong>{formatCurrency(staffDetailsQuery.data?.summary?.inventoryValue)}</strong>
                      </div>
                      <div className="staff-operations-stat">
                        <span>Received Orders</span>
                        <strong>{formatNumber(staffDetailsQuery.data?.summary?.receivedOrdersCount)}</strong>
                      </div>
                      <div className="staff-operations-stat">
                        <span>Purchase Order Value</span>
                        <strong>{formatCurrency(staffDetailsQuery.data?.summary?.purchaseOrderValue)}</strong>
                      </div>
                    </div>
                  </Card>

                  <Card className="staff-activity-shell">
                    <div className="staff-panel-head">
                      <div className="staff-panel-copy">
                        <span className="section-eyebrow">Recent Activity</span>
                        <h3>{selectedStaff?.name} activity timeline</h3>
                        <p>Recent stock, order, and sales actions tied to this staff account.</p>
                      </div>
                      <div className="staff-panel-chip">
                        <Activity size={14} />
                        <span>{staffDetailsQuery.data?.activity?.length || 0} events</span>
                      </div>
                    </div>

                    {staffDetailsQuery.data?.activity?.length ? (
                      <div className="staff-selected-activity-list">
                        {staffDetailsQuery.data.activity.map((entry, index) => (
                          <div className="staff-selected-activity-item" key={`${entry.type}-${entry.createdAt}-${index}`}>
                            <div className="staff-activity-icon">
                              <Activity size={16} />
                            </div>
                            <div className="staff-activity-copy">
                              <strong>{entry.title}</strong>
                              <p>{entry.description}</p>
                              <span>{formatDate(entry.createdAt)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <EmptyState
                        icon={Activity}
                        title="No tracked operations yet"
                        description="Sales, stock adjustments, and purchase-order activity will appear here after this staff account starts using the system."
                      />
                    )}
                  </Card>
                </>
              )}
            </div>
          )}
        </div>
      </Card>

      <CreateStaffModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={(payload) =>
          createStaffMutation.mutateAsync({
            name: payload.name,
            email: payload.email,
            password: payload.password,
          })
        }
        isSubmitting={createStaffMutation.isPending}
      />
    </div>
  );
};

export { StaffPage };
