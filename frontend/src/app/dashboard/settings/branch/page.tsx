'use client';

import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import { useAuthStore } from '@/stores/auth-store';
import api from '@/lib/api';
import { useSnackbar } from 'notistack';
import { DPageHeader } from '@/components';

export default function BranchSettingsPage() {
  const auth = useAuthStore();
  const { enqueueSnackbar } = useSnackbar();
  const [form, setForm] = useState({ name: '', address: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [mpesa, setMpesa] = useState({ consumerKey: '', consumerSecret: '', passkey: '', shortCode: '', environment: 'production' });
  const [mpesaConfigured, setMpesaConfigured] = useState(false);
  const [mpesaLoading, setMpesaLoading] = useState(false);

  useEffect(() => {
    if (!auth.user?.branchId) return;
    api.get(`/api/branch/${auth.user.branchId}`).then((r) => {
      setForm({ name: r.data.name || '', address: r.data.address || '', phone: r.data.phone || '' });
    }).catch(() => {});
  }, [auth.user?.branchId]);

  useEffect(() => {
    if (!auth.user?.branchId) return;
    api.get(`/api/branches/${auth.user.branchId}/mpesa-settings`).then((response) => {
      setMpesaConfigured(Boolean(response.data.configured));
      setMpesa((current) => ({ ...current, shortCode: response.data.shortCode ?? '', environment: response.data.environment ?? 'production' }));
    }).catch(() => {});
  }, [auth.user?.branchId]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await api.put('/api/branch', { id: auth.user?.branchId, ...form });
      enqueueSnackbar('Branch updated', { variant: 'success' });
    } catch { enqueueSnackbar('Save failed', { variant: 'error' }); }
    finally { setLoading(false); }
  };

  const saveMpesa = async () => {
    if (!auth.user?.branchId) return;
    setMpesaLoading(true);
    try {
      await api.put(`/api/branches/${auth.user.branchId}/mpesa-settings`, mpesa);
      setMpesaConfigured(true);
      setMpesa((current) => ({ ...current, consumerKey: '', consumerSecret: '', passkey: '' }));
      enqueueSnackbar('Branch M-Pesa settings saved', { variant: 'success' });
    } catch (error: any) {
      enqueueSnackbar(error?.response?.data?.message ?? 'Could not save M-Pesa settings', { variant: 'error' });
    } finally { setMpesaLoading(false); }
  };

  return (
    <Box sx={{ minHeight: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
      <DPageHeader title="Branch Settings" breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Settings' }, { label: 'Branch' }]} />
      <Paper sx={{ p: { xs: 2, md: 4 }, width: '100%', flex: 1 }}>
        <Box display="flex" flexDirection="column" gap={2}>
          <TextField label="Branch Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <TextField label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} multiline rows={2} />
          <TextField label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Button variant="contained" onClick={handleSave} disabled={loading} sx={{ alignSelf: 'flex-start' }}>
            {loading ? 'Saving...' : 'Save'}
          </Button>
        </Box>
      </Paper>
      <Paper sx={{ p: { xs: 2, md: 4 }, mt: 2 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>M-Pesa STK Push for this branch</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Each branch uses its own Daraja credentials. Credentials are encrypted at rest and never shown after saving.
        </Typography>
        {mpesaConfigured && <Alert severity="success" sx={{ mb: 2 }}>M-Pesa is configured for this branch. Enter credentials again only to replace them.</Alert>}
        <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '1fr 1fr' }} gap={2}>
          <TextField label="Consumer key" value={mpesa.consumerKey} onChange={(e) => setMpesa({ ...mpesa, consumerKey: e.target.value })} autoComplete="off" />
          <TextField label="Consumer secret" type="password" value={mpesa.consumerSecret} onChange={(e) => setMpesa({ ...mpesa, consumerSecret: e.target.value })} autoComplete="new-password" />
          <TextField label="Passkey" type="password" value={mpesa.passkey} onChange={(e) => setMpesa({ ...mpesa, passkey: e.target.value })} autoComplete="new-password" />
          <TextField label="Paybill / Till shortcode" value={mpesa.shortCode} onChange={(e) => setMpesa({ ...mpesa, shortCode: e.target.value })} />
          <FormControl>
            <InputLabel>Environment</InputLabel>
            <Select label="Environment" value={mpesa.environment} onChange={(e) => setMpesa({ ...mpesa, environment: e.target.value })}>
              <MenuItem value="production">Production</MenuItem>
              <MenuItem value="sandbox">Sandbox</MenuItem>
            </Select>
          </FormControl>
        </Box>
        <Button variant="contained" onClick={saveMpesa} disabled={mpesaLoading || !mpesa.consumerKey || !mpesa.consumerSecret || !mpesa.passkey || !mpesa.shortCode} sx={{ mt: 2 }}>
          {mpesaLoading ? 'Saving...' : 'Save branch M-Pesa settings'}
        </Button>
      </Paper>
    </Box>
  );
}
