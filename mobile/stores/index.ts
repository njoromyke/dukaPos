import { create } from 'zustand';

export interface MobileUser {
  id: string;
  name: string;
  email: string;
  role: string;
  branchId: string;
  branchName?: string;
  permissions?: string[];
}

// ── Auth Store ──
interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  user: MobileUser | null;
  tenantId: string | null;
  features: string[];
  login: (token: string, user: AuthState['user'], tenantId: string, features?: string[]) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  token: null,
  user: null,
  tenantId: null,
  features: [],
  login: (token, user, tenantId, features = []) => set({ isAuthenticated: true, token, user, tenantId, features }),
  logout: () => set({ isAuthenticated: false, token: null, user: null, tenantId: null, features: [] }),
}));

interface ThemeState {
  mode: 'light' | 'dark';
  setMode: (mode: 'light' | 'dark') => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  mode: 'light',
  setMode: (mode) => set({ mode }),
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
  paidAmount?: number;
  customerName?: string | null;
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

// ── Haptics Store ──
interface HapticsState {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
}

export const useHapticsStore = create<HapticsState>((set) => ({
  enabled: true,
  setEnabled: (enabled) => set({ enabled }),
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
  imageUrl?: string | null;
  imageData?: string | null;
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
