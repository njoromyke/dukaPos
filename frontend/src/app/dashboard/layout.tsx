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
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Badge from '@mui/material/Badge';
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
import NotificationsIcon from '@mui/icons-material/NotificationsOutlined';
import CardMembershipIcon from '@mui/icons-material/CardMembershipOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import CalendarTodayIcon from '@mui/icons-material/CalendarTodayOutlined';
import StorefrontIcon from '@mui/icons-material/StorefrontOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import TouchAppIcon from '@mui/icons-material/TouchAppOutlined';
import { useAuthStore } from '@/stores/auth-store';
import LockScreen from '@/components/LockScreen';
import api from '@/lib/api';
import dayjs from 'dayjs';

const DRAWER_WIDTH = 280;

interface NavItem {
  type?: 'subheader';
  label: string;
  href?: string;
  icon?: React.ReactNode;
  adminOnly?: boolean;
  badge?: string;
}

const baseNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: <DashboardIcon /> },
  { type: 'subheader', label: 'Inventory Management' },
  { label: 'Products', href: '/dashboard/inventory/products', icon: <InventoryIcon /> },
  { label: 'Categories', href: '/dashboard/inventory/categories', icon: <CategoryIcon /> },
  { label: 'Stock & Reorder', href: '/dashboard/inventory/stock', icon: <WarehouseIcon /> },
  { type: 'subheader', label: 'Sales & Reports' },
  { label: 'Sales History', href: '/dashboard/sales/history', icon: <ReceiptIcon /> },
  { label: 'Open Tabs', href: '/dashboard/sales/tabs', icon: <BookmarkIcon /> },
  { label: 'Expenses', href: '/dashboard/expenses', icon: <MoneyOffIcon /> },
  { label: 'Daily Report', href: '/dashboard/reports/daily', icon: <AssessmentIcon /> },
  { label: 'Payment Reports', href: '/dashboard/reports/payments', icon: <PaymentsIcon /> },
  { type: 'subheader', label: 'Administration' },
  { label: 'Branch Setup', href: '/dashboard/settings/branch', icon: <StoreIcon /> },
  { label: 'Users & Roles', href: '/dashboard/settings/users', icon: <PeopleIcon /> },
  { label: 'Permissions', href: '/dashboard/settings/permissions', icon: <SecurityIcon /> },
  { label: 'Tenant Rules', href: '/dashboard/settings/tenant', icon: <TuneIcon /> },
  { label: 'Notifications', href: '/dashboard/settings/notifications', icon: <NotificationsIcon /> },
  { label: 'Subscription', href: '/dashboard/settings/subscription', icon: <CardMembershipIcon /> },
  { label: 'Audit Logs', href: '/dashboard/audit', icon: <SecurityIcon /> },
];

