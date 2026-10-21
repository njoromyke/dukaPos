'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box, Typography, Chip, IconButton, Badge, AppBar, Toolbar, Avatar,
  Snackbar, Alert, Menu, MenuItem, Button,
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import RefreshIcon from '@mui/icons-material/Refresh';
import LogoutIcon from '@mui/icons-material/Logout';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import PointOfSaleIcon from '@mui/icons-material/PointOfSaleOutlined';
import DPlanUpgradeHint from '@/components/DPlanUpgradeHint';
import { useAuthStore } from '@/stores/auth-store';
import { usePosStore } from '@/stores/pos-store';
import api, { salesApi } from '@/lib/api';
import ProductGrid from './components/ProductGrid';
import Cart from './components/Cart';
import PaymentDialog from './components/PaymentDialog';
import TabsDrawer from './components/TabsDrawer';

export default function PosPage() {
  const router = useRouter();
  const auth = useAuthStore();
  const pos = usePosStore();
  const setOpenTabs = usePosStore(s => s.setOpenTabs);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [tabsOpen, setTabsOpen] = useState(false);
  const [snack, setSnack] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [branchMenuAnchor, setBranchMenuAnchor] = useState<HTMLElement | null>(null);
  const [switchingBranch, setSwitchingBranch] = useState(false);

  const branchId = auth.user?.branchId || '';
  const cashierId = auth.user?.id || '';
  const cashierName = auth.user?.fullName || '';
  const canViewAdminPortal = auth.user?.role === 'Admin' || auth.user?.role === 'SuperAdmin' ||
    auth.user?.permissions?.includes('admin.portal.view');

  useEffect(() => {
    if (!auth.isAuthenticated || !auth.user || auth.user.role === 'SuperAdmin') return;
    api.get('/api/auth/branches')
      .then((response) => setBranches(Array.isArray(response.data) ? response.data : []))
      .catch(() => setBranches([]));
  }, [auth.isAuthenticated, auth.user?.id, auth.user?.role]);

  const switchBranch = async (newBranchId: string) => {
    setBranchMenuAnchor(null);
    if (newBranchId === branchId || switchingBranch) return;
    if (pos.currentSale?.lineItems?.length) {
      setSnack({ message: 'Park or complete the current sale before switching stores.', severity: 'error' });
      return;
    }
    setSwitchingBranch(true);
    try {
      const response = await api.post(`/api/auth/select-branch/${newBranchId}`);
      const { token, user, tenantId } = response.data;
      pos.setCurrentSale(null);
      pos.setOpenTabs([]);
      auth.login(token, user, tenantId);
      window.location.reload();
    } catch (error: any) {
      setSnack({ message: error.response?.data?.message || 'Could not switch store', severity: 'error' });
      setSwitchingBranch(false);
    }
  };

  const loadTabs = useCallback(async () => {
    if (!branchId || branchId === '00000000-0000-0000-0000-000000000000') return;
    try {
      const res = await salesApi.getTabs(branchId);
      setOpenTabs(Array.isArray(res.data) ? res.data : []);
    } catch { /* */ }
  }, [branchId, setOpenTabs]);

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
      setSnack({ message: err.response?.data?.message || err.response?.data?.detail || err.response?.data?.title || err.message || 'Failed to add item', severity: 'error' });
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

  const initials = (cashierName || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', bgcolor: '#F8FAFC' }}>
      {/* Header */}
      <AppBar position="static" elevation={0} sx={{
        color: '#F8FAFC',
        bgcolor: '#0F172A',
        borderBottom: '1px solid rgba(51, 65, 85, 0.6)',
      }}>
        <Toolbar sx={{ minHeight: 64, gap: 1.25, px: { xs: 1.5, sm: 2.5 } }}>
          <Box sx={{
            width: 36, height: 36, borderRadius: 2.25,
            background: 'linear-gradient(135deg, #059669, #10B981)',
            display: 'grid', placeItems: 'center',
            boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)',
          }}>
            <PointOfSaleIcon sx={{ color: '#fff', fontSize: 20 }} />
          </Box>
          <Box sx={{ mr: 1 }}>
            <Typography variant="subtitle1" sx={{ color: '#F8FAFC', fontWeight: 800, lineHeight: 1.15, letterSpacing: '-0.02em' }}>
              Duka<span style={{ color: '#34D399' }}>POS</span>
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748B', lineHeight: 1 }}>Sales terminal</Typography>
          </Box>
          <Chip
            label={auth.user?.branchName || 'Branch'}
            size="small"
            icon={<StorefrontOutlinedIcon sx={{ fontSize: '16px !important' }} />}
            onClick={(event) => branches.length > 1 && setBranchMenuAnchor(event.currentTarget)}
            onDelete={branches.length > 1 ? (event) => setBranchMenuAnchor(event.currentTarget) : undefined}
            deleteIcon={branches.length > 1 ? <span aria-hidden="true" style={{ fontSize: 16, lineHeight: 1 }}>&#9662;</span> : undefined}
            sx={{
              color: '#A7F3D0', bgcolor: 'rgba(5, 150, 105, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              '& .MuiChip-icon': { color: '#34D399' },
              ...(branches.length > 1 ? { cursor: 'pointer' } : {}),
            }}
          />
          <Menu anchorEl={branchMenuAnchor} open={Boolean(branchMenuAnchor)} onClose={() => setBranchMenuAnchor(null)}>
            {branches.map((branch) => (
              <MenuItem key={branch.id} selected={branch.id === branchId} disabled={switchingBranch} onClick={() => void switchBranch(branch.id)}>
                {branch.name}
              </MenuItem>
            ))}
            <Box sx={{ width: 310, p: 1 }}><DPlanUpgradeHint compact /></Box>
          </Menu>
          <Box sx={{ flex: 1 }} />
          <Chip
            avatar={<Avatar sx={{
              width: 24, height: 24,
              background: 'linear-gradient(135deg, #059669, #047857)',
              color: '#fff !important', fontSize: 11, fontWeight: 700,
            }}>{initials}</Avatar>}
            label={cashierName}
            size="small"
            sx={{
              display: { xs: 'none', sm: 'flex' },
              color: '#E2E8F0', bgcolor: 'rgba(30, 41, 59, 0.6)',
              border: '1px solid rgba(51, 65, 85, 0.6)',
              '& .MuiChip-avatar': { ml: '4px' },
            }}
          />
          <IconButton aria-label="Refresh" onClick={() => window.location.reload()} sx={{ color: '#64748B', '&:hover': { bgcolor: 'rgba(51, 65, 85, 0.4)', color: '#E2E8F0' } }}>
            <RefreshIcon />
          </IconButton>
          <IconButton aria-label="Open tabs" onClick={() => setTabsOpen(true)} sx={{ color: '#64748B', '&:hover': { bgcolor: 'rgba(51, 65, 85, 0.4)', color: '#E2E8F0' } }}>
            <Badge badgeContent={pos.openTabs.length} sx={{ '& .MuiBadge-badge': { bgcolor: '#059669', color: '#fff' } }}><BookmarkIcon /></Badge>
          </IconButton>
          {canViewAdminPortal && (
            <Button
              size="small"
              variant="outlined"
              startIcon={<AdminPanelSettingsOutlinedIcon />}
              onClick={() => router.push(auth.user?.role === 'SuperAdmin' ? '/dashboard/admin' : '/dashboard')}
              sx={{
                color: '#94A3B8', borderColor: 'rgba(51, 65, 85, 0.6)',
                textTransform: 'none', whiteSpace: 'nowrap', fontSize: '0.75rem',
                '&:hover': { borderColor: '#475569', bgcolor: 'rgba(51, 65, 85, 0.4)', color: '#E2E8F0' },
              }}
            >
              Dashboard
            </Button>
          )}
          <IconButton aria-label="Lock terminal" onClick={() => pos.setLocked(true)} sx={{ color: '#64748B', '&:hover': { bgcolor: 'rgba(51, 65, 85, 0.4)', color: '#E2E8F0' } }}>
            <LockIcon />
          </IconButton>
          <IconButton
            aria-label="Log out"
            title="Log out"
            sx={{ color: '#64748B', '&:hover': { bgcolor: 'rgba(159, 18, 57, 0.15)', color: '#FCA5A5' } }}
            onClick={() => {
              auth.logout();
              pos.setCurrentSale(null);
              pos.setOpenTabs([]);
              pos.setLocked(false);
              router.replace('/login');
            }}
          >
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Main content: Product grid + Cart */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Product grid */}
        <Box sx={{ flex: 3, p: 2, overflow: 'hidden', bgcolor: '#F8FAFC' }}>
          <ProductGrid branchId={branchId} onAddProduct={addProduct} />
        </Box>

        {/* Cart */}
        <Box sx={{
          flex: 2, p: 2,
          borderLeft: '1px solid #E2E8F0',
          display: 'flex', flexDirection: 'column',
          bgcolor: '#fff',
        }}>
          <Cart
            sale={pos.currentSale}
            onUpdateQuantity={updateQuantity}
            onRemoveItem={removeItem}
            onPark={parkSale}
            onPay={() => setPaymentOpen(true)}
          />
        </Box>
      </Box>

      <PaymentDialog open={paymentOpen} onClose={() => setPaymentOpen(false)} sale={pos.currentSale} onComplete={handlePaymentComplete} />
      <TabsDrawer open={tabsOpen} onClose={() => setTabsOpen(false)} tabs={pos.openTabs} onRecall={recallTab} />

      <Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        {snack ? <Alert severity={snack.severity} onClose={() => setSnack(null)} sx={{ borderRadius: 2.5 }}>{snack.message}</Alert> : undefined}
      </Snackbar>
    </Box>
  );
}
