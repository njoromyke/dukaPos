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
};

// ── Terminal ──
export const terminalApi = {
  lock: (sessionId: string) => api.post('/api/terminal/lock', { sessionId }),
  unlockWithPin: (sessionId: string, pin: string) =>
    api.post('/api/terminal/unlock/pin', { sessionId, pin }),
};

export default api;
