import { api } from './client';

const serializeQuery = (params = {}) =>
  Object.fromEntries(Object.entries(params).filter(([, value]) => value !== '' && value !== undefined));

const getDashboard = async (params) => {
  const { data } = await api.get('/dashboard', {
    params: serializeQuery(params),
  });
  return data;
};

const listProducts = async (params) => {
  const { data } = await api.get('/products', { params: serializeQuery(params) });
  return data;
};

const getProduct = async (id) => {
  const { data } = await api.get(`/products/${id}`);
  return data;
};

const createProduct = async (payload) => {
  const { data } = await api.post('/products', payload);
  return data;
};

const updateProduct = async ({ id, payload }) => {
  const { data } = await api.put(`/products/${id}`, payload);
  return data;
};

const deleteProduct = async ({ id, force = false }) => {
  const { data } = await api.delete(`/products/${id}`, {
    params: force ? { force: true } : undefined,
  });
  return data;
};

const adjustProductStock = async ({ id, payload }) => {
  const { data } = await api.post(`/products/${id}/adjust-stock`, payload);
  return data;
};

const uploadImage = async (file) => {
  const formData = new FormData();
  formData.append('image', file);
  const { data } = await api.post('/uploads', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return data;
};

const listCategories = async () => {
  const { data } = await api.get('/categories');
  return data;
};

const createCategory = async (payload) => {
  const { data } = await api.post('/categories', payload);
  return data;
};

const updateCategory = async ({ id, payload }) => {
  const { data } = await api.put(`/categories/${id}`, payload);
  return data;
};

const deleteCategory = async (id) => {
  const { data } = await api.delete(`/categories/${id}`);
  return data;
};

const listSuppliers = async () => {
  const { data } = await api.get('/suppliers');
  return data;
};

const getSupplier = async (id) => {
  const { data } = await api.get(`/suppliers/${id}`);
  return data;
};

const createSupplier = async (payload) => {
  const { data } = await api.post('/suppliers', payload);
  return data;
};

const updateSupplier = async ({ id, payload }) => {
  const { data } = await api.put(`/suppliers/${id}`, payload);
  return data;
};

const deleteSupplier = async (id) => {
  const { data } = await api.delete(`/suppliers/${id}`);
  return data;
};

const listPurchaseOrders = async (params) => {
  const { data } = await api.get('/purchase-orders', {
    params: serializeQuery(params),
  });
  return data;
};

const getPurchaseOrder = async (id) => {
  const { data } = await api.get(`/purchase-orders/${id}`);
  return data;
};

const createPurchaseOrder = async (payload) => {
  const { data } = await api.post('/purchase-orders', payload);
  return data;
};

const updatePurchaseOrderStatus = async ({ id, status }) => {
  const { data } = await api.patch(`/purchase-orders/${id}/status`, { status });
  return data;
};

const listSales = async (params) => {
  const { data } = await api.get('/sales', { params: serializeQuery(params) });
  return data;
};

const getSale = async (id) => {
  const { data } = await api.get(`/sales/${id}`);
  return data;
};

const createSale = async (payload) => {
  const { data } = await api.post('/sales', payload);
  return data;
};

const createSaleHold = async (payload) => {
  const { data } = await api.post('/sales/hold', payload);
  return data;
};

const updateSaleHold = async ({ id, payload }) => {
  const { data } = await api.patch(`/sales/${id}/hold`, payload);
  return data;
};

const finalizeSaleHold = async ({ id, payload }) => {
  const { data } = await api.post(`/sales/${id}/finalize`, payload);
  return data;
};

const releaseSaleHold = async (id) => {
  const { data } = await api.delete(`/sales/${id}/hold`);
  return data;
};

const getReports = async () => {
  const { data } = await api.get('/reports');
  return data;
};

const listNotifications = async () => {
  const { data } = await api.get('/notifications');
  return data;
};

const markNotificationRead = async (id) => {
  const { data } = await api.patch(`/notifications/${id}/read`);
  return data;
};

const markAllNotificationsRead = async () => {
  const { data } = await api.patch('/notifications/read-all');
  return data;
};

export {
  adjustProductStock,
  createCategory,
  createProduct,
  createPurchaseOrder,
  createSale,
  createSaleHold,
  createSupplier,
  deleteCategory,
  deleteProduct,
  deleteSupplier,
  finalizeSaleHold,
  getDashboard,
  getProduct,
  getPurchaseOrder,
  getReports,
  getSale,
  getSupplier,
  listCategories,
  listNotifications,
  listProducts,
  listPurchaseOrders,
  listSales,
  listSuppliers,
  markAllNotificationsRead,
  markNotificationRead,
  releaseSaleHold,
  updateCategory,
  updateProduct,
  updatePurchaseOrderStatus,
  updateSaleHold,
  updateSupplier,
  uploadImage,
};
