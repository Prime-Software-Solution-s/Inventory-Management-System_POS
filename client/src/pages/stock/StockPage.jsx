import { useDeferredValue, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { listProducts } from '../../api/inventory';
import { Card } from '../../components/common/Card';
import { EmptyState } from '../../components/common/EmptyState';
import { SectionHeader } from '../../components/common/SectionHeader';
import { StatusBadge } from '../../components/common/StatusBadge';
import { formatDateTime, formatNumber, getStockTone } from '../../utils/formatters';

const StockPage = () => {
  const [searchInput, setSearchInput] = useState('');
  const deferredSearch = useDeferredValue(searchInput);

  const stockQuery = useQuery({
    queryKey: ['stock', deferredSearch],
    queryFn: () =>
      listProducts({
        limit: 20,
        page: 1,
        sortBy: 'quantity:asc',
        search: deferredSearch,
      }),
  });

  const items = stockQuery.data?.items || [];

  return (
    <div className="page-stack viewport-page">
      <SectionHeader
        eyebrow="Warehouse health"
        title="Stock Overview"
        description="Track depletion, warehouse locations, and the latest stock update time."
      />

      <Card className="page-panel">
        <div className="toolbar-grid single-toolbar">
          <label className="field">
            <span>Live Search</span>
            <input
              className="input-shell"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search products by name or SKU"
            />
          </label>
        </div>

        <div className="page-panel-scroll">
          {stockQuery.isLoading ? (
            <p className="muted-copy">Loading stock overview...</p>
          ) : items.length ? (
            <div className="table-wrap">
              <table className="data-table stock-data-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>SKU</th>
                    <th>Location</th>
                    <th>Status</th>
                    <th>Quantity</th>
                    <th>Last Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((product) => (
                    <tr key={product._id}>
                      <td>
                        <strong>{product.name}</strong>
                      </td>
                      <td>
                        <span className="product-code-cell">{product.sku || 'Not set'}</span>
                      </td>
                      <td>{product.location || 'Not set'}</td>
                      <td>
                        <StatusBadge tone={getStockTone(product.stockStatus)}>
                          {product.stockStatus}
                        </StatusBadge>
                      </td>
                      <td>{formatNumber(product.quantity)} units</td>
                      <td>
                        <span className="stock-updated-cell">
                          {formatDateTime(product.updatedAt || product.createdAt)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              icon={AlertTriangle}
              title="No stock records to review"
              description="Add products first to start monitoring warehouse stock updates."
            />
          )}
        </div>
      </Card>
    </div>
  );
};

export { StockPage };
