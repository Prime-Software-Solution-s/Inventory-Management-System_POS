import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Clock3, Plus, Printer, ReceiptText, RefreshCw, Trash2 } from 'lucide-react';
import {
  createSale,
  createSaleHold,
  finalizeSaleHold,
  listProducts,
  listSales,
  releaseSaleHold,
  updateSaleHold,
} from '../../api/inventory';
import { getErrorMessage } from '../../api/client';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';
import { SectionHeader } from '../../components/common/SectionHeader';
import { StatusBadge } from '../../components/common/StatusBadge';
import { useQuickAction } from '../../hooks/useQuickAction';
import { printHtmlDocument } from '../../utils/export';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
} from '../../utils/formatters';

const emptyLine = {
  product: '',
  quantity: 1,
};

const normalizeLookupValue = (value = '') => String(value || '').trim().toUpperCase();

const getRemainingHoldMs = (holdExpiresAt, currentTime) =>
  Math.max(new Date(holdExpiresAt).getTime() - currentTime, 0);

const formatHoldCountdown = (remainingMs) => {
  const minutes = Math.floor(remainingMs / 60000);
  const seconds = Math.floor((remainingMs % 60000) / 1000);

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const getHoldReference = (sale) => `HOLD-${String(sale?._id || '').slice(-6).toUpperCase()}`;

const buildPayload = ({ customerName, lines }) => ({
  customerName,
  products: lines
    .filter((line) => line.product)
    .map((line) => ({
      product: line.product,
      quantity: Number(line.quantity),
    })),
});

const findProductMatch = (products, lookupValue) => {
  const normalizedLookup = normalizeLookupValue(lookupValue);

  if (!normalizedLookup) {
    return null;
  }

  const exactMatch = products.find(
    (product) =>
      normalizeLookupValue(product.barcode) === normalizedLookup ||
      normalizeLookupValue(product.sku) === normalizedLookup ||
      normalizeLookupValue(product.name) === normalizedLookup
  );

  if (exactMatch) {
    return exactMatch;
  }

  return products.find(
    (product) =>
      normalizeLookupValue(product.barcode).includes(normalizedLookup) ||
      normalizeLookupValue(product.sku).includes(normalizedLookup) ||
      normalizeLookupValue(product.name).includes(normalizedLookup)
  );
};

const findExactBarcodeOrSkuMatch = (products, lookupValue) => {
  const normalizedLookup = normalizeLookupValue(lookupValue);

  if (!normalizedLookup) {
    return null;
  }

  return (
    products.find(
      (product) =>
        normalizeLookupValue(product.barcode) === normalizedLookup ||
        normalizeLookupValue(product.sku) === normalizedLookup
    ) || null
  );
};

const CreateSaleModal = ({
  open,
  onClose,
  products,
  draft,
  holdDurationMinutes,
  onCreateSale,
  onHoldSale,
  onReleaseHold,
  isSubmitting,
}) => {
  const isHeldDraft = Boolean(draft?._id);
  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      customerName: '',
    },
  });
  const [lines, setLines] = useState([emptyLine]);
  const [productLookup, setProductLookup] = useState('');
  const productMap = new Map(products.map((product) => [product._id, product]));
  const reservedByDraft = new Map(
    (draft?.products || []).map((line) => [String(line.product), Number(line.quantity || 0)])
  );
  const estimatedTotal = lines.reduce((sum, line) => {
    const product = productMap.get(line.product);
    return sum + Number(product?.sellingPrice || 0) * Number(line.quantity || 0);
  }, 0);
  const remainingHoldMs = draft?.holdExpiresAt
    ? getRemainingHoldMs(draft.holdExpiresAt, Date.now())
    : 0;
  const exactLookupMatch = findExactBarcodeOrSkuMatch(products, productLookup);

  useEffect(() => {
    if (!open) {
      return;
    }

    reset({
      customerName: draft?.customerName === 'Walk-in Customer' ? '' : draft?.customerName || '',
    });
    setProductLookup('');
    setLines(
      draft?.products?.length
        ? draft.products.map((line) => ({
            product: String(line.product),
            quantity: Number(line.quantity || 1),
          }))
        : [emptyLine]
    );
  }, [draft, open, reset]);

  const getAvailableUnits = (productId) => {
    const product = productMap.get(productId);

    if (!product) {
      return 0;
    }

    return Number(product.availableQuantity ?? product.quantity ?? 0) + Number(reservedByDraft.get(productId) || 0);
  };

  const handleQuickAdd = (lookupValue = productLookup) => {
    const matchedProduct = findProductMatch(products, lookupValue);

    if (!matchedProduct) {
      toast.error('No product matched this barcode or item code.');
      return;
    }

    const availableUnits = getAvailableUnits(matchedProduct._id);

    if (availableUnits <= 0) {
      toast.error(`${matchedProduct.name} is not available for sale.`);
      return;
    }

    setLines((current) => {
      const existingIndex = current.findIndex((item) => item.product === matchedProduct._id);

      if (existingIndex >= 0) {
        const existingLine = current[existingIndex];

        if (Number(existingLine.quantity || 0) >= availableUnits) {
          toast.error(`${matchedProduct.name} does not have enough available stock.`);
          return current;
        }

        return current.map((item, itemIndex) =>
          itemIndex === existingIndex
            ? { ...item, quantity: Number(item.quantity || 0) + 1 }
            : item
        );
      }

      if (current.length === 1 && !current[0].product) {
        return [{ product: matchedProduct._id, quantity: 1 }];
      }

      return [...current, { product: matchedProduct._id, quantity: 1 }];
    });

    setProductLookup('');
  };

  useEffect(() => {
    if (!open || !productLookup || !exactLookupMatch) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      handleQuickAdd(productLookup);
    }, 120);

    return () => window.clearTimeout(timer);
  }, [exactLookupMatch, open, productLookup]);

  const submitDraft = async (values, action) => {
    const payload = buildPayload({
      customerName: values.customerName,
      lines,
    });

    if (!payload.products.length) {
      toast.error('Add at least one sale line.');
      return;
    }

    if (action === 'hold') {
      await onHoldSale(payload);
      return;
    }

    await onCreateSale(payload);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isHeldDraft ? 'Resume Held Invoice' : 'Create Sale'}
      description="Scan barcode, search by item code, hold a draft for 5 minutes, or finalize immediately."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Close
          </Button>
          {isHeldDraft ? (
            <Button variant="danger" icon={Trash2} onClick={onReleaseHold} disabled={isSubmitting}>
              Release Hold
            </Button>
          ) : null}
          <Button
            variant="secondary"
            icon={Clock3}
            onClick={handleSubmit((values) => submitDraft(values, 'hold'))}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : `Hold ${holdDurationMinutes} Min`}
          </Button>
          <Button
            icon={ReceiptText}
            onClick={handleSubmit((values) => submitDraft(values, 'finalize'))}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : isHeldDraft ? 'Finalize Sale' : 'Create Sale'}
          </Button>
        </>
      }
    >
      <div className="sale-draft-meta">
        <div className="sale-draft-chip">
          <span>{isHeldDraft ? 'Draft Ref' : 'Invoice'}</span>
          <strong>{isHeldDraft ? getHoldReference(draft) : 'New invoice'}</strong>
        </div>
        <div className="sale-draft-chip">
          <span>Estimated Total</span>
          <strong>{formatCurrency(estimatedTotal)}</strong>
        </div>
        {isHeldDraft ? (
          <div className="sale-draft-chip">
            <span>Hold Window</span>
            <strong>
              {formatHoldCountdown(remainingHoldMs)} left
            </strong>
          </div>
        ) : null}
      </div>

      {isHeldDraft ? (
        <p className="sale-draft-note">
          Reserved until {formatDateTime(draft.holdExpiresAt)}. Finalize karte waqt us waqt ka next invoice
          number assign hoga.
        </p>
      ) : null}

      <div className="sale-lookup-panel">
        <label className="field">
          <span>Scan Barcode / Item Code</span>
          <input
            className="input-shell"
            value={productLookup}
            onChange={(event) => setProductLookup(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                handleQuickAdd();
              }
            }}
            placeholder="Scan barcode or enter SKU/item code"
          />
        </label>
        <Button variant="secondary" onClick={handleQuickAdd}>
          Auto Add Item
        </Button>
      </div>

      <label className="field">
        <span>Customer Name</span>
        <input className="input-shell" {...register('customerName')} placeholder="Walk-in Customer" />
      </label>

      <div className="line-item-section">
        <div className="line-item-header">
          <strong>Products</strong>
          <Button
            size="sm"
            variant="ghost"
            icon={Plus}
            onClick={() => setLines((current) => [...current, { ...emptyLine }])}
          >
            Add Line
          </Button>
        </div>
        <div className="line-item-list">
          {lines.map((line, index) => {
            const linkedProduct = productMap.get(line.product);
            const availableUnits = line.product ? getAvailableUnits(line.product) : 0;

            return (
              <div key={`${index}-${line.product || 'empty'}`} className="sale-line-block">
                <div className="line-item-row">
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
                        {product.name} ({formatNumber(getAvailableUnits(product._id))} available)
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
                            ? { ...item, quantity: Number(event.target.value) || 1 }
                            : item
                        )
                      )
                    }
                  />
                  <div className="line-item-summary">
                    <span>{linkedProduct ? formatCurrency(linkedProduct.sellingPrice) : 'Price'}</span>
                    <strong>
                      {linkedProduct
                        ? formatCurrency(linkedProduct.sellingPrice * Number(line.quantity || 0))
                        : '$0'}
                    </strong>
                  </div>
                </div>
                <div className="sale-line-footer">
                  <span>
                    {linkedProduct
                      ? `${formatNumber(availableUnits)} available now`
                      : 'Pick a product to see available stock'}
                  </span>
                  {lines.length > 1 ? (
                    <button
                      className="sale-line-remove"
                      type="button"
                      onClick={() =>
                        setLines((current) => current.filter((_, itemIndex) => itemIndex !== index))
                      }
                    >
                      Remove line
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
};

const ReceiptModal = ({ open, onClose, sale }) => {
  if (!sale) {
    return null;
  }

  const printReceipt = () => {
    printHtmlDocument(
      sale.invoiceNumber || `Receipt-${sale._id.slice(-6)}`,
      `
        <h1>InventoryOS Receipt</h1>
        <p class="meta">Invoice: ${sale.invoiceNumber || sale._id.slice(-6)}</p>
        <p class="meta">Customer: ${sale.customerName || 'Walk-in Customer'} | Date: ${formatDateTime(
          sale.createdAt
        )}</p>
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th>Quantity</th>
              <th>Unit Price</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${sale.products
              .map(
                (line) => `
                  <tr>
                    <td>${line.name}</td>
                    <td>${line.sku}</td>
                    <td>${line.quantity}</td>
                    <td>${formatCurrency(line.sellingPrice)}</td>
                    <td>${formatCurrency(line.subtotal)}</td>
                  </tr>
                `
              )
              .join('')}
          </tbody>
        </table>
        <h2>Total: ${formatCurrency(sale.totalPrice)}</h2>
      `
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Receipt / Invoice"
      description="Printable sale summary for the completed transaction."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button icon={Printer} onClick={printReceipt}>
            Print Receipt
          </Button>
        </>
      }
    >
      <div className="details-list">
        <div>
          <span>Invoice Number</span>
          <strong>{sale.invoiceNumber || sale._id.slice(-6)}</strong>
        </div>
        <div>
          <span>Customer</span>
          <strong>{sale.customerName || 'Walk-in Customer'}</strong>
        </div>
        <div>
          <span>Sale Date</span>
          <strong>{formatDateTime(sale.createdAt)}</strong>
        </div>
        <div>
          <span>Total Price</span>
          <strong>{formatCurrency(sale.totalPrice)}</strong>
        </div>
        <div className="linked-product-list">
          {sale.products.map((line) => (
            <article key={`${sale._id}-${line.product}`} className="linked-product-row">
              <div>
                <strong>{line.name}</strong>
                <p>{line.sku}</p>
              </div>
              <span>
                {line.quantity} x {formatCurrency(line.sellingPrice)}
              </span>
            </article>
          ))}
        </div>
      </div>
    </Modal>
  );
};

const SalesPage = () => {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [activeDraft, setActiveDraft] = useState(null);
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  useQuickAction('add-sale', () => {
    setActiveDraft(null);
    setFormOpen(true);
  });

  const salesQuery = useQuery({
    queryKey: ['sales'],
    queryFn: () => listSales(),
    refetchInterval: (query) => (query.state.data?.heldItems?.length ? 10000 : false),
  });

  const productsQuery = useQuery({
    queryKey: ['products', 'sales-options'],
    queryFn: () => listProducts({ limit: 100, page: 1 }),
  });

  const refreshSaleData = () => {
    queryClient.invalidateQueries({ queryKey: ['sales'] });
    queryClient.invalidateQueries({ queryKey: ['products'] });
    queryClient.invalidateQueries({ queryKey: ['stock'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    queryClient.invalidateQueries({ queryKey: ['reports'] });
  };

  const handleCompletedSale = (sale, message) => {
    toast.success(message);
    setFormOpen(false);
    setActiveDraft(null);
    setSelectedSale(sale);
    setReceiptOpen(true);
    refreshSaleData();
  };

  const handleHeldSaleSaved = (message) => {
    toast.success(message);
    setFormOpen(false);
    setActiveDraft(null);
    refreshSaleData();
  };

  const createSaleMutation = useMutation({
    mutationFn: createSale,
    onSuccess: (sale) => handleCompletedSale(sale, 'Sale created successfully.'),
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const holdSaleMutation = useMutation({
    mutationFn: ({ draft, payload }) =>
      draft?._id ? updateSaleHold({ id: draft._id, payload }) : createSaleHold(payload),
    onSuccess: (_sale, variables) =>
      handleHeldSaleSaved(variables.draft?._id ? 'Invoice hold updated.' : 'Invoice placed on hold.'),
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const finalizeHoldMutation = useMutation({
    mutationFn: ({ id, payload }) => finalizeSaleHold({ id, payload }),
    onSuccess: (sale) => handleCompletedSale(sale, 'Held invoice finalized.'),
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const releaseHoldMutation = useMutation({
    mutationFn: releaseSaleHold,
    onSuccess: () => {
      toast.success('Invoice hold released.');
      setFormOpen(false);
      setActiveDraft(null);
      refreshSaleData();
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const sales = salesQuery.data?.items || [];
  const heldSales = salesQuery.data?.heldItems || [];
  const holdDurationMinutes = salesQuery.data?.holdDurationMinutes || 5;
  const isSubmitting =
    createSaleMutation.isPending ||
    holdSaleMutation.isPending ||
    finalizeHoldMutation.isPending ||
    releaseHoldMutation.isPending;

  return (
    <div className="page-stack viewport-page">
      <SectionHeader
        eyebrow="Outbound flow"
        title="Sales Orders"
        description="Create invoices, scan barcode or item code to add products, and hold drafts for 5 minutes without consuming invoice numbers."
        action={
          <div className="inline-actions">
            <Button
              variant="secondary"
              icon={ReceiptText}
              onClick={() => {
                setActiveDraft(null);
                setFormOpen(true);
              }}
            >
              Generate Invoice
            </Button>
            <Button
              icon={Plus}
              onClick={() => {
                setActiveDraft(null);
                setFormOpen(true);
              }}
            >
              Create Sale
            </Button>
          </div>
        }
      />

      {heldSales.length ? (
        <Card className="page-panel">
          <div className="page-panel-scroll">
            <div className="line-item-header">
              <strong>Held Invoices</strong>
              <span className="muted-copy">
                Stock stays reserved for {holdDurationMinutes} minutes. Invoice number finalize par assign hoga.
              </span>
            </div>
            <div className="stock-alert-list">
              {heldSales.map((sale) => {
                const remainingHoldMs = getRemainingHoldMs(sale.holdExpiresAt, currentTime);

                return (
                  <article key={sale._id} className="stock-alert-item sale-hold-card">
                    <div className="stock-alert-main">
                      <div className="tile-icon">
                        <Clock3 size={18} />
                      </div>
                      <div>
                        <strong>{getHoldReference(sale)}</strong>
                        <p>
                          {sale.customerName || 'Walk-in Customer'} | {sale.products.length} items |{' '}
                          {formatCurrency(sale.totalPrice)}
                        </p>
                        <p>Held until {formatDateTime(sale.holdExpiresAt)}</p>
                      </div>
                    </div>
                    <div className="stock-alert-meta sale-hold-meta">
                      <StatusBadge tone="warning">On Hold</StatusBadge>
                      <strong>{formatHoldCountdown(remainingHoldMs)} left</strong>
                    </div>
                    <div className="inline-actions wrap-actions">
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={RefreshCw}
                        onClick={() => {
                          setActiveDraft(sale);
                          setFormOpen(true);
                        }}
                      >
                        Resume
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={Trash2}
                        onClick={() => releaseHoldMutation.mutate(sale._id)}
                        disabled={releaseHoldMutation.isPending}
                      >
                        Release
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </Card>
      ) : null}

      <Card className="page-panel">
        <div className="page-panel-scroll">
          {salesQuery.isLoading ? (
            <p className="muted-copy">Loading sales history...</p>
          ) : sales.length ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th>Customer</th>
                    <th>Date</th>
                    <th>Products</th>
                    <th>Total</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((sale) => (
                    <tr key={sale._id}>
                      <td>{sale.invoiceNumber || sale._id.slice(-6)}</td>
                      <td>{sale.customerName || 'Walk-in Customer'}</td>
                      <td>{formatDate(sale.createdAt)}</td>
                      <td>{sale.products.length} items</td>
                      <td>{formatCurrency(sale.totalPrice)}</td>
                      <td>
                        <div className="inline-actions wrap-actions">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedSale(sale);
                              setReceiptOpen(true);
                            }}
                          >
                            View
                          </Button>
                          <Button
                            size="sm"
                            icon={Printer}
                            onClick={() => {
                              setSelectedSale(sale);
                              setReceiptOpen(true);
                            }}
                          >
                            Print Receipt
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              icon={ReceiptText}
              title="No sales recorded"
              description="Create the first sale or put an invoice on hold to start tracking revenue and reservations."
            />
          )}
        </div>
      </Card>

      <CreateSaleModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setActiveDraft(null);
        }}
        products={productsQuery.data?.items || []}
        draft={activeDraft}
        holdDurationMinutes={holdDurationMinutes}
        onCreateSale={(payload) =>
          activeDraft?._id
            ? finalizeHoldMutation.mutateAsync({ id: activeDraft._id, payload })
            : createSaleMutation.mutateAsync(payload)
        }
        onHoldSale={(payload) => holdSaleMutation.mutateAsync({ draft: activeDraft, payload })}
        onReleaseHold={() => {
          if (!activeDraft?._id) {
            return Promise.resolve();
          }

          return releaseHoldMutation.mutateAsync(activeDraft._id);
        }}
        isSubmitting={isSubmitting}
      />

      <ReceiptModal
        open={receiptOpen}
        onClose={() => {
          setReceiptOpen(false);
          setSelectedSale(null);
        }}
        sale={selectedSale}
      />
    </div>
  );
};

export { SalesPage };
