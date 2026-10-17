'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import ListSubheader from '@mui/material/ListSubheader';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import DashboardIcon from '@mui/icons-material/DashboardOutlined';
import InventoryIcon from '@mui/icons-material/Inventory2Outlined';
import CategoryIcon from '@mui/icons-material/CategoryOutlined';
import WarehouseIcon from '@mui/icons-material/WarehouseOutlined';
import ReceiptIcon from '@mui/icons-material/ReceiptLongOutlined';
import BookmarkIcon from '@mui/icons-material/BookmarkBorderOutlined';
import AssessmentIcon from '@mui/icons-material/AssessmentOutlined';
import PaymentsIcon from '@mui/icons-material/PaymentsOutlined';
import StoreIcon from '@mui/icons-material/StoreOutlined';
import PeopleIcon from '@mui/icons-material/PeopleOutlined';
import PointOfSaleIcon from '@mui/icons-material/PointOfSaleOutlined';
import LogoutIcon from '@mui/icons-material/LogoutOutlined';
import MenuIcon from '@mui/icons-material/Menu';
import MoneyOffIcon from '@mui/icons-material/MoneyOffOutlined';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import SecurityIcon from '@mui/icons-material/SecurityOutlined';
import TuneIcon from '@mui/icons-material/TuneOutlined';
import { useAuthStore } from '@/stores/auth-store';

const DRAWER_WIDTH = 272;

interface NavItem {
  type?: 'subheader';
  label: string;
  href?: string;
  icon?: React.ReactNode;
  adminOnly?: boolean;
}

const baseNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: <DashboardIcon /> },
  { type: 'subheader', label: 'Inventory' },
  { label: 'Products', href: '/dashboard/inventory/products', icon: <InventoryIcon /> },
  { label: 'Categories', href: '/dashboard/inventory/categories', icon: <CategoryIcon /> },
  { label: 'Stock Levels', href: '/dashboard/inventory/stock', icon: <WarehouseIcon /> },
  { type: 'subheader', label: 'Sales' },
  { label: 'History', href: '/dashboard/sales/history', icon: <ReceiptIcon /> },
  { label: 'Open Tabs', href: '/dashboard/sales/tabs', icon: <BookmarkIcon /> },
  { type: 'subheader', label: 'Expenses' },
  { label: 'Expenses', href: '/dashboard/expenses', icon: <MoneyOffIcon /> },
  { type: 'subheader', label: 'Reports' },
  { label: 'Daily Report', href: '/dashboard/reports/daily', icon: <AssessmentIcon /> },
  { label: 'Payments', href: '/dashboard/reports/payments', icon: <PaymentsIcon /> },
  { type: 'subheader', label: 'Settings' },
  { label: 'Branch', href: '/dashboard/settings/branch', icon: <StoreIcon /> },
  { label: 'Users', href: '/dashboard/settings/users', icon: <PeopleIcon /> },
  { label: 'Tenant Rules', href: '/dashboard/settings/tenant', icon: <TuneIcon /> },
  { type: 'subheader', label: 'Monitoring' },
  { label: 'Audit Logs', href: '/dashboard/audit', icon: <SecurityIcon /> },
];

