'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  Box, Typography, Chip, IconButton, Badge, AppBar, Toolbar,
  Snackbar, Alert,
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useAuthStore } from '@/stores/auth-store';
import { usePosStore } from '@/stores/pos-store';
import { salesApi } from '@/lib/api';
import ProductGrid from './components/ProductGrid';
import Cart from './components/Cart';
import PaymentDialog from './components/PaymentDialog';
import TabsDrawer from './components/TabsDrawer';
export default function PosPage() {
  const auth = useAuthStore();
  const pos = usePosStore();
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [tabsOpen, setTabsOpen] = useState(false);
  const [snack, setSnack] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);

  const branchId = auth.user?.branchId || '';
  const cashierId = auth.user?.id || '';
  const cashierName = auth.user?.name || '';

  const loadTabs = useCallback(async () => {
    if (!branchId) return;
    try {
      const res = await salesApi.getTabs(branchId);
      pos.setOpenTabs(Array.isArray(res.data) ? res.data : []);
    } catch { /* */ }
  }, [branchId, pos]);

  useEffect(() => { loadTabs(); }, [loadTabs]);

  const ensureSaleOpen = async (): Promise<string> => {
    if (pos.currentSale?.id) return pos.currentSale.id;
    const res = await salesApi.open(cashierId, cashierName, branchId);
    pos.setCurrentSale(res.data);
    return res.data.id;
  };

  const addProduct = async (product: any) => {
    if (product.stockQuantity <= 0) {
      setSnack({ message: `${product.name} is out of stock`, severity: 'error' });
      return;
    }
    try {
      const saleId = await ensureSaleOpen();
      const res = await salesApi.addItem(saleId, {
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        quantity: 1,
        unit: product.unit,
        unitPrice: product.sellingPrice,
        vatRatePercent: product.vatRate >= 0 ? product.vatRate : 0,
      });
      pos.setCurrentSale(res.data);
    } catch (err: any) {
      setSnack({ message: err.response?.data?.message || 'Failed to add item', severity: 'error' });
    }
  };

  const updateQuantity = async (lineItemId: string, delta: number) => {
    if (!pos.currentSale?.id) return;
    const item = pos.currentSale.lineItems.find((li: any) => li.id === lineItemId);
    if (!item) return;
    try {
      const res = await salesApi.updateQuantity(pos.currentSale.id, lineItemId, item.quantity + delta);
      pos.setCurrentSale(res.data);
    } catch { /* */ }
  };

  const removeItem = async (lineItemId: string) => {
    if (!pos.currentSale?.id) return;
    try {
      const res = await salesApi.removeItem(pos.currentSale.id, lineItemId);
      pos.setCurrentSale(res.data);
    } catch { /* */ }
  };

  const parkSale = async () => {
    if (!pos.currentSale?.id) return;
    try {
      await salesApi.parkAsTab(pos.currentSale.id, cashierId, cashierName);
      pos.setCurrentSale(null);
      loadTabs();
      setSnack({ message: 'Sale parked as tab', severity: 'success' });
    } catch (err: any) {
      setSnack({ message: err.response?.data?.message || 'Failed to park', severity: 'error' });
    }
  };

  const recallTab = async (tabId: string) => {
    try {
      const res = await salesApi.recallTab(tabId, cashierId);
      pos.setCurrentSale(res.data);
      loadTabs();
    } catch (err: any) {
      setSnack({ message: err.response?.data?.message || 'Failed to recall tab', severity: 'error' });
    }
  };

  const handlePaymentComplete = () => {
    pos.setCurrentSale(null);
    setPaymentOpen(false);
    setSnack({ message: 'Payment completed successfully', severity: 'success' });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Header */}
      <AppBar position="static" color="default" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar variant="dense" sx={{ gap: 1 }}>
          <Typography variant="h6" color="primary" sx={{ fontWeight: 800 }}>
            DukaPoS
          </Typography>
          <Chip label={auth.user?.branchName || 'Branch'} size="small" variant="outlined" />
          <Chip label={cashierName} size="small" />
          <Box sx={{ flex: 1 }} />
          <IconButton onClick={() => window.location.reload()} title="Refresh">
            <RefreshIcon />
          </IconButton>
          <IconButton onClick={() => setTabsOpen(true)}>
            <Badge badgeContent={pos.openTabs.length} color="primary">
              <BookmarkIcon />
            </Badge>
          </IconButton>
          <IconButton onClick={() => pos.setLocked(true)}>
            <LockIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Main content: Product grid + Cart */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Product grid - left 60% */}
        <Box sx={{ flex: 3, p: 2, overflow: 'hidden' }}>
          <ProductGrid branchId={branchId} onAddProduct={addProduct} />
        </Box>

        {/* Cart - right 40% */}
        <Box
          sx={{
            flex: 2, p: 2, borderLeft: 1, borderColor: 'divider',
            display: 'flex', flexDirection: 'column',
            bgcolor: 'background.paper',
          }}
        >
          <Cart
            sale={pos.currentSale}
            onUpdateQuantity={updateQuantity}
            onRemoveItem={removeItem}
            onPark={parkSale}
            onPay={() => setPaymentOpen(true)}
          />
        </Box>
      </Box>

      {/* Payment dialog */}
      <PaymentDialog
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        sale={pos.currentSale}
        onComplete={handlePaymentComplete}
      />

      {/* Tabs drawer */}
      <TabsDrawer
        open={tabsOpen}
        onClose={() => setTabsOpen(false)}
        tabs={pos.openTabs}
        onRecall={recallTab}
      />

      {/* Snackbar */}
      <Snackbar
        open={!!snack}
        autoHideDuration={3000}
        onClose={() => setSnack(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {snack ? <Alert severity={snack.severity} onClose={() => setSnack(null)}>{snack.message}</Alert> : undefined}
      </Snackbar>
    </Box>
  );
}
