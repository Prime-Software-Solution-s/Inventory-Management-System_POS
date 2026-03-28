import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { PackageCheck, Plus, ShoppingCart } from 'lucide-react';
import {
  createPurchaseOrder,
  listProducts,
  listPurchaseOrders,
  listSuppliers,
  updatePurchaseOrderStatus,
} from '../../api/inventory';
import { getErrorMessage } from '../../api/client';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';
import { SectionHeader } from '../../components/common/SectionHeader';
import { StatusBadge } from '../../components/common/StatusBadge';
import { useQuickAction } from '../../hooks/useQuickAction';
import { formatCurrency, formatDate } from '../../utils/formatters';

const PurchaseOrderFormModal = ({
  open,
  onClose,
  suppliers,
  products,
  onSubmit,
  isSubmitting,
}) => {
  const { register, handleSubmit, reset, watch } = useForm({
    defaultValues: {
      supplier: '',
      deliveryDate: '',
    },
  });
  const [lines, setLines] = useState([{ product: '', quantity: 1, location: '' }]);

  useEffect(() => {
    if (open) {
      reset({
        supplier: '',
        deliveryDate: '',
      });
      setLines([{ product: '', quantity: 1, location: '' }]);
    }
  }, [open, reset]);

  const supplierId = watch('supplier');

  const submitOrder = async (values) => {
    const payload = {
      supplier: supplierId,
      deliveryDate: values.deliveryDate || undefined,
      products: lines
        .filter((line) => line.product)
        .map((line) => ({
          product: line.product,
          location: line.location,
          quantity: Number(line.quantity),
        })),
    };

    if (!payload.products.length) {
      toast.error('Add at least one product line.');
      return;
    }

    await onSubmit(payload);
  };

  const productMap = new Map(products.map((item) => [item._id, item]));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create Purchase Order"
      description="Send replenishment requests to suppliers, receive stock, and assign warehouse locations."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit(submitOrder)} disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Order'}
          </Button>
        </>
      }
    >
      <div className="form-grid compact-grid">
        <label className="field">
          <span>Supplier</span>
          <select className="input-shell" {...register('supplier', { required: true })}>
            <option value="">Select supplier</option>
            {suppliers.map((supplier) => (
              <option key={supplier._id} value={supplier._id}>
                {supplier.name}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Delivery Date</span>
          <input className="input-shell" type="date" {...register('deliveryDate')} />
        </label>
      </div>

      <div className="line-item-section">
        <div className="line-item-header">
          <strong>Products</strong>
          <Button
            size="sm"
            variant="ghost"
            icon={Plus}
            onClick={() => setLines((current) => [...current, { product: '', quantity: 1, location: '' }])}
          >
            Add Line
          </Button>
        </div>

        <div className="line-item-list">
          {lines.map((line, index) => {
            const linkedProduct = productMap.get(line.product);

            return (
              <div key={`${index}-${line.product}`} className="line-item-row">
                <select
                  className="input-shell"
                  value={line.product}
                  onChange={(event) =>
                    setLines((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, product: event.target.value } : item
                      )
                    )
                  }
                >
                  <option value="">Select product</option>
                  {products.map((product) => (
                    <option key={product._id} value={product._id}>
                      {product.name}
                    </option>
                  ))}
                </select>
                <input
                  className="input-shell"
                  type="number"
                  min="1"
                  value={line.quantity}
                  onChange={(event) =>
                    setLines((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, quantity: Number(event.target.value) }
                          : item
                        )
                    )
                  }
                />
                <input
                  className="input-shell"
                  placeholder="Warehouse location"
                  value={line.location}
                  onChange={(event) =>
                    setLines((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, location: event.target.value }
                          : item
                      )
                    )
                  }
                />
                <div className="line-item-summary">
                  <span>{linkedProduct ? formatCurrency(linkedProduct.purchasePrice) : 'Cost'}</span>
                  <strong>
                    {linkedProduct
                      ? formatCurrency(linkedProduct.purchasePrice * Number(line.quantity || 0))
                      : '$0'}
                  </strong>
                </div>
                {lines.length > 1 ? (
                  <button
                    className="icon-button danger-icon"
                    type="button"
                    onClick={() =>
                      setLines((current) => current.filter((_, itemIndex) => itemIndex !== index))
                    }
                  >
                    X
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
};

const PurchaseOrderDetailsModal = ({ open, onClose, order }) => (
  <Modal
    open={open}
    onClose={onClose}
    title="Purchase Order Details"
    description="Inspect ordered products, totals, and supplier information."
    size="lg"
    footer={
      <Button variant="ghost" onClick={onClose}>
        Close
      </Button>
    }
  >
    {order ? (
      <div className="details-list">
        <div>
          <span>Supplier</span>
          <strong>{order.supplier?.name}</strong>
        </div>
        <div>
          <span>Status</span>
          <strong>{order.status}</strong>
        </div>
        <div>
          <span>Order Date</span>
          <strong>{formatDate(order.orderDate || order.createdAt)}</strong>
        </div>
        <div>
          <span>Delivery Date</span>
          <strong>{order.deliveryDate ? formatDate(order.deliveryDate) : 'Not scheduled'}</strong>
        </div>
        <div>
          <span>Total Amount</span>
          <strong>{formatCurrency(order.totalAmount)}</strong>
        </div>
        <div className="linked-product-list">
          {order.products.map((line) => (
            <article key={`${order._id}-${line.product}`} className="linked-product-row">
              <div>
                <strong>{line.name}</strong>
                <p>{line.sku} | {line.location || 'Location pending'}</p>
              </div>
                <span>
                  {line.quantity} x {formatCurrency(line.costPrice)}
                </span>
            </article>
          ))}
        </div>
      </div>
    ) : null}
  </Modal>
);

const PurchaseOrdersPage = () => {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  useQuickAction('add-purchase-order', () => setFormOpen(true));

  const ordersQuery = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: () => listPurchaseOrders(),
  });

  const suppliersQuery = useQuery({
    queryKey: ['suppliers'],
    queryFn: listSuppliers,
  });

  const productsQuery = useQuery({
    queryKey: ['products', 'purchase-order-options'],
    queryFn: () => listProducts({ limit: 100, page: 1 }),
  });

  const createMutation = useMutation({
    mutationFn: createPurchaseOrder,
    onSuccess: () => {
      toast.success('Purchase order created.');
      setFormOpen(false);
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => updatePurchaseOrderStatus({ id, status }),
    onSuccess: () => {
      toast.success('Purchase order updated.');
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const orders = ordersQuery.data?.items || [];

  return (
    <div className="page-stack viewport-page">
      <SectionHeader
        eyebrow="Inbound operations"
        title="Purchase Orders"
        description="Create, approve, and receive supplier orders with inventory-safe transitions."
        action={
          <Button icon={Plus} onClick={() => setFormOpen(true)}>
            Create Order
          </Button>
        }
      />

      <Card className="page-panel">
        <div className="page-panel-scroll">
          {ordersQuery.isLoading ? (
            <p className="muted-copy">Loading purchase orders...</p>
          ) : orders.length ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Supplier</th>
                    <th>Status</th>
                    <th>Order Date</th>
                    <th>Delivery Date</th>
                    <th>Total Amount</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order._id}>
                      <td>
                        <strong>{order.supplier?.name}</strong>
                      </td>
                      <td>
                        <StatusBadge
                          tone={
                            order.status === 'received'
                              ? 'success'
                              : order.status === 'approved'
                                ? 'neutral'
                                : order.status === 'cancelled'
                                  ? 'danger'
                                  : 'warning'
                          }
                        >
                          {order.status}
                        </StatusBadge>
                      </td>
                      <td>{formatDate(order.orderDate || order.createdAt)}</td>
                      <td>{order.deliveryDate ? formatDate(order.deliveryDate) : 'Not scheduled'}</td>
                      <td>{formatCurrency(order.totalAmount)}</td>
                      <td>
                        <div className="inline-actions wrap-actions">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedOrder(order);
                              setDetailsOpen(true);
                            }}
                          >
                            Details
                          </Button>
                          {order.status === 'pending' ? (
                            <Button
                              size="sm"
                              variant="secondary"
                              icon={ShoppingCart}
                              onClick={() =>
                                statusMutation.mutate({ id: order._id, status: 'approved' })
                              }
                            >
                              Approve Order
                            </Button>
                          ) : null}
                          {order.status === 'approved' ? (
                            <Button
                              size="sm"
                              icon={PackageCheck}
                              onClick={() =>
                                statusMutation.mutate({ id: order._id, status: 'received' })
                              }
                            >
                              Mark as Received
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              icon={ShoppingCart}
              title="No purchase orders yet"
              description="Create the first supplier order to start tracking approvals and received inventory."
            />
          )}
        </div>
      </Card>

      <PurchaseOrderFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        suppliers={suppliersQuery.data?.items || []}
        products={productsQuery.data?.items || []}
        onSubmit={(payload) => createMutation.mutateAsync(payload)}
        isSubmitting={createMutation.isPending}
      />

      <PurchaseOrderDetailsModal
        open={detailsOpen}
        onClose={() => {
          setDetailsOpen(false);
          setSelectedOrder(null);
        }}
        order={selectedOrder}
      />
    </div>
  );
};

export { PurchaseOrdersPage };