const adminNavItems: NavItem[] = [
  { type: 'subheader', label: 'Super Admin', adminOnly: true },
  { label: 'Tenants', href: '/dashboard/admin', icon: <AdminPanelSettingsIcon />, adminOnly: true },
  { label: 'All Users', href: '/dashboard/admin/users', icon: <PeopleIcon />, adminOnly: true },
  { label: 'Subscriptions & Invoices', href: '/dashboard/admin/subscriptions', icon: <CardMembershipIcon />, adminOnly: true },
  { label: 'Packages', href: '/dashboard/admin/packages', icon: <CardMembershipIcon />, adminOnly: true },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const auth = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [branches, setBranches] = useState<{ id: string; name: string; address: string }[]>([]);

  useEffect(() => { auth.hydrate(); }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('token')) {
      router.replace('/login');
    }
  }, [router]);

  useEffect(() => {
    if (!auth.isAuthenticated || !auth.user || auth.user.role === 'SuperAdmin') {
      setBranches([]);
      return;
    }
    api.get('/api/auth/branches').then((res) => {
      setBranches(Array.isArray(res.data) ? res.data : []);
    }).catch(() => {});
  }, [auth.isAuthenticated, auth.user?.role]);

  const switchBranch = async (branchId: string) => {
    if (branchId === auth.user?.branchId) return;
    try {
      const res = await api.post(`/api/auth/select-branch/${branchId}`);
      const { token, user, tenantId } = res.data;
      auth.login(token, user, tenantId);
      window.location.reload();
    } catch {}
  };

  useEffect(() => {
    const canViewAdminPortal = auth.user?.role === 'Admin' || auth.user?.role === 'SuperAdmin' ||
      auth.user?.permissions?.includes('admin.portal.view');
    if (auth.isAuthenticated && auth.user && !canViewAdminPortal) {
      router.replace('/pos');
    }
  }, [auth.isAuthenticated, auth.user, router]);

  const isSuperAdmin = auth.user?.role === 'SuperAdmin';

  const navItems = useMemo(() => {
    if (isSuperAdmin) return [...adminNavItems, ...baseNavItems];
    return baseNavItems;
  }, [isSuperAdmin]);

  const handleLogout = () => {
    auth.logout();
    router.push('/login');
  };

  const initials = (auth.user?.fullName || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const isActive = (href: string) => pathname === href || (href !== '/dashboard' && pathname.startsWith(href + '/'));

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: '#0F172A', color: '#94A3B8' }}>
      {/* Brand header */}
      <Box sx={{ p: 2.5, borderBottom: '1px solid rgba(51, 65, 85, 0.6)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{
              width: 36, height: 36, borderRadius: 2.5,
              background: 'linear-gradient(135deg, #059669, #10B981)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)',
            }}>
              <PointOfSaleIcon sx={{ color: '#fff', fontSize: 20 }} />
            </Box>
            <Typography sx={{ fontWeight: 800, fontSize: '1.2rem', color: '#fff', letterSpacing: '-0.01em' }}>
              Duka<span style={{ color: '#34D399' }}>POS</span>
            </Typography>
          </Box>
          <Chip
            label="PRO"
            size="small"
            sx={{
              height: 20, fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.08em',
              bgcolor: 'rgba(16, 185, 129, 0.1)', color: '#34D399',
              border: '1px solid rgba(16, 185, 129, 0.2)',
            }}
          />
        </Box>

        {/* User profile card */}
        <Box sx={{
          p: 1.5, borderRadius: 2.5,
          bgcolor: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(51, 65, 85, 0.6)',
          display: 'flex', alignItems: 'center', gap: 1.5,
        }}>
          <Box sx={{ position: 'relative' }}>
            <Avatar sx={{
              width: 40, height: 40, fontSize: '0.85rem', fontWeight: 700,
              background: isSuperAdmin
                ? 'linear-gradient(135deg, #6366F1, #4F46E5)'
                : 'linear-gradient(135deg, #0284C7, #0369A1)',
              ring: '2px solid rgba(51, 65, 85, 0.8)',
            }}>
              {initials}
            </Avatar>
            <Box sx={{
              position: 'absolute', bottom: 0, right: 0,
              width: 10, height: 10, borderRadius: '50%',
              bgcolor: '#10B981', border: '2px solid #0F172A',
            }} />
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: '#fff', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {auth.user?.fullName || 'User'}
            </Typography>
            <Chip
              label={isSuperAdmin ? 'Super Admin' : (auth.user?.role || 'User')}
              size="small"
              sx={{
                height: 18, fontSize: '0.6rem', fontWeight: 600, mt: 0.25,
                bgcolor: isSuperAdmin ? 'rgba(99, 102, 241, 0.15)' : 'rgba(2, 132, 199, 0.15)',
                color: isSuperAdmin ? '#A5B4FC' : '#7DD3FC',
                borderRadius: 1,
              }}
            />
          </Box>
        </Box>

        {/* Branch selector */}
        {branches.length > 1 && (
          <Box sx={{ mt: 1.5 }}>
            <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748B', mb: 0.5, px: 0.5 }}>
              Active Outlet
            </Typography>
            <Select
              value={auth.user?.branchId || ''}
              onChange={(e) => switchBranch(e.target.value)}
              size="small"
              fullWidth
              IconComponent={ExpandMoreIcon}
              startAdornment={<StorefrontIcon sx={{ fontSize: 16, color: '#64748B', mr: 1 }} />}
              sx={{
                fontSize: '0.8rem', color: '#E2E8F0',
                bgcolor: 'rgba(15, 23, 42, 0.9)',
                border: '1px solid rgba(51, 65, 85, 0.6)',
                borderRadius: 2,
                '.MuiOutlinedInput-notchedOutline': { border: 'none' },
                '.MuiSelect-icon': { color: '#64748B' },
              }}
            >
              {branches.map((b) => (
                <MenuItem key={b.id} value={b.id} sx={{ fontSize: '0.8rem' }}>
                  {b.name}
                </MenuItem>
              ))}
            </Select>
          </Box>
        )}
      </Box>

      {/* Navigation */}
      <List sx={{ flex: 1, pt: 2, px: 1.5, overflowY: 'auto' }}>
        {navItems.map((item, i) => {
          if (item.type === 'subheader') {
            return (
              <Typography
                key={i}
                sx={{
                  px: 1.5, mt: i === 0 ? 0 : 2.5, mb: 1,
                  fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.06em',
                  textTransform: 'uppercase', color: '#475569',
                }}
              >
                {item.label}
              </Typography>
            );
          }

          const active = isActive(item.href!);

          return (
            <ListItemButton
              key={item.href}
              selected={active}
              onClick={() => { router.push(item.href!); setMobileOpen(false); }}
              sx={{
                borderRadius: 2.5, mx: 0, mb: 0.25, py: 0.875,
                transition: 'all 0.15s ease',
                ...(active && {
                  bgcolor: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  '&:hover': { bgcolor: 'rgba(16, 185, 129, 0.18)' },
                  '& .MuiListItemIcon-root': { color: '#34D399' },
                }),
                ...(!active && {
                  border: '1px solid transparent',
                  '&:hover': { bgcolor: 'rgba(30, 41, 59, 0.6)', '& .MuiListItemIcon-root': { color: '#CBD5E1' } },
                }),
              }}
            >
              <ListItemIcon sx={{ minWidth: 32, color: active ? '#34D399' : '#64748B', '& .MuiSvgIcon-root': { fontSize: 20 } }}>{item.icon}</ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{
                  variant: 'body2',
                  fontWeight: active ? 600 : 500,
                  color: active ? '#34D399' : '#94A3B8',
                  fontSize: '0.8125rem',
                }}
              />
              {active && (
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#34D399', flexShrink: 0 }} />
              )}
            </ListItemButton>
          );
        })}
      </List>

      {/* Bottom actions */}
      <Box sx={{ p: 2, borderTop: '1px solid rgba(51, 65, 85, 0.6)', bgcolor: 'rgba(2, 6, 23, 0.4)', display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Button
          variant="contained"
          startIcon={<PointOfSaleIcon />}
          onClick={() => router.push('/pos')}
          fullWidth
          sx={{
            bgcolor: '#059669', color: '#fff',
            '&:hover': { bgcolor: '#10B981' },
            boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)',
            fontWeight: 700, fontSize: '0.8125rem', py: 1.25,
            borderRadius: 2.5,
          }}
        >
          Switch to POS
        </Button>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
          <Button
            size="small"
            startIcon={<LockOutlinedIcon sx={{ fontSize: '16px !important' }} />}
            onClick={() => {
              try { sessionStorage.setItem('dukapos_locked', 'true'); } catch {}
              window.location.reload();
            }}
            fullWidth
            sx={{
              color: '#94A3B8', fontSize: '0.75rem', py: 0.75, borderRadius: 2,
              border: '1px solid rgba(51, 65, 85, 0.6)',
              '&:hover': { bgcolor: 'rgba(30, 41, 59, 0.8)', color: '#E2E8F0' },
            }}
          >
            Lock
          </Button>
          <Button
            size="small"
            startIcon={<LogoutIcon sx={{ fontSize: '16px !important' }} />}
            onClick={handleLogout}
            fullWidth
            sx={{
              color: '#94A3B8', fontSize: '0.75rem', py: 0.75, borderRadius: 2,
              border: '1px solid rgba(51, 65, 85, 0.6)',
              '&:hover': { bgcolor: 'rgba(159, 18, 57, 0.15)', borderColor: 'rgba(159, 18, 57, 0.3)', color: '#FCA5A5' },
            }}
          >
            Sign Out
          </Button>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', width: '100%', minWidth: 0, overflowX: 'hidden', bgcolor: '#F8FAFC' }}>
      {/* Mobile app bar */}
      <AppBar
        position="fixed"
        sx={{
          display: { md: 'none' },
          zIndex: (t) => t.zIndex.drawer + 1,
          bgcolor: '#0F172A',
          borderBottom: '1px solid rgba(51, 65, 85, 0.6)',
        }}
        elevation={0}
      >
        <Toolbar>
          <IconButton edge="start" onClick={() => setMobileOpen(true)} sx={{ color: '#E2E8F0' }}><MenuIcon /></IconButton>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 1 }}>
            <Box sx={{
              width: 28, height: 28, borderRadius: 1.5,
              background: 'linear-gradient(135deg, #059669, #10B981)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <PointOfSaleIcon sx={{ color: '#fff', fontSize: 16 }} />
            </Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>
              Duka<span style={{ color: '#34D399' }}>POS</span>
            </Typography>
          </Box>
          <Box flex={1} />
          <Avatar sx={{
            width: 32, height: 32, fontSize: '0.75rem', fontWeight: 700,
            background: 'linear-gradient(135deg, #0284C7, #0369A1)',
          }}>
            {initials}
          </Avatar>
        </Toolbar>
      </AppBar>

      {/* Mobile drawer */}
      <Drawer variant="temporary" open={mobileOpen} onClose={() => setMobileOpen(false)}
        sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: DRAWER_WIDTH, border: 'none' } }}>
        {drawerContent}
      </Drawer>

      {/* Desktop sidebar */}
      <Drawer variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            border: 'none',
            boxShadow: 'none',
          },
        }}>
        {drawerContent}
      </Drawer>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flex: 1,
          minWidth: 0,
          ml: { md: `${DRAWER_WIDTH}px` },
          mt: { xs: '64px', md: 0 },
          display: 'flex',
          flexDirection: 'column',
          bgcolor: '#F8FAFC',
          minHeight: '100vh',
        }}
      >
        {/* Top app bar */}
        <Box sx={{
          display: { xs: 'none', md: 'flex' },
          height: 64, px: 3, bgcolor: '#fff',
          borderBottom: '1px solid #E2E8F0',
          alignItems: 'center', justifyContent: 'space-between',
          boxShadow: '0 1px 2px 0 rgba(0,0,0,0.03)',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#10B981' }} />
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 500, color: '#64748B' }}>System Online</Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{
              display: 'flex', alignItems: 'center', gap: 1,
              bgcolor: '#F1F5F9', px: 1.5, py: 0.75, borderRadius: 2,
            }}>
              <CalendarTodayIcon sx={{ fontSize: 14, color: '#64748B' }} />
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 500, color: '#475569' }}>
                {dayjs().format('dddd, DD MMM YYYY')}
              </Typography>
            </Box>
            <IconButton size="small" sx={{ color: '#64748B' }}>
              <Badge variant="dot" color="error"><NotificationsIcon sx={{ fontSize: 20 }} /></Badge>
            </IconButton>
            <Button
              size="small"
              startIcon={<TouchAppIcon sx={{ fontSize: '16px !important' }} />}
              onClick={() => router.push('/pos')}
              sx={{
                bgcolor: '#ECFDF5', color: '#047857',
                border: '1px solid #A7F3D0',
                '&:hover': { bgcolor: '#D1FAE5' },
                fontWeight: 600, fontSize: '0.75rem',
                borderRadius: 2, px: 1.5,
              }}
            >
              Open Register
            </Button>
          </Box>
        </Box>

        {/* Page content */}
        <Box sx={{ flex: 1, p: { xs: 2, md: 3 }, overflow: 'auto' }}>
          {children}
        </Box>
      </Box>

      <LockScreen idleTimeoutMinutes={5} />
    </Box>
  );
}
