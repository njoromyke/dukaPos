import { create } from 'zustand';

// ── Auth Store ──
interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  user: { id: string; name: string; email: string; role: string; branchId: string } | null;
  tenantId: string | null;
  login: (token: string, user: AuthState['user'], tenantId: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  token: null,
  user: null,
  tenantId: null,
  login: (token, user, tenantId) => set({ isAuthenticated: true, token, user, tenantId }),
  logout: () => set({ isAuthenticated: false, token: null, user: null, tenantId: null }),
}));

// ── POS Store ──
export interface LineItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  vatRatePercent: number;
  vatAmount: number;
  discount: number;
  lineTotal: number;
}

export interface SaleState {
  id: string | null;
  saleNumber: string;
  status: string;
  lineItems: LineItem[];
  subtotal: number;
  vatTotal: number;
  discountTotal: number;
  grandTotal: number;
}

export interface Tab {
  id: string;
  saleId: string;
  customerName?: string;
  customerPhone?: string;
  notes?: string;
  saleTotal: number;
  itemCount: number;
  parkedByName: string;
  parkedAt: string;
}

interface PosState {
  currentSale: SaleState | null;
  setCurrentSale: (sale: SaleState | null) => void;
  openTabs: Tab[];
  setOpenTabs: (tabs: Tab[]) => void;
  isLocked: boolean;
  setLocked: (locked: boolean) => void;
}

export const usePosStore = create<PosState>((set) => ({
  currentSale: null,
  setCurrentSale: (sale) => set({ currentSale: sale }),
  openTabs: [],
  setOpenTabs: (tabs) => set({ openTabs: tabs }),
  isLocked: false,
  setLocked: (locked) => set({ isLocked: locked }),
}));

// ── Product Store ──
export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  categoryName: string;
  unit: string;
  sellingPrice: number;
  vatRate: number;
  isWeighed: boolean;
  stockQuantity: number;
}

export interface Category {
  id: string;
  name: string;
}

interface ProductState {
  products: Product[];
  categories: Category[];
  setProducts: (products: Product[]) => void;
  setCategories: (categories: Category[]) => void;
}

export const useProductStore = create<ProductState>((set) => ({
  products: [],
  categories: [],
  setProducts: (products) => set({ products }),
  setCategories: (categories) => set({ categories }),
}));
