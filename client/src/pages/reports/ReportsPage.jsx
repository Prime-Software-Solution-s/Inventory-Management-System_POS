import { useQuery } from '@tanstack/react-query';
import { Download, FileDown, FileText } from 'lucide-react';
import { getReports } from '../../api/inventory';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { EmptyState } from '../../components/common/EmptyState';
import { SectionHeader } from '../../components/common/SectionHeader';
import { SalesTrendChart } from '../../components/charts/SalesTrendChart';
import { TopProductsChart } from '../../components/charts/TopProductsChart';
import { exportRowsToCsv, printHtmlDocument } from '../../utils/export';
import { formatCurrency, formatNumber } from '../../utils/formatters';

const ReportsPage = () => {
  const reportsQuery = useQuery({
    queryKey: ['reports'],
    queryFn: getReports,
  });

  const reportData = reportsQuery.data;
  const monthlySales =
    reportData?.monthlySales.map((item) => ({
      label: `${item._id.month}/${String(item._id.year).slice(-2)}`,
      sales: item.revenue,
      orders: item.orders,
    })) || [];
  const hasReportData =
    Boolean(reportData?.inventory?.totalProducts) ||
    Boolean(reportData?.topProducts?.length) ||
    Boolean(reportData?.monthlySales?.length);

  const exportCsv = () => {
    exportRowsToCsv(
      (reportData?.topProducts || []).map((item) => ({
        product: item.name,
        quantitySold: item.quantity,
        revenue: item.revenue,
      })),
      'inventory-report-top-products.csv'
    );
  };

  const exportPdf = () => {
    printHtmlDocument(
      'Inventory Report',
      `
        <h1>InventoryOS Summary Report</h1>
        <p class="meta">Management snapshot for inventory, sales, and supplier operations.</p>
        <h2>Inventory Value: ${formatCurrency(reportData?.inventory?.inventoryValue)}</h2>
        <h2>Units in Stock: ${formatNumber(reportData?.inventory?.unitsInStock)}</h2>
        <table>
          <thead>
            <tr>
              <th>Top Product</th>
              <th>Quantity Sold</th>
              <th>Revenue</th>
            </tr>
          </thead>
          <tbody>
            ${(reportData?.topProducts || [])
              .map(
                (item) => `
                  <tr>
                    <td>${item.name}</td>
                    <td>${item.quantity}</td>
                    <td>${formatCurrency(item.revenue)}</td>
                  </tr>
                `
              )
              .join('')}
          </tbody>
        </table>
      `
    );
  };

  const downloadReport = () => {
    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
      type: 'application/json;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = 'inventory-report.json';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page-stack viewport-page">
      <SectionHeader
        eyebrow="Management reporting"
        title="Reports & Analytics"
        description="Monthly sales, low stock trends, top products, and supplier spend."
        action={
          <div className="inline-actions">
            <Button variant="secondary" icon={FileText} onClick={exportPdf}>
              Export PDF
            </Button>
            <Button variant="secondary" icon={Download} onClick={exportCsv}>
              Export CSV
            </Button>
            <Button icon={FileDown} onClick={downloadReport}>
              Download Report
            </Button>
          </div>
        }
      />

      <Card className="page-panel">
        <div className="page-panel-scroll">
          {reportsQuery.isLoading ? (
            <p className="muted-copy">Loading reports...</p>
          ) : hasReportData ? (
            <div className="page-panel-stack">
              <div className="content-grid two-up">
                <Card>
                  <SectionHeader
                    eyebrow="Sales"
                    title="Monthly Revenue"
                    description="Trendline of recorded sales across reporting periods."
                  />
                  <SalesTrendChart data={monthlySales} />
                </Card>
                <Card>
                  <SectionHeader
                    eyebrow="Top products"
                    title="Best Sellers"
                    description="Products with the highest sold quantities."
                  />
                  <TopProductsChart
                    data={(reportData?.topProducts || []).map((item) => ({
                      name: item.name,
                      sold: item.quantity,
                    }))}
                  />
                </Card>
              </div>

              <div className="content-grid two-up">
                <Card>
                  <SectionHeader
                    eyebrow="Low stock trends"
                    title="Current stock health"
                    description="Snapshot of products currently healthy, low, or out of stock."
                  />
                  <div className="linked-product-list">
                    {(reportData?.lowStockTrends || []).map((item) => (
                      <article key={item._id} className="linked-product-row">
                        <div>
                          <strong>{item._id}</strong>
                          <p>Current inventory status bucket</p>
                        </div>
                        <span>{item.count} products</span>
                      </article>
                    ))}
                  </div>
                </Card>

                <Card>
                  <SectionHeader
                    eyebrow="Supplier spend"
                    title="Vendor performance"
                    description="Total purchase order spend and order count by supplier."
                  />
                  <div className="linked-product-list">
                    {(reportData?.supplierReports || []).map((item) => (
                      <article key={String(item._id)} className="linked-product-row">
                        <div>
                          <strong>{item.supplier?.name || 'Unknown supplier'}</strong>
                          <p>{item.orders} purchase orders</p>
                        </div>
                        <span>{formatCurrency(item.spend)}</span>
                      </article>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={FileText}
              title="No report data available yet"
              description="Create products, purchase orders, and sales to populate management reporting."
            />
          )}
        </div>
      </Card>
    </div>
  );
};

export { ReportsPage };
