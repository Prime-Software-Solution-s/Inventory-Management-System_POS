import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Pencil, Plus, ShoppingCart, Trash2, Truck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  createSupplier,
  deleteSupplier,
  getSupplier,
  listSuppliers,
  updateSupplier,
} from '../../api/inventory';
import { getErrorMessage } from '../../api/client';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';
import { SectionHeader } from '../../components/common/SectionHeader';
import { useAuth } from '../../contexts/AuthContext';
import { formatNumber } from '../../utils/formatters';

const SupplierFormModal = ({ open, onClose, supplier, onSubmit, isSubmitting }) => {
  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      name: '',
      contactPerson: '',
      phone: '',
      email: '',
      address: '',
      company: '',
    },
  });

  useEffect(() => {
    if (open) {
      reset(
        supplier || {
          name: '',
          contactPerson: '',
          phone: '',
          email: '',
          address: '',
          company: '',
        }
      );
    }
  }, [open, supplier, reset]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={supplier ? 'Edit Supplier' : 'Add Supplier'}
      description="Keep supplier contacts and commercial records organized."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : supplier ? 'Save Supplier' : 'Add Supplier'}
          </Button>
        </>
      }
    >
      <div className="form-grid">
        <label className="field">
          <span>Supplier Name</span>
          <input className="input-shell" {...register('name', { required: true })} />
        </label>
        <label className="field">
          <span>Company Name</span>
          <input className="input-shell" {...register('company')} />
        </label>
        <label className="field">
          <span>Contact Person</span>
          <input className="input-shell" {...register('contactPerson')} />
        </label>
        <label className="field">
          <span>Phone</span>
          <input className="input-shell" {...register('phone')} />
        </label>
        <label className="field">
          <span>Email</span>
          <input className="input-shell" type="email" {...register('email')} />
        </label>
        <label className="field">
          <span>Address</span>
          <input className="input-shell" {...register('address')} />
        </label>
      </div>
    </Modal>
  );
};

const SupplierDetailsModal = ({ open, onClose, supplierData }) => (
  <Modal
    open={open}
    onClose={onClose}
    title="Supplier Details"
    description="Review contact details and linked inventory."
    footer={
      <Button variant="ghost" onClick={onClose}>
        Close
      </Button>
    }
  >
    {supplierData ? (
      <div className="details-list">
        <div>
          <span>Supplier</span>
          <strong>{supplierData.supplier.name}</strong>
        </div>
        <div>
          <span>Company</span>
          <strong>{supplierData.supplier.company || 'Not set'}</strong>
        </div>
        <div>
          <span>Contact Person</span>
          <strong>{supplierData.supplier.contactPerson || 'Not set'}</strong>
        </div>
        <div>
          <span>Phone</span>
          <strong>{supplierData.supplier.phone || 'Not set'}</strong>
        </div>
        <div>
          <span>Email</span>
          <strong>{supplierData.supplier.email || 'Not set'}</strong>
        </div>
        <div>
          <span>Linked Products</span>
          <strong>{formatNumber(supplierData.linkedProducts.length)}</strong>
        </div>
        <div className="linked-product-list">
          {supplierData.linkedProducts.map((product) => (
            <article key={product._id} className="linked-product-row">
              <div>
                <strong>{product.name}</strong>
                <p>{product.sku}</p>
              </div>
              <span>{product.quantity} units</span>
            </article>
          ))}
          {!supplierData.linkedProducts.length ? <p className="muted-copy">No linked products.</p> : null}
        </div>
      </div>
    ) : null}
  </Modal>
);

const SuppliersPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const canManage = user?.role === 'admin';
  const [formOpen, setFormOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);

  const suppliersQuery = useQuery({
    queryKey: ['suppliers'],
    queryFn: listSuppliers,
  });

  const supplierDetailsQuery = useQuery({
    queryKey: ['supplier', selectedSupplier?._id],
    queryFn: () => getSupplier(selectedSupplier._id),
    enabled: detailsOpen && Boolean(selectedSupplier?._id),
  });

  const saveMutation = useMutation({
    mutationFn: ({ id, payload }) =>
      id ? updateSupplier({ id, payload }) : createSupplier(payload),
    onSuccess: (_, variables) => {
      toast.success(variables.id ? 'Supplier updated.' : 'Supplier created.');
      setFormOpen(false);
      setSelectedSupplier(null);
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSupplier,
    onSuccess: () => {
      toast.success('Supplier deleted.');
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const suppliers = suppliersQuery.data?.items || [];

  return (
    <div className="page-stack viewport-page">
      <SectionHeader
        eyebrow="Vendor network"
        title="Supplier Management"
        description="Keep supplier records cleaner, easier to search, and ready for purchasing workflows."
        action={
          canManage ? (
            <Button
              icon={Plus}
              onClick={() => {
                setSelectedSupplier(null);
                setFormOpen(true);
              }}
            >
              Add Supplier
            </Button>
          ) : null
        }
      />

      <Card className="page-panel">
        <div className="page-panel-scroll">
          {suppliersQuery.isLoading ? (
            <p className="muted-copy">Loading suppliers...</p>
          ) : suppliers.length ? (
            <div className="table-wrap">
              <table className="data-table supplier-data-table">
                <thead>
                  <tr>
                    <th>Supplier</th>
                    <th>Company</th>
                    <th>Contact Person</th>
                    <th>Phone</th>
                    <th>Email</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map((supplier) => (
                    <tr key={supplier._id}>
                      <td>
                        <div className="supplier-name-cell">
                          <div className="tile-icon">
                            <Truck size={18} />
                          </div>
                          <strong>{supplier.name}</strong>
                        </div>
                      </td>
                      <td>{supplier.company || 'Not set'}</td>
                      <td>{supplier.contactPerson || 'Not set'}</td>
                      <td>{supplier.phone || 'Not set'}</td>
                      <td>
                        {supplier.email ? (
                          <a className="supplier-inline-link" href={`mailto:${supplier.email}`}>
                            {supplier.email}
                          </a>
                        ) : (
                          'Not set'
                        )}
                      </td>
                      <td>
                        <div className="inline-actions wrap-actions supplier-actions-cell">
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={ShoppingCart}
                            onClick={() => navigate('/purchase-orders')}
                          >
                            View Orders
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedSupplier(supplier);
                              setDetailsOpen(true);
                            }}
                          >
                            Details
                          </Button>
                          {canManage ? (
                            <>
                              <button
                                className="icon-button"
                                type="button"
                                onClick={() => {
                                  setSelectedSupplier(supplier);
                                  setFormOpen(true);
                                }}
                              >
                                <Pencil size={16} />
                              </button>
                              <button
                                className="icon-button danger-icon"
                                type="button"
                                onClick={() => deleteMutation.mutate(supplier._id)}
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
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
              icon={Truck}
              title="No suppliers added"
              description="Add supplier records so purchase orders and product sourcing are easier to manage."
            />
          )}
        </div>
      </Card>

      <SupplierFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setSelectedSupplier(null);
        }}
        supplier={selectedSupplier}
        onSubmit={(payload) =>
          saveMutation.mutate({
            id: selectedSupplier?._id,
            payload,
          })
        }
        isSubmitting={saveMutation.isPending}
      />

      <SupplierDetailsModal
        open={detailsOpen}
        onClose={() => {
          setDetailsOpen(false);
          setSelectedSupplier(null);
        }}
        supplierData={supplierDetailsQuery.data}
      />
    </div>
  );
};

export { SuppliersPage };
