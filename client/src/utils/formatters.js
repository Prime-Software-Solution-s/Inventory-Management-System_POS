import { getApiRoot } from '../api/client';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const compactNumberFormatter = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

const formatCurrency = (value) => currencyFormatter.format(Number(value || 0));
const formatCompactNumber = (value) => compactNumberFormatter.format(Number(value || 0));
const formatNumber = (value) => Number(value || 0).toLocaleString('en-US');

const formatDate = (value) =>
  new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

const formatDateTime = (value) =>
  new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

const resolveImageUrl = (url) => {
  if (!url) {
    return '';
  }

  if (url.startsWith('http')) {
    return url;
  }

  return `${getApiRoot()}${url}`;
};

const getStockTone = (status) => {
  if (status === 'out-of-stock') {
    return 'danger';
  }

  if (status === 'low-stock') {
    return 'warning';
  }

  return 'success';
};

export {
  formatCompactNumber,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  getStockTone,
  resolveImageUrl,
};
