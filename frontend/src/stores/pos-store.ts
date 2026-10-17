import { create } from 'zustand';

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

interface PosStoreState {
  currentSale: SaleState | null;
  setCurrentSale: (sale: SaleState | null) => void;
  openTabs: Tab[];
  setOpenTabs: (tabs: Tab[]) => void;
  isLocked: boolean;
  setLocked: (locked: boolean) => void;
}

export const usePosStore = create<PosStoreState>((set) => ({
  currentSale: null,
  setCurrentSale: (sale) => set({ currentSale: sale }),
  openTabs: [],
  setOpenTabs: (tabs) => set({ openTabs: tabs }),
  isLocked: false,
  setLocked: (locked) => set({ isLocked: locked }),
}));
