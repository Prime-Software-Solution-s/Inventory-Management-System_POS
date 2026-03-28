import { startTransition, useDeferredValue, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Download, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import {
  adjustProductStock,
  createProduct,
  deleteProduct,
  listCategories,
  listProducts,
  updateProduct,
} from '../../api/inventory';
import { getErrorMessage } from '../../api/client';
import { BarcodePreview } from '../../components/common/BarcodePreview';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';
import { SectionHeader } from '../../components/common/SectionHeader';
import { StatusBadge } from '../../components/common/StatusBadge';
import { useAuth } from '../../contexts/AuthContext';
import { useQuickAction } from '../../hooks/useQuickAction';
import { exportRowsToCsv } from '../../utils/export';
import { formatNumber, getStockTone } from '../../utils/formatters';
import { buildProductBarcodePreview } from '../../utils/barcode';

const emptyProduct = {
  name: '',
  sku: '',
  category: '',
  purchasePrice: 0,
  sellingPrice: 0,
  lowStockThreshold: 10,
  barcode: '',
  image: '',
};

const ProductFormModal = ({
  open,
  onClose,
  product,
  categories,
  onSubmit,
  isSubmitting,
}) => {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: emptyProduct,
  });

  useEffect(() => {
    if (open) {
      reset(
        product
          ? {
              ...emptyProduct,
              ...product,
              category: product.category?._id || product.category,
            }
          : emptyProduct
      );
    }
  }, [open, product, reset]);

  const productName = watch('name');
  const sku = watch('sku');
  const selectedCategoryId = watch('category');
  const selectedCategory = categories.find((item) => item._id === selectedCategoryId);
  const barcodePreview = buildProductBarcodePreview({
    productName,
    categoryName: selectedCategory?.name || product?.category?.name || '',
    sku,
  });

  const submitProduct = async (values) => {
    await onSubmit({
      ...values,
      purchasePrice: Number(values.purchasePrice),
      sellingPrice: Number(values.sellingPrice),
      lowStockThreshold: Number(values.lowStockThreshold),
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={product ? 'Edit Product' : 'Add Product'}
      description="Create and maintain product records with inventory-safe details."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit(submitProduct)} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : product ? 'Save Changes' : 'Add Product'}
          </Button>
        </>
      }
    >
      <div className="form-grid">
        <label className="field">
          <span>Product Name</span>
          <input
            className="input-shell"
            {...register('name', { required: 'Product name is required.' })}
          />
          {errors.name ? <small>{errors.name.message}</small> : null}
        </label>

        <label className="field">
          <span>SKU</span>
          <input className="input-shell" {...register('sku', { required: 'SKU is required.' })} />
          {errors.sku ? <small>{errors.sku.message}</small> : null}
        </label>

        <label className="field">
          <span>Category</span>
          <select
            className="input-shell"
            {...register('category', { required: 'Category is required.' })}
          >
            <option value="">Select category</option>
            {categories.map((item) => (
              <option key={item._id} value={item._id}>
                {item.name}
              </option>
            ))}
          </select>
          {errors.category ? <small>{errors.category.message}</small> : null}
        </label>

        <label className="field">
          <span>Purchase Price</span>
          <input className="input-shell" type="number" step="0.01" {...register('purchasePrice')} />
        </label>

        <label className="field">
          <span>Selling Price</span>
          <input className="input-shell" type="number" step="0.01" {...register('sellingPrice')} />
        </label>

        <label className="field">
          <span>Low Stock Threshold</span>
          <input className="input-shell" type="number" {...register('lowStockThreshold')} />
        </label>

        <label className="field">
          <span>Barcode</span>
          <input className="input-shell input-shell-readonly" value={barcodePreview} readOnly />
        </label>

        <div className="field barcode-visual-field">
          <span>Barcode Preview</span>
          <div className="barcode-inline-preview">
            <BarcodePreview value={barcodePreview} label={barcodePreview} compact showValue={false} />
          </div>
        </div>
      </div>
    </Modal>
  );
};

const StockAdjustmentModal = ({ open, onClose, product, onSubmit, isSubmitting }) => {
  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      type: 'increase',
      amount: 1,
    },
  });

  useEffect(() => {
    if (open) {
      reset({ type: 'increase', amount: 1 });
    }
  }, [open, reset]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Stock Adjustment"
      description={`Update stock levels for ${product?.name || 'selected product'}.`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit((values) =>
              onSubmit({
                ...values,
                amount: Number(values.amount),
              })
            )}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Updating...' : 'Save Adjustment'}
          </Button>
        </>
      }
    >
      <div className="form-grid compact-grid">
        <label className="field">
          <span>Adjustment Type</span>
          <select className="input-shell" {...register('type')}>
            <option value="increase">Increase Stock</option>
            <option value="decrease">Decrease Stock</option>
          </select>
        </label>

        <label className="field">
          <span>Amount</span>
          <input className="input-shell" type="number" {...register('amount')} />
        </label>
      </div>
    </Modal>
  );
};

