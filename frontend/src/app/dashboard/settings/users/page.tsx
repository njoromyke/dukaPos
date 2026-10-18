'use client';

import { useEffect, useState, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import { usersApi } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { useSnackbar } from 'notistack';

interface User {
  id: string;
  fullName: string;
  email: string;
  role: string;
  isActive: boolean;
  isLocked?: boolean;
  branchId?: string;
}

const roles = ['Cashier', 'Supervisor', 'Manager', 'Admin'];

export default function UsersPage() {
  const auth = useAuthStore();
  const { enqueueSnackbar } = useSnackbar();
  const [users, setUsers] = useState<User[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ fullName: '', email: '', password: '', role: 'Cashier', pin: '', branchId: '' });

  useEffect(() => { auth.hydrate(); }, []);

  const load = useCallback(() => {
    usersApi.list(auth.user?.branchId).then((r) => setUsers(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  }, [auth.user?.branchId]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    try {
      await usersApi.create({ ...form, branchId: form.branchId || auth.user?.branchId || '' });
      enqueueSnackbar('User created', { variant: 'success' });
      setDialogOpen(false);
      load();
    } catch { enqueueSnackbar('Failed to create user', { variant: 'error' }); }
  };

  const handleLock = async (userId: string) => {
    try {
      await usersApi.lock(userId, auth.user?.id || '');
      enqueueSnackbar('User locked', { variant: 'success' });
      load();
    } catch { enqueueSnackbar('Failed to lock user', { variant: 'error' }); }
  };

  const handleUnlock = async (userId: string) => {
    try {
      await usersApi.unlock(userId, auth.user?.id || '');
      enqueueSnackbar('User unlocked', { variant: 'success' });
      load();
    } catch { enqueueSnackbar('Failed to unlock user', { variant: 'error' }); }
  };

  return (
    <Box>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Typography variant="h5">Users</Typography>
        <Box display="flex" gap={1}>
          <IconButton onClick={load} title="Refresh"><RefreshIcon /></IconButton>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setForm({ fullName: '', email: '', password: '', role: 'Cashier', pin: '', branchId: auth.user?.branchId || '' }); setDialogOpen(true); }}>
            Add user
          </Button>
        </Box>
      </Box>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Status</TableCell>
              <TableCell width={120}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id} hover>
                <TableCell><Typography variant="body2" fontWeight={600}>{u.fullName}</Typography></TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell><Chip label={u.role} size="small" /></TableCell>
                <TableCell>
                  <Box display="flex" gap={0.5}>
                    <Chip label={u.isActive ? 'Active' : 'Inactive'} size="small" color={u.isActive ? 'success' : 'default'} variant="outlined" />
                    {u.isLocked && <Chip label="Locked" size="small" color="error" variant="outlined" />}
                  </Box>
                </TableCell>
                <TableCell>
                  {u.id !== auth.user?.id && (
                    u.isLocked ? (
                      <IconButton size="small" onClick={() => handleUnlock(u.id)} title="Unlock user" color="success">
                        <LockOpenIcon fontSize="small" />
                      </IconButton>
                    ) : (
                      <IconButton size="small" onClick={() => handleLock(u.id)} title="Lock user" color="warning">
                        <LockIcon fontSize="small" />
                      </IconButton>
                    )
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>New User</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField label="Full Name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
            <TextField label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            <TextField label="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            <TextField label="PIN (4 digits)" value={form.pin} onChange={(e) => setForm({ ...form, pin: e.target.value })} inputProps={{ maxLength: 4 }} />
            <TextField select label="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {roles.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate}>Create</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