const adminNavItems: NavItem[] = [
  { type: 'subheader', label: 'Admin', adminOnly: true },
  { label: 'Tenants', href: '/dashboard/admin', icon: <AdminPanelSettingsIcon />, adminOnly: true },
  { label: 'All Users', href: '/dashboard/admin/users', icon: <PeopleIcon />, adminOnly: true },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const auth = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => { auth.hydrate(); }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('token')) {
      router.replace('/login');
    }
  }, [router]);

  useEffect(() => {
    if (auth.user?.role === 'Cashier') {
      router.replace('/pos');
    }
  }, [auth.user?.role, router]);

  const isSuperAdmin = auth.user?.role === 'SuperAdmin';

  const navItems = useMemo(() => {
    if (isSuperAdmin) return [...adminNavItems, ...baseNavItems];
    return baseNavItems;
  }, [isSuperAdmin]);

  const handleLogout = () => {
    auth.logout();
    router.push('/login');
  };

  const initials = (auth.user?.name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const isActive = (href: string) => pathname === href || (href !== '/dashboard' && pathname.startsWith(href + '/'));

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: '#FFFFFF' }}>
      <Box sx={{
        px: 2.5, py: 2.5,
        background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
      }}>
        <Typography variant="h6" sx={{ color: '#fff', fontWeight: 800, fontSize: '1.2rem', letterSpacing: '-0.01em' }}>
          DukaPoS
        </Typography>
      </Box>

      <Box sx={{ px: 2, py: 2, display: 'flex', alignItems: 'center', gap: 1.5, borderBottom: '1px solid #E2E8F0' }}>
        <Avatar sx={{
          width: 40, height: 40, fontSize: '0.85rem', fontWeight: 700,
          background: isSuperAdmin
            ? 'linear-gradient(135deg, #7C3AED, #5B21B6)'
            : 'linear-gradient(135deg, #1565C0, #0D47A1)',
        }}>
          {initials}
        </Avatar>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {auth.user?.name || 'User'}
          </Typography>
          <Chip
            label={isSuperAdmin ? 'Super Admin' : auth.user?.role || 'User'}
            size="small"
            sx={{
              height: 20, fontSize: '0.65rem', fontWeight: 700, mt: 0.25,
              bgcolor: isSuperAdmin ? '#EDE9FE' : '#DBEAFE',
              color: isSuperAdmin ? '#5B21B6' : '#1565C0',
            }}
          />
        </Box>
      </Box>

      <List sx={{ flex: 1, pt: 1, px: 0.5, overflowY: 'auto' }}>
        {navItems.map((item, i) => {
          if (item.type === 'subheader') {
            return (
              <ListSubheader key={i} sx={{
                lineHeight: '28px', mt: i === 0 ? 0 : 1.5, mb: 0.5, px: 2,
                fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em',
                textTransform: 'uppercase', color: '#94A3B8', bgcolor: 'transparent',
              }}>
                {item.label}
              </ListSubheader>
            );
          }

          const active = isActive(item.href!);

          return (
            <ListItemButton
              key={item.href}
              selected={active}
              onClick={() => { router.push(item.href!); setMobileOpen(false); }}
              sx={{
                borderRadius: 2.5, mx: 1, mb: 0.25, py: 0.75,
                transition: 'all 0.15s ease',
                ...(active && {
                  bgcolor: '#EFF6FF',
                  '&:hover': { bgcolor: '#DBEAFE' },
                  '& .MuiListItemIcon-root': { color: '#1565C0' },
                }),
                ...(!active && {
                  '&:hover': { bgcolor: '#F1F5F9' },
                }),
              }}
            >
              <ListItemIcon sx={{ minWidth: 34, color: active ? '#1565C0' : '#94A3B8' }}>{item.icon}</ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{
                  variant: 'body2',
                  fontWeight: active ? 600 : 400,
                  color: active ? '#1565C0' : '#334155',
                  fontSize: '0.875rem',
                }}
              />
            </ListItemButton>
          );
        })}
      </List>

      <Box sx={{ p: 2, borderTop: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Button
          variant="contained"
          startIcon={<PointOfSaleIcon />}
          onClick={() => router.push('/pos')}
          fullWidth
          sx={{
            background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
            '&:hover': { background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' },
            boxShadow: '0 2px 8px rgba(5, 150, 105, 0.3)',
          }}
        >
          Open POS
        </Button>
        <Button
          color="inherit"
          startIcon={<LogoutIcon sx={{ color: '#94A3B8' }} />}
          onClick={handleLogout}
          fullWidth
          sx={{ color: '#64748B', '&:hover': { bgcolor: '#FEF2F2', color: '#DC2626' } }}
        >
          Sign out
        </Button>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#F8FAFC' }}>
      <AppBar
        position="fixed"
        sx={{
          display: { md: 'none' },
          zIndex: (t) => t.zIndex.drawer + 1,
          bgcolor: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0',
        }}
        color="default"
        elevation={0}
      >
        <Toolbar>
          <IconButton edge="start" onClick={() => setMobileOpen(true)}><MenuIcon /></IconButton>
          <Typography variant="h6" sx={{ ml: 1, fontWeight: 800, color: '#0F172A' }}>DukaPoS</Typography>
          <Box flex={1} />
          <Avatar sx={{
            width: 32, height: 32, fontSize: '0.75rem', fontWeight: 700,
            background: 'linear-gradient(135deg, #1565C0, #0D47A1)',
          }}>
            {initials}
          </Avatar>
        </Toolbar>
      </AppBar>

      <Drawer variant="temporary" open={mobileOpen} onClose={() => setMobileOpen(false)}
        sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: DRAWER_WIDTH, border: 'none' } }}>
        {drawerContent}
      </Drawer>

      <Drawer variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            border: 'none',
            boxShadow: '1px 0 0 #E2E8F0',
          },
        }}>
        {drawerContent}
      </Drawer>

      <Box
        component="main"
        sx={{
          flex: 1,
          ml: { md: `${DRAWER_WIDTH}px` },
          mt: { xs: '64px', md: 0 },
          p: { xs: 2, md: 4 },
          bgcolor: '#F8FAFC',
          minHeight: '100vh',
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
