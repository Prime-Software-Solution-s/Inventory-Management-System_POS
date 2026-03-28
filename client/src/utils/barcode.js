import JsBarcode from 'jsbarcode';

const normalizeBarcodePart = (value = '') =>
  String(value)
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, ' ')
    .trim();

const getLeadingCharacter = (value = '') => {
  const normalizedValue = String(value || '').toUpperCase();
  const alphaMatch = normalizedValue.match(/[A-Z]/);

  return alphaMatch?.[0] || normalizedValue[0] || '';
};

const buildInitials = (value = '', fallback = 'PRD') => {
  const words = normalizeBarcodePart(value).split(/\s+/).filter(Boolean);

  if (!words.length) {
    return fallback;
  }

  return words
    .slice(0, 2)
    .map((word) => getLeadingCharacter(word))
    .join('')
    .slice(0, 2);
};

const buildCategoryCode = (categoryName = '', fallback = 'C') => {
  const words = normalizeBarcodePart(categoryName).split(/\s+/).filter(Boolean);

  if (!words.length) {
    return fallback;
  }

  return getLeadingCharacter(words[0]) || fallback;
};

const buildBarcodeLabel = (productName = '') => buildInitials(productName, 'IT');

const buildProductBarcodePreview = ({ productName = '', categoryName = '', sku = '' }) => {
  const productCode = buildBarcodeLabel(productName);
  const categoryCode = buildCategoryCode(categoryName);
  const normalizedSku = normalizeBarcodePart(sku).replace(/\s+/g, '');

  if (productCode || normalizedSku || categoryCode) {
    return `${productCode}${normalizedSku}${categoryCode}`.slice(0, 24);
  }

  return 'ITEMC';
};

const renderBarcodeSvg = (svgElement, value, options = {}) => {
  if (!svgElement) {
    return;
  }

  svgElement.innerHTML = '';

  if (!value) {
    return;
  }

  const { compact = false, lineColor = '#0f172a' } = options;

  JsBarcode(svgElement, value, {
    background: 'transparent',
    displayValue: false,
    format: 'CODE128',
    height: compact ? 44 : 64,
    lineColor,
    margin: 0,
    width: compact ? 1.2 : 1.55,
  });
};

const buildBarcodeMarkup = ({
  label,
  value,
  caption,
  showLabel = true,
  showValue = true,
}) => {
  if (typeof document === 'undefined' || !value) {
    return '';
  }

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  renderBarcodeSvg(svg, value);

  return `
    <article class="barcode-print-item">
      <div class="barcode-print-svg">${svg.outerHTML}</div>
      ${showLabel && label ? `<strong>${label}</strong>` : ''}
      ${showValue ? `<span>${value}</span>` : ''}
      ${caption ? `<small>${caption}</small>` : ''}
    </article>
  `;
};

export {
  buildBarcodeLabel,
  buildBarcodeMarkup,
  buildProductBarcodePreview,
  renderBarcodeSvg,
};
