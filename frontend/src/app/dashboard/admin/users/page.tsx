'use client';

import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Avatar from '@mui/material/Avatar';
import SearchIcon from '@mui/icons-material/Search';
import PeopleIcon from '@mui/icons-material/PeopleOutlined';
import { useAuthStore } from '@/stores/auth-store';
import { adminApi } from '@/lib/api';

interface User {
  id: string;
  fullName: string;
  email: string;
  role: string;
  branchId: string;
  isActive: boolean;
  createdAt: string;
}

const roleColors: Record<string, { bg: string; color: string }> = {
  Admin: { bg: '#EFF6FF', color: '#1565C0' },
  Manager: { bg: '#F5F3FF', color: '#7C3AED' },
  Supervisor: { bg: '#FFF7ED', color: '#D97706' },
  Cashier: { bg: '#F0FDF4', color: '#059669' },
};

export default function AdminUsersPage() {
  const auth = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => { auth.hydrate(); }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await adminApi.getAllUsers();
        setUsers(res.data || []);
      } catch { /* */ } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (auth.user?.role !== 'SuperAdmin') {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">Access denied. SuperAdmin role required.</Alert>
      </Box>
    );
  }

  const filtered = users.filter((u) =>
    u.fullName.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A' }}>All Users</Typography>
          <Typography variant="body2" sx={{ color: '#64748B', mt: 0.5 }}>
            {users.length} user{users.length !== 1 ? 's' : ''} across all tenants
          </Typography>
        </Box>
      </Box>

      <TextField
        placeholder="Search by name, email or role..."
        size="small"
        sx={{
          mb: 3, width: { xs: '100%', sm: 360 },
          '& .MuiOutlinedInput-root': { bgcolor: '#fff' },
        }}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" sx={{ color: '#94A3B8' }} />
              </InputAdornment>
            ),
          },
        }}
      />

      <TableContainer component={Paper} sx={{ border: '1px solid #E2E8F0', boxShadow: 'none' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#F8FAFC' }}>
              <TableCell>User</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Joined</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                  <Typography color="text.secondary">Loading users...</Typography>
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 8 }}>
                  <PeopleIcon sx={{ fontSize: 48, color: '#CBD5E1', mb: 1 }} />
                  <Typography variant="body1" sx={{ color: '#64748B', fontWeight: 600, mb: 0.5 }}>
                    No users found
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Users will appear here once tenants create them
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((user) => {
                const initials = user.fullName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
                const rc = roleColors[user.role] || { bg: '#F1F5F9', color: '#64748B' };
                return (
                  <TableRow key={user.id} hover sx={{ '&:hover': { bgcolor: '#F8FAFC' } }}>
                    <TableCell sx={{ py: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{
                          width: 36, height: 36, fontSize: '0.8rem', fontWeight: 700,
                          bgcolor: rc.bg, color: rc.color,
                        }}>
                          {initials}
                        </Avatar>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#0F172A' }}>
                          {user.fullName}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ py: 2, color: '#64748B' }}>{user.email}</TableCell>
                    <TableCell sx={{ py: 2 }}>
                      <Chip label={user.role} size="small"
                        sx={{ bgcolor: rc.bg, color: rc.color, fontWeight: 600 }} />
                    </TableCell>
                    <TableCell sx={{ py: 2 }}>
                      <Chip
                        label={user.isActive ? 'Active' : 'Inactive'}
                        size="small"
                        sx={{
                          bgcolor: user.isActive ? '#ECFDF5' : '#F1F5F9',
                          color: user.isActive ? '#059669' : '#64748B',
                          fontWeight: 600,
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ py: 2, color: '#64748B' }}>
                      {new Date(user.createdAt).toLocaleDateString('en-KE', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
