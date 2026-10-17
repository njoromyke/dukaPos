'use client';

import { useEffect, useState } from 'react';
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
import Divider from '@mui/material/Divider';
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
import { useAuthStore } from '@/stores/auth-store';

const DRAWER_WIDTH = 260;

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: <DashboardIcon /> },
  { type: 'subheader' as const, label: 'Inventory' },
  { label: 'Products', href: '/dashboard/inventory/products', icon: <InventoryIcon /> },
  { label: 'Categories', href: '/dashboard/inventory/categories', icon: <CategoryIcon /> },
  { label: 'Stock Levels', href: '/dashboard/inventory/stock', icon: <WarehouseIcon /> },
  { type: 'subheader' as const, label: 'Sales' },
  { label: 'History', href: '/dashboard/sales/history', icon: <ReceiptIcon /> },
  { label: 'Open Tabs', href: '/dashboard/sales/tabs', icon: <BookmarkIcon /> },
  { type: 'subheader' as const, label: 'Reports' },
  { label: 'Daily Report', href: '/dashboard/reports/daily', icon: <AssessmentIcon /> },
  { label: 'Payments', href: '/dashboard/reports/payments', icon: <PaymentsIcon /> },
  { type: 'subheader' as const, label: 'Settings' },
  { label: 'Branch', href: '/dashboard/settings/branch', icon: <StoreIcon /> },
  { label: 'Users', href: '/dashboard/settings/users', icon: <PeopleIcon /> },
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

  const handleLogout = () => {
    auth.logout();
    router.push('/login');
  };

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Toolbar>
        <Typography variant="h6" color="primary" fontWeight={800}>DukaPoS</Typography>
      </Toolbar>
      <Divider />
      <List sx={{ flex: 1, pt: 0 }}>
        {navItems.map((item, i) => {
          if (item.type === 'subheader') {
            return <ListSubheader key={i} sx={{ lineHeight: '36px', mt: 1 }}>{item.label}</ListSubheader>;
          }
          return (
            <ListItemButton
              key={item.href}
              selected={pathname === item.href}
              onClick={() => { router.push(item.href!); setMobileOpen(false); }}
              sx={{ borderRadius: 2, mx: 1 }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} primaryTypographyProps={{ variant: 'body2', fontWeight: pathname === item.href ? 700 : 400 }} />
            </ListItemButton>
          );
        })}
      </List>
      <Divider />
      <Box p={2} display="flex" flexDirection="column" gap={1}>
        <Button variant="outlined" startIcon={<PointOfSaleIcon />} onClick={() => router.push('/pos')} fullWidth>
          Open POS
        </Button>
        <Button color="inherit" startIcon={<LogoutIcon />} onClick={handleLogout} fullWidth>
          Sign out
        </Button>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar position="fixed" sx={{ display: { md: 'none' }, zIndex: (t) => t.zIndex.drawer + 1 }} color="default" elevation={1}>
        <Toolbar>
          <IconButton edge="start" onClick={() => setMobileOpen(true)}><MenuIcon /></IconButton>
          <Typography variant="h6" color="primary" fontWeight={800} sx={{ ml: 1 }}>DukaPoS</Typography>
          <Box flex={1} />
          <Typography variant="body2" color="text.secondary">{auth.user?.name}</Typography>
        </Toolbar>
      </AppBar>

      <Drawer variant="temporary" open={mobileOpen} onClose={() => setMobileOpen(false)}
        sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: DRAWER_WIDTH } }}>
        {drawerContent}
      </Drawer>

      <Drawer variant="permanent"
        sx={{ display: { xs: 'none', md: 'block' }, '& .MuiDrawer-paper': { width: DRAWER_WIDTH, borderRight: '1px solid', borderColor: 'divider' } }}>
        {drawerContent}
      </Drawer>

      <Box component="main" sx={{ flex: 1, ml: { md: `${DRAWER_WIDTH}px` }, mt: { xs: '64px', md: 0 }, p: 3, bgcolor: 'background.default', minHeight: '100vh' }}>
        {children}
      </Box>
    </Box>
  );
}
