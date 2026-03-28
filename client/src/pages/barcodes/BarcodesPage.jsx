import { useDeferredValue, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Printer } from 'lucide-react';
import { listCategories, listProducts } from '../../api/inventory';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { BarcodePreview } from '../../components/common/BarcodePreview';
import { EmptyState } from '../../components/common/EmptyState';
import { SectionHeader } from '../../components/common/SectionHeader';
import { printHtmlDocument } from '../../utils/export';
import { buildBarcodeMarkup } from '../../utils/barcode';

const printProductBarcodes = (products, title = 'Product Barcodes') => {
  if (!products.length) {
    return;
  }

  const html = `
    <style>
      .barcode-print-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 20px;
      }

      .barcode-print-item {
        border: 1px solid #cbd5e1;
        border-radius: 18px;
        padding: 18px;
      }

      .barcode-print-svg svg {
        width: 100%;
        height: 78px;
      }

      .barcode-print-item strong,
      .barcode-print-item span,
      .barcode-print-item small {
        display: block;
        text-align: center;
      }

      .barcode-print-item strong {
        margin-top: 10px;
        font-size: 18px;
      }

      .barcode-print-item span {
        margin-top: 6px;
        color: #64748b;
      }

      .barcode-print-item small {
        margin-top: 4px;
        color: #94a3b8;
        font-size: 12px;
      }
    </style>
    <section class="barcode-print-grid">
      ${products
        .map((product) =>
          buildBarcodeMarkup({
            value: product.barcode,
            caption: product.name,
            showLabel: false,
          })
        )
        .join('')}
    </section>
  `;

  printHtmlDocument(title, html);
};

const BarcodesPage = () => {
  const [searchInput, setSearchInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const deferredSearch = useDeferredValue(searchInput);

  const categoriesQuery = useQuery({
    queryKey: ['categories', 'barcode-center'],
    queryFn: listCategories,
  });

  const productsQuery = useQuery({
    queryKey: ['products', 'barcode-center', deferredSearch, selectedCategory],
    queryFn: () =>
      listProducts({
        limit: 100,
        page: 1,
        search: deferredSearch,
        category: selectedCategory,
        sortBy: 'name:asc',
      }),
  });

  const items = productsQuery.data?.items || [];
  const categories = categoriesQuery.data?.items || [];
  const selectedCategoryItem = categories.find((item) => item._id === selectedCategory);
  const printTitle = selectedCategoryItem ? `${selectedCategoryItem.name} Barcodes` : 'Product Barcodes';

  return (
    <div className="page-stack viewport-page">
      <SectionHeader
        eyebrow="Label printing"
        title="Barcode Center"
        description="Search products by name, review generated barcodes, and print labels for existing items."
        action={
          <Button
            icon={Printer}
            variant="secondary"
            onClick={() => printProductBarcodes(items, printTitle)}
            disabled={!items.length}
          >
            {selectedCategory ? 'Print Selected Category' : 'Print Visible'}
          </Button>
        }
      />

      <Card className="page-panel">
        <div className="toolbar-grid">
          <label className="field">
            <span>Search Products</span>
            <input
              className="input-shell"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search by product name, item code, or barcode"
            />
          </label>
          <label className="field">
            <span>Select Category</span>
            <select
              className="input-shell"
              value={selectedCategory}
              onChange={(event) => setSelectedCategory(event.target.value)}
            >
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category._id} value={category._id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="page-panel-scroll">
          {productsQuery.isLoading ? (
            <p className="muted-copy">Loading barcodes...</p>
          ) : items.length ? (
            <div className="barcode-grid">
              {items.map((product) => (
                <article key={product._id} className="barcode-surface">
                  <BarcodePreview value={product.barcode} caption={product.name} showLabel={false} />
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Printer}
              title="No barcodes to print"
              description="Add products first, then search them here and print barcode labels."
            />
          )}
        </div>
      </Card>
    </div>
  );
};

export { BarcodesPage };
