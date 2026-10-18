import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  if (typeof window === 'undefined') return config;
  const token = localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (tenantId) config.headers['X-Tenant-Id'] = tenantId;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (typeof window !== 'undefined' && error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('tenantId');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (email: string, password: string, tenantSlug: string) =>
    api.post('/api/auth/login', { email, password, tenantSlug }),
  pinLogin: (pin: string) =>
    api.post('/api/auth/pin-login', { pin }),
};

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
  getHistory: (branchId: string, from?: string, to?: string, page = 1, pageSize = 20) =>
    api.get('/api/sales/history', { params: { branchId, from, to, page, pageSize } }),
  voidSale: (saleId: string, voidedBy: string, reason: string) =>
    api.post('/api/sales/void', { saleId, voidedBy, reason }),
};

export const paymentsApi = {
  recordCash: (saleId: string, amountTendered: number) =>
    api.post('/api/payments/cash', { saleId, amountTendered }),
  initiateMpesa: (saleId: string, phoneNumber: string, amount: number) =>
    api.post('/api/payments/mpesa/stk-push', { saleId, phoneNumber, amount }),
};

export const inventoryApi = {
  getProducts: (branchId: string, params?: { search?: string; categoryId?: string; page?: number; pageSize?: number }) =>
    api.get('/api/inventory/products', { params: { branchId, pageSize: 50, page: 1, ...params } }),
  getByBarcode: (barcode: string) =>
    api.get(`/api/inventory/products/barcode/${barcode}`),
  getCategories: () => api.get('/api/inventory/categories'),
  createProduct: (data: Record<string, unknown>) => api.post('/api/inventory/products', data),
  updateProduct: (data: Record<string, unknown>) => api.put('/api/inventory/products', data),
  updateCategory: (data: { id: string; name: string; parentId?: string | null; sortOrder: number }) =>
    api.put('/api/inventory/categories', data),
  adjustStock: (data: { productId: string; branchId: string; quantityChange: number; reason: string; notes?: string; adjustedBy: string }) =>
    api.post('/api/inventory/stock/adjust', data),
};

export const usersApi = {
  list: (branchId?: string) => api.get('/api/users', { params: { branchId } }),
  create: (data: { fullName: string; email: string; password: string; pin?: string; role: string; branchId: string; tenantId?: string }) =>
    api.post('/api/users', data),
  update: (data: { id: string; fullName: string; email: string; role: string; branchId: string; isActive: boolean }) =>
    api.put('/api/users', data),
  lock: (userId: string, lockedBy: string) =>
    api.post(`/api/users/${userId}/lock`, { lockedBy }),
  unlock: (userId: string, unlockedBy: string) =>
    api.post(`/api/users/${userId}/unlock`, { unlockedBy }),
  changePassword: (userId: string, currentPassword: string, newPassword: string) =>
    api.post('/api/auth/change-password', { userId, currentPassword, newPassword }),
};

export const branchApi = {
  get: (branchId: string) => api.get(`/api/branch/${branchId}`),
  update: (data: { id: string; name: string; address: string; phone: string }) =>
    api.put('/api/branch', data),
};

export const terminalApi = {
  lock: (sessionId: string) => api.post('/api/terminal/lock', { sessionId }),
  unlockWithPin: (sessionId: string, pin: string) =>
    api.post('/api/terminal/unlock/pin', { sessionId, pin }),
};

export const reportsApi = {
  dailySummary: (branchId: string, date?: string) =>
    api.get('/api/reports/daily-summary', { params: { branchId, date } }),
  topProducts: (branchId: string, from?: string, to?: string, top = 10) =>
    api.get('/api/reports/top-products', { params: { branchId, from, to, top } }),
  paymentBreakdown: (branchId: string, from?: string, to?: string) =>
    api.get('/api/reports/payment-breakdown', { params: { branchId, from, to } }),
};

export const expensesApi = {
  list: (branchId: string, params?: { from?: string; to?: string; category?: string; page?: number; pageSize?: number }) =>
    api.get('/api/expenses', { params: { branchId, page: 1, pageSize: 20, ...params } }),
  create: (data: { branchId: string; category: string; description: string; amount: number; receiptUrl?: string; recordedBy: string; recordedByName: string; expenseDate?: string }) =>
    api.post('/api/expenses', data),
  update: (data: { id: string; category: string; description: string; amount: number; receiptUrl?: string }) =>
    api.put('/api/expenses', data),
  delete: (id: string) => api.delete(`/api/expenses/${id}`),
  summary: (branchId: string, from: string, to: string) =>
    api.get('/api/expenses/summary', { params: { branchId, from, to } }),
  approve: (id: string, approvedBy: string, approvedByName: string) =>
    api.post(`/api/expenses/${id}/approve`, { approvedBy, approvedByName }),
  reject: (id: string, rejectedBy: string, rejectedByName: string, reason: string) =>
    api.post(`/api/expenses/${id}/reject`, { rejectedBy, rejectedByName, reason }),
};

export const auditApi = {
  list: (params?: { userId?: string; action?: string; entityType?: string; from?: string; to?: string; page?: number; pageSize?: number }) =>
    api.get('/api/audit/logs', { params: { page: 1, pageSize: 50, ...params } }),
};

export const tenantSettingsApi = {
  get: (tenantId: string) => api.get(`/api/tenant-settings/${tenantId}`),
  update: (data: Record<string, unknown>) => api.put('/api/tenant-settings', data),
};

export const blobApi = {
  upload: (file: File, category: string, referenceId?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);
    if (referenceId) formData.append('referenceId', referenceId);
    return api.post('/api/blobs/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  getUrl: (id: string) => `${api.defaults.baseURL}/api/blobs/${id}`,
  getByReference: (referenceId: string, category?: string) =>
    api.get(`/api/blobs/by-reference/${referenceId}`, { params: { category } }),
};

export const receiptApi = {
  generate: (data: { saleId: string; businessName: string; branchName: string; branchAddress?: string; paymentMethod: string; amountPaid: number; change: number; mpesaRef?: string }) =>
    api.post('/api/receipt/generate', data),
  getBySale: (saleId: string) =>
    api.get(`/api/receipt/by-sale/${saleId}`, { responseType: 'blob' }),
};

export const adminApi = {
  getTenants: () => api.get('/api/admin/tenants'),
  createTenant: (data: { name: string; slug: string; kraPin: string; phone: string; email: string }) =>
    api.post('/api/admin/tenants', data),
  getTenantBranches: (tenantId: string) => api.get(`/api/admin/tenants/${tenantId}/branches`),
  createBranch: (tenantId: string, data: { name: string; address: string; phone: string }) =>
    api.post(`/api/admin/tenants/${tenantId}/branches`, data),
  getAllUsers: () => api.get('/api/admin/users'),
};

export default api;
