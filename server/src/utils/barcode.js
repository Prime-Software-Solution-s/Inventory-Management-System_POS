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

const buildProductBarcode = ({ productName = '', categoryName = '', sku = '' }) => {
  const productCode = buildBarcodeLabel(productName);
  const categoryCode = buildCategoryCode(categoryName);
  const normalizedSku = normalizeBarcodePart(sku).replace(/\s+/g, '');

  if (productCode || normalizedSku || categoryCode) {
    return `${productCode}${normalizedSku}${categoryCode}`.slice(0, 24);
  }

  return 'ITEMC';
};

module.exports = {
  buildBarcodeLabel,
  buildProductBarcode,
};