const DeleteProductModal = ({
  open,
  onClose,
  product,
  requiresConfirmation,
  onDelete,
  isSubmitting,
}) => (
  <Modal
    open={open}
    onClose={onClose}
    title="Delete Product"
    description={
      requiresConfirmation
        ? 'This product exists in purchase history. Are you sure?'
        : 'Remove this product from active inventory records.'
    }
    footer={
      <>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="danger" onClick={() => onDelete(requiresConfirmation)} disabled={isSubmitting}>
          {isSubmitting ? 'Deleting...' : 'Delete Product'}
        </Button>
      </>
    }
  >
    <p className="modal-copy">
      {product?.name} will be removed from product management views.
      {requiresConfirmation ? ' Historical order lines will remain in reports.' : ''}
    </p>
  </Modal>
);

const ProductsPage = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const canCreate = user?.role === 'admin';
  const canEdit = ['admin', 'staff'].includes(user?.role);
  const [searchInput, setSearchInput] = useState('');
  const deferredSearch = useDeferredValue(searchInput);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 8,
    sortBy: 'createdAt:desc',
    category: '',
    search: '',
  });
  const [formOpen, setFormOpen] = useState(false);
  const [adjustmentOpen, setAdjustmentOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [deleteNeedsConfirmation, setDeleteNeedsConfirmation] = useState(false);

  useEffect(() => {
    startTransition(() => {
      setFilters((current) => ({
        ...current,
        page: 1,
        search: deferredSearch,
      }));
    });
  }, [deferredSearch]);

  useQuickAction('add-product', () => {
    if (canCreate) {
      setSelectedProduct(null);
      setFormOpen(true);
    }
  });

  const productsQuery = useQuery({
    queryKey: ['products', filters],
    queryFn: () => listProducts(filters),
  });

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: listCategories,
  });

  const refreshInventoryData = () => {
    queryClient.invalidateQueries({ queryKey: ['products'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    queryClient.invalidateQueries({ queryKey: ['reports'] });
  };

  const saveMutation = useMutation({
    mutationFn: ({ id, payload }) =>
      id ? updateProduct({ id, payload }) : createProduct(payload),
    onSuccess: (_, variables) => {
      toast.success(variables.id ? 'Product updated.' : 'Product added.');
      setFormOpen(false);
      setSelectedProduct(null);
      refreshInventoryData();
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const adjustmentMutation = useMutation({
    mutationFn: ({ id, payload }) => adjustProductStock({ id, payload }),
    onSuccess: () => {
      toast.success('Stock updated successfully.');
      setAdjustmentOpen(false);
      setSelectedProduct(null);
      refreshInventoryData();
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, force }) => deleteProduct({ id, force }),
    onSuccess: () => {
      toast.success('Product deleted successfully.');
      setDeleteOpen(false);
      setDeleteNeedsConfirmation(false);
      setSelectedProduct(null);
      refreshInventoryData();
    },
  });

  const handleDeleteProduct = async (force) => {
    if (!selectedProduct) {
      return;
    }

    try {
      await deleteMutation.mutateAsync({ id: selectedProduct._id, force });
    } catch (error) {
      if (error?.response?.data?.requiresConfirmation) {
        setDeleteNeedsConfirmation(true);
        return;
      }

      toast.error(getErrorMessage(error));
    }
  };

  const items = productsQuery.data?.items || [];
  const pagination = productsQuery.data?.pagination;
  const hasActiveFilters = Boolean(searchInput || filters.category);

  return (
    <div className="page-stack viewport-page">
      <SectionHeader
        eyebrow="Inventory catalog"
        title="Product Management"
        description="Live search, category filtering, stock-safe actions, and barcode-ready catalog data."
        action={
          <div className="inline-actions">
            <Button
              variant="secondary"
              icon={Download}
              onClick={() =>
                exportRowsToCsv(
                  items.map((item) => ({
                    name: item.name,
                    sku: item.sku,
                    category: item.category?.name,
                    supplier: item.supplier?.name || 'Not assigned',
                    quantity: item.quantity,
                    inventoryValue: item.inventoryValue,
                  })),
                  'products.csv'
                )
              }
            >
              Export Products
            </Button>
            {canCreate ? (
              <Button
                icon={Plus}
                onClick={() => {
                  setSelectedProduct(null);
                  setFormOpen(true);
                }}
              >
                Add Product
              </Button>
            ) : null}
          </div>
        }
      />

      <Card className="page-panel">
        <div className="toolbar-grid">
          <label className="field">
            <span>Search</span>
            <input
              className="input-shell"
              placeholder="Search by product name, SKU, or barcode"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
          </label>

          <label className="field">
            <span>Category</span>
            <select
              className="input-shell"
              value={filters.category}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  page: 1,
                  category: event.target.value,
                }))
              }
            >
              <option value="">All categories</option>
              {(categoriesQuery.data?.items || []).map((item) => (
                <option key={item._id} value={item._id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

        </div>

        <div className="page-panel-scroll">
        {productsQuery.isLoading ? (
          <p className="muted-copy">Loading products...</p>
        ) : items.length ? (
          <>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>SKU</th>
                    <th>Category</th>
                    <th>Supplier</th>
                    <th>Barcode</th>
                    <th>Quantity</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((product) => (
                    <tr key={product._id}>
                      <td>
                        <div className="product-name-cell">
                          <strong>{product.name}</strong>
                        </div>
                      </td>
                      <td>
                        <span className="product-code-cell">{product.sku || 'Not set'}</span>
                      </td>
                      <td>{product.category?.name}</td>
                      <td>{product.supplier?.name || 'Not assigned'}</td>
                      <td>
                        {product.barcode ? (
                          <div className="barcode-table-preview">
                            <BarcodePreview value={product.barcode} compact showLabel={false} />
                          </div>
                        ) : (
                          <span className="barcode-table-cell">Not set</span>
                        )}
                      </td>
                      <td>
                        <div className="quantity-status-cell">
                          <strong>{formatNumber(product.quantity)}</strong>
                          <StatusBadge tone={getStockTone(product.stockStatus)}>
                            {product.stockStatus}
                          </StatusBadge>
                        </div>
                      </td>
                      <td>
                        <div className="table-actions product-table-actions">
                          {canEdit ? (
                            <button
                              className="icon-button"
                              type="button"
                              onClick={() => {
                                setSelectedProduct(product);
                                setFormOpen(true);
                              }}
                            >
                              <Pencil size={16} />
                            </button>
                          ) : null}
                          {canEdit ? (
                            <button
                              className="icon-button"
                              type="button"
                              onClick={() => {
                                setSelectedProduct(product);
                                setAdjustmentOpen(true);
                              }}
                            >
                              <RefreshCw size={16} />
                            </button>
                          ) : null}
                          {canCreate ? (
                            <button
                              className="icon-button danger-icon"
                              type="button"
                              onClick={() => {
                                setSelectedProduct(product);
                                setDeleteNeedsConfirmation(false);
                                setDeleteOpen(true);
                              }}
                            >
                              <Trash2 size={16} />
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pagination-row">
              <span>
                Page {pagination?.page || 1} of {pagination?.totalPages || 1}
              </span>
              <div className="inline-actions">
                <Button
                  variant="ghost"
                  disabled={(pagination?.page || 1) <= 1}
                  onClick={() =>
                    setFilters((current) => ({
                      ...current,
                      page: current.page - 1,
                    }))
                  }
                >
                  Previous
                </Button>
                <Button
                  variant="ghost"
                  disabled={(pagination?.page || 1) >= (pagination?.totalPages || 1)}
                  onClick={() =>
                    setFilters((current) => ({
                      ...current,
                      page: current.page + 1,
                    }))
                  }
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        ) : (
          <EmptyState
            icon={Plus}
            title={hasActiveFilters ? 'No products matched your filters' : 'No products added yet'}
              description={
                hasActiveFilters
                  ? 'Try clearing one or more filters to widen the search.'
                  : 'Add your first product to start tracking stock, pricing, and barcode-ready catalog data.'
              }
            />
        )}
        </div>
      </Card>

      <ProductFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setSelectedProduct(null);
        }}
        product={selectedProduct}
        categories={categoriesQuery.data?.items || []}
        onSubmit={(payload) =>
          saveMutation.mutateAsync({
            id: selectedProduct?._id,
            payload,
          })
        }
        isSubmitting={saveMutation.isPending}
      />

      <StockAdjustmentModal
        open={adjustmentOpen}
        onClose={() => {
          setAdjustmentOpen(false);
          setSelectedProduct(null);
        }}
        product={selectedProduct}
        onSubmit={(payload) =>
          adjustmentMutation.mutateAsync({
            id: selectedProduct?._id,
            payload,
          })
        }
        isSubmitting={adjustmentMutation.isPending}
      />

      <DeleteProductModal
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setDeleteNeedsConfirmation(false);
          setSelectedProduct(null);
        }}
        product={selectedProduct}
        requiresConfirmation={deleteNeedsConfirmation}
        onDelete={handleDeleteProduct}
        isSubmitting={deleteMutation.isPending}
      />
    </div>
  );
};

export { ProductsPage };
