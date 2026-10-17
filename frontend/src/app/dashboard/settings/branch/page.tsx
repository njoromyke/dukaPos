'use client';

import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import { useAuthStore } from '@/stores/auth-store';
import api from '@/lib/api';
import { useSnackbar } from 'notistack';

export default function BranchSettingsPage() {
  const auth = useAuthStore();
  const { enqueueSnackbar } = useSnackbar();
  const [form, setForm] = useState({ name: '', address: '', phone: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => { auth.hydrate(); }, []);

  useEffect(() => {
    if (!auth.user?.branchId) return;
    api.get(`/api/branches/${auth.user.branchId}`).then((r) => {
      setForm({ name: r.data.name || '', address: r.data.address || '', phone: r.data.phone || '' });
    }).catch(() => {});
  }, [auth.user?.branchId]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await api.put('/api/branches', { id: auth.user?.branchId, ...form });
      enqueueSnackbar('Branch updated', { variant: 'success' });
    } catch { enqueueSnackbar('Save failed', { variant: 'error' }); }
    finally { setLoading(false); }
  };

  return (
    <Box>
      <Typography variant="h5" mb={3}>Branch Settings</Typography>
      <Paper sx={{ p: 3, maxWidth: 500 }}>
        <Box display="flex" flexDirection="column" gap={2}>
          <TextField label="Branch Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <TextField label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} multiline rows={2} />
          <TextField label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Button variant="contained" onClick={handleSave} disabled={loading} sx={{ alignSelf: 'flex-start' }}>
            {loading ? 'Saving...' : 'Save'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
