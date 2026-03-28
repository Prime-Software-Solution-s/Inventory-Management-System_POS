import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CalendarRange,
  Boxes,
  CircleAlert,
  DollarSign,
  Layers3,
  PackageSearch,
  Truck,
} from 'lucide-react';
import { getDashboard } from '../../api/inventory';
import { Card } from '../../components/common/Card';
import { MetricCard } from '../../components/common/MetricCard';
import { SectionHeader } from '../../components/common/SectionHeader';
import { StatusBadge } from '../../components/common/StatusBadge';
import { formatCompactNumber, formatCurrency, formatDate } from '../../utils/formatters';

const formatMonthInputValue = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const formatDateInputValue = (date) => {
  const normalized = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return normalized.toISOString().slice(0, 10);
};

const DashboardPage = () => {
  const today = new Date();
  const currentMonthValue = formatMonthInputValue(today);
  const monthStartValue = formatDateInputValue(new Date(today.getFullYear(), today.getMonth(), 1));
  const todayValue = formatDateInputValue(today);
  const [filterMode, setFilterMode] = useState('current');
  const [selectedMonth, setSelectedMonth] = useState(currentMonthValue);
  const [customRange, setCustomRange] = useState({
    startDate: monthStartValue,
    endDate: todayValue,
  });
  const isCustomRangeValid =
    Boolean(customRange.startDate && customRange.endDate) &&
    customRange.startDate <= customRange.endDate;
  const dashboardFilters =
    filterMode === 'custom'
      ? {
          mode: 'custom',
          startDate: customRange.startDate,
          endDate: customRange.endDate,
        }
      : {
          mode: 'month',
          month: filterMode === 'current' ? currentMonthValue : selectedMonth,
        };

  const dashboardQuery = useQuery({
    queryKey: ['dashboard', dashboardFilters],
    queryFn: () => getDashboard(dashboardFilters),
    enabled: filterMode !== 'custom' || isCustomRangeValid,
  });

  const stats = dashboardQuery.data?.stats;
  const activity = dashboardQuery.data?.activity || [];
  const topProducts = dashboardQuery.data?.charts?.topProducts || [];
  const dashboardMeta = dashboardQuery.data?.meta;
  const salesMetricTitle = filterMode === 'custom' ? 'Range Sales' : 'Monthly Sales';
  const salesMetricDetail =
    filterMode === 'custom'
      ? 'Sales in selected date range.'
      : 'Sales in selected month.';
  const filterStatusLabel =
    dashboardMeta?.snapshotSource === 'backfill'
      ? 'Saved Snapshot'
      : dashboardMeta?.snapshotSource === 'live'
        ? 'Live Snapshot'
        : 'Dashboard Filter';
  const filterDescription =
    filterMode === 'custom'
      ? 'Custom range recalculates dashboard sales, charts, and activity without touching saved monthly snapshots.'
      : dashboardMeta?.snapshotSource === 'backfill'
        ? 'This month was backfilled into saved dashboard history so it can be reopened anytime from the month filter.'
        : 'Current month stays live, is saved as a monthly snapshot, and next month refreshes automatically.';

  const handleFilterModeChange = (nextMode) => {
    setFilterMode(nextMode);

    if (nextMode === 'current') {
      setSelectedMonth(currentMonthValue);
    }
  };

  return (
    <div className="page-stack dashboard-page">
      <Card className="dashboard-filter-bar">
        <div className="dashboard-filter-copy">
          <div className="dashboard-filter-head">
            <span className="section-eyebrow">Filter by date</span>
            <span className="dashboard-filter-status">
              <CalendarRange size={14} />
              {filterStatusLabel}
            </span>
          </div>
          <strong>{dashboardMeta?.scopeLabel || 'Current month dashboard snapshot'}</strong>
          <p>{filterDescription}</p>
        </div>

        <div className="dashboard-filter-controls">
          <div className="dashboard-filter-tabs">
            <button
              className={`dashboard-filter-tab ${filterMode === 'current' ? 'dashboard-filter-tab-active' : ''}`}
              type="button"
              onClick={() => handleFilterModeChange('current')}
            >
              Current Month
            </button>
            <button
              className={`dashboard-filter-tab ${filterMode === 'month' ? 'dashboard-filter-tab-active' : ''}`}
              type="button"
              onClick={() => handleFilterModeChange('month')}
            >
              By Month
            </button>
            <button
              className={`dashboard-filter-tab ${filterMode === 'custom' ? 'dashboard-filter-tab-active' : ''}`}
              type="button"
              onClick={() => handleFilterModeChange('custom')}
            >
              Custom Range
            </button>
          </div>

          <div className="dashboard-filter-inputs">
            {filterMode === 'month' ? (
              <label className="field dashboard-filter-field">
                <span>Select Month</span>
                <input
                  className="input-shell"
                  type="month"
                  max={currentMonthValue}
                  value={selectedMonth}
                  onChange={(event) => setSelectedMonth(event.target.value)}
                />
              </label>
            ) : null}

            {filterMode === 'custom' ? (
              <>
                <label className="field dashboard-filter-field">
                  <span>Start Date</span>
                  <input
                    className="input-shell"
                    type="date"
                    max={customRange.endDate || todayValue}
                    value={customRange.startDate}
                    onChange={(event) =>
                      setCustomRange((current) => ({
                        ...current,
                        startDate: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="field dashboard-filter-field">
                  <span>End Date</span>
                  <input
                    className="input-shell"
                    type="date"
                    max={todayValue}
                    min={customRange.startDate || undefined}
                    value={customRange.endDate}
                    onChange={(event) =>
                      setCustomRange((current) => ({
                        ...current,
                        endDate: event.target.value,
                      }))
                    }
                  />
                </label>
              </>
            ) : null}
          </div>
        </div>
      </Card>

      {!isCustomRangeValid && filterMode === 'custom' ? (
        <p className="muted-copy">Choose a valid custom date range to load dashboard data.</p>
      ) : null}

      <div className="metric-grid dashboard-metrics">
        <MetricCard
          title="Total Products"
          value={formatCompactNumber(stats?.totalProducts)}
          detail="Active catalog SKUs"
          icon={Boxes}
          accent="blue"
        />
        <MetricCard
          title="Low Stock"
          value={formatCompactNumber(stats?.lowStockItems)}
          detail="Below threshold, needs action"
          icon={CircleAlert}
          accent="amber"
        />
        <MetricCard
          title="Out of Stock"
          value={formatCompactNumber(stats?.outOfStock)}
          detail="Unavailable for sale"
          icon={PackageSearch}
          accent="red"
        />
        <MetricCard
          title="Categories"
          value={formatCompactNumber(stats?.totalCategories)}
          detail="Structured product groups"
          icon={Layers3}
          accent="teal"
        />
        <MetricCard
          title="Suppliers"
          value={formatCompactNumber(stats?.totalSuppliers)}
          detail="Active vendor partners"
          icon={Truck}
          accent="indigo"
        />
        <MetricCard
          title={salesMetricTitle}
          value={formatCurrency(stats?.monthlySales)}
          detail={salesMetricDetail}
          icon={DollarSign}
          accent="green"
        />
      </div>

      <div className="content-grid two-up dashboard-bottom-grid">
        <Card className="dashboard-mini-card">
          <SectionHeader
            eyebrow="Activity timeline"
            title="Recent operational updates"
            description="Notifications generated by inventory, sales, and purchasing events."
          />
          <div className="dashboard-mini-scroll">
            {activity.length ? (
              <div className="timeline-list dashboard-timeline-list">
                {activity.map((entry) => (
                  <article key={entry._id} className="timeline-item">
                    <div className="timeline-dot" />
                    <div>
                      <div className="timeline-head">
                        <strong>{entry.title}</strong>
                        <StatusBadge tone={entry.type === 'critical' ? 'danger' : entry.type === 'warning' ? 'warning' : 'neutral'}>
                          {entry.type}
                        </StatusBadge>
                      </div>
                      <p>{entry.message}</p>
                      <span>{formatDate(entry.createdAt)}</span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="muted-copy dashboard-mini-empty">No recent activity yet.</p>
              
            )}
          </div>
        </Card>

        <Card className="dashboard-mini-card">
          <SectionHeader
            eyebrow="Inventory value"
            title="At-a-glance financial health"
            description="Quick operational indicators for finance and replenishment planning."
          />
          <div className="dashboard-mini-scroll">
            <div className="value-panel dashboard-value-panel">
              <div>
                <span>Inventory Value</span>
                <strong>{formatCurrency(stats?.inventoryValue)}</strong>
              </div>
              <div>
                <span>Monthly Sales</span>
                <strong>{formatCurrency(stats?.monthlySales)}</strong>
              </div>
              <div>
                <span>Low Stock Count</span>
                <strong>{stats?.lowStockItems || 0}</strong>
              </div>
            </div>

            <div className="top-product-list dashboard-top-product-list">
              {topProducts.map((item) => (
                <article key={item._id} className="top-product-row">
                  <div>
                    <strong>{item.name}</strong>
                    <p>{item.sold} units sold</p>
                  </div>
                  <span>{formatCurrency(item.revenue)}</span>
                </article>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {dashboardQuery.isLoading ? <p className="muted-copy">Loading dashboard...</p> : null}
    </div>
  );
};

export { DashboardPage };
