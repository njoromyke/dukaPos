import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '@/stores';

const localApiUrl = 'http://192.168.100.70:5100';
const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL || (__DEV__ ? localApiUrl : 'https://api.dukapos.co.ke');

const api = axios.create({
  baseURL: apiBaseUrl,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Authentication must not inherit a previous session's bearer token or tenant
// header. Some gateways reject stale Authorization headers even on public routes.
const publicApi = axios.create({
  baseURL: apiBaseUrl,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

api.interceptors.request.use(async (config) => {
  const [storedToken, storedTenantId] = await Promise.all([
    SecureStore.getItemAsync('token'),
    SecureStore.getItemAsync('tenantId'),
  ]);
  const session = useAuthStore.getState();
  const token = session.token || storedToken;
  const tenantId = session.tenantId || storedTenantId;
  if (session.token && session.token !== storedToken) await SecureStore.setItemAsync('token', session.token);
  if (session.tenantId && session.tenantId !== storedTenantId) await SecureStore.setItemAsync('tenantId', session.tenantId);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (tenantId) config.headers['X-Tenant-Id'] = tenantId;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    return Promise.reject(error);
  }
);

// ── Auth ──
export const authApi = {
  login: (email: string, password: string, tenantSlug: string) =>
    publicApi.post('/api/auth/login', {
      email: email.trim(),
      password,
      tenantSlug: tenantSlug.trim().toLowerCase(),
    }),
  pinLogin: (pin: string) =>
    api.post('/api/auth/pin-login', { pin }),
  unlockPin: (pin: string) => api.post('/api/auth/unlock-pin', { pin }),
  unlockPassword: (password: string) => api.post('/api/auth/unlock-password', { password }),
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
  updateCustomer: (saleId: string, customerName: string) =>
    api.put(`/api/sales/${saleId}/customer`, { customerName }),

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
  getProducts: (branchId: string, params?: { search?: string; categoryId?: string; page?: number; pageSize?: number }) =>
    api.get('/api/inventory/products', { params: { branchId, pageSize: 50, page: 1, ...params } }),

  getByBarcode: (barcode: string, branchId?: string) =>
    api.get(`/api/inventory/products/barcode/${barcode}`, { params: { branchId } }),

  getCategories: () => api.get('/api/inventory/categories'),
  createProduct: (data: any) => api.post('/api/inventory/products', data),
  updateProduct: (data: any) => api.put('/api/inventory/products', data),
  adjustStock: (data: any) => api.post('/api/inventory/stock/adjust', data),
  getStockLevels: (branchId: string) =>
    api.get('/api/inventory/stock/levels', { params: { branchId } }),
};

export const blobApi = {
  upload: (asset: { uri: string; fileName?: string; mimeType?: string }, category: string) => {
    const form = new FormData();
    form.append('file', {
      uri: asset.uri,
      name: asset.fileName || 'upload.jpg',
      type: asset.mimeType || 'image/jpeg',
    } as any);
    form.append('category', category);
    return api.post('/api/blobs/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getUrl: (id: string) => `${apiBaseUrl}/api/blobs/${id}`,
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
  getProfile: () => api.get('/api/auth/profile'),
};

export const branchesApi = {
  list: () => api.get('/api/auth/branches'),
  select: (branchId: string) => api.post(`/api/auth/select-branch/${branchId}`),
};

export default api;
