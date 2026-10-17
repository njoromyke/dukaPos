import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const api = axios.create({
  baseURL: __DEV__ ? 'http://192.168.1.100:5000' : 'https://api.dukapos.co.ke',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('token');
  const tenantId = await SecureStore.getItemAsync('tenantId');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (tenantId) config.headers['X-Tenant-Id'] = tenantId;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      await SecureStore.deleteItemAsync('token');
      // Navigation to login handled by auth state listener
    }
    return Promise.reject(error);
  }
);

// ── Auth ──
export const authApi = {
  login: (email: string, password: string, tenantSlug: string) =>
    api.post('/api/auth/login', { email, password, tenantSlug }),
  pinLogin: (pin: string) =>
    api.post('/api/auth/pin-login', { pin }),
};

// ── Sales ──
export const salesApi = {
  open: (cashierId: string, cashierName: string, branchId: string) =>
    api.post('/api/sales/open', { cashierId, cashierName, branchId }),

  addItem: (saleId: string, product: {
    productId: string; productName: string; sku: string;
    quantity: number; unit: string; unitPrice: number; vatRatePercent: number;
  }) => api.post('/api/sales/add-item', { saleId, ...product }),

  updateQuantity: (saleId: string, lineItemId: string, newQuantity: number) =>
    api.post('/api/sales/update-quantity', { saleId, lineItemId, newQuantity }),

  removeItem: (saleId: string, lineItemId: string) =>
    api.post('/api/sales/remove-item', { saleId, lineItemId }),

  parkAsTab: (saleId: string, parkedBy: string, parkedByName: string,
    customerName?: string, customerPhone?: string, notes?: string) =>
    api.post('/api/sales/park-tab', { saleId, parkedBy, parkedByName, customerName, customerPhone, notes }),

  recallTab: (tabId: string, recalledBy: string) =>
    api.post('/api/sales/recall-tab', { tabId, recalledBy }),

  getSale: (saleId: string) => api.get(`/api/sales/${saleId}`),
  getTabs: (branchId: string) => api.get('/api/sales/tabs', { params: { branchId } }),

  voidSale: (saleId: string, voidedBy: string, reason: string) =>
    api.post('/api/sales/void', { saleId, voidedBy, reason }),

  getHistory: (branchId: string, params?: { from?: string; to?: string; page?: number; pageSize?: number }) =>
    api.get('/api/sales/history', { params: { branchId, page: 1, pageSize: 20, ...params } }),
};

// ── Payments ──
export const paymentsApi = {
  recordCash: (saleId: string, amountTendered: number) =>
    api.post('/api/payments/cash', { saleId, amountTendered }),

  initiateMpesa: (saleId: string, phoneNumber: string, amount: number) =>
    api.post('/api/payments/mpesa/stk-push', { saleId, phoneNumber, amount }),
};

// ── Inventory ──
export const inventoryApi = {
  getProducts: (branchId: string, params?: { search?: string; categoryId?: string; page?: number }) =>
    api.get('/api/inventory/products', { params: { branchId, pageSize: 50, page: 1, ...params } }),

  getByBarcode: (barcode: string) =>
    api.get(`/api/inventory/products/barcode/${barcode}`),

  getCategories: () => api.get('/api/inventory/categories'),
  createProduct: (data: any) => api.post('/api/inventory/products', data),
  updateProduct: (data: any) => api.put('/api/inventory/products', data),
  adjustStock: (data: any) => api.post('/api/inventory/stock/adjust', data),
  getStockLevels: (branchId: string) =>
    api.get('/api/inventory/stock/levels', { params: { branchId } }),
};

// ── Terminal ──
export const terminalApi = {
  lock: (sessionId: string) => api.post('/api/terminal/lock', { sessionId }),
  unlockWithPin: (sessionId: string, pin: string) =>
    api.post('/api/terminal/unlock/pin', { sessionId, pin }),
};

// ── Reports ──
export const reportsApi = {
  getDailySummary: (branchId: string, date: string) =>
    api.get('/api/reports/daily-summary', { params: { branchId, date } }),
  getTopProducts: (branchId: string, from: string, to: string, top: number = 5) =>
    api.get('/api/reports/top-products', { params: { branchId, from, to, top } }),
  getPaymentBreakdown: (branchId: string, from: string, to: string) =>
    api.get('/api/reports/payment-breakdown', { params: { branchId, from, to } }),
};

// ── Expenses ──
export const expensesApi = {
  list: (branchId: string, params?: { from?: string; to?: string; category?: string; page?: number; pageSize?: number }) =>
    api.get('/api/expenses', { params: { branchId, page: 1, pageSize: 20, ...params } }),
  create: (data: { branchId: string; category: string; description: string; amount: number; expenseDate: string; receiptUrl?: string; recordedBy: string; recordedByName: string }) =>
    api.post('/api/expenses', data),
  delete: (id: string) => api.delete(`/api/expenses/${id}`),
  summary: (branchId: string, from: string, to: string) =>
    api.get('/api/expenses/summary', { params: { branchId, from, to } }),
};

// ── User ──
export const userApi = {
  changePin: (currentPin: string, newPin: string) =>
    api.post('/api/auth/change-pin', { currentPin, newPin }),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/api/auth/change-password', { currentPassword, newPassword }),
  getProfile: () => api.get('/api/auth/profile'),
};

// ── Audit ──
export const auditApi = {
  getLogs: (params?: { userId?: string; action?: string; entityType?: string; from?: string; to?: string; page?: number; pageSize?: number }) =>
    api.get('/api/audit/logs', { params: { page: 1, pageSize: 50, ...params } }),
};

// ── Blobs / File Upload ──
export const blobApi = {
  upload: (uri: string, fileName: string, mimeType: string, category: string, referenceId?: string) => {
    const formData = new FormData();
    formData.append('file', { uri, name: fileName, type: mimeType } as unknown as Blob);
    formData.append('category', category);
    if (referenceId) formData.append('referenceId', referenceId);
    return api.post('/api/blobs/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  getUrl: (id: string) => `${api.defaults.baseURL}/api/blobs/${id}`,
  getByReference: (referenceId: string, category?: string) =>
    api.get(`/api/blobs/by-reference/${referenceId}`, { params: { category } }),
};

// ── Receipts ──
export const receiptApi = {
  generate: (data: { saleId: string; businessName: string; branchName: string; branchAddress?: string; paymentMethod: string; amountPaid: number; change: number; mpesaRef?: string }) =>
    api.post('/api/receipt/generate', data),
  getBySale: (saleId: string) =>
    api.get(`/api/receipt/by-sale/${saleId}`, { responseType: 'arraybuffer' }),
};

export default api;
