'use client';

import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import Divider from '@mui/material/Divider';
import { tenantSettingsApi } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { useSnackbar } from 'notistack';

interface TenantSettings {
  maxLoginAttempts: number;
  lockoutDurationMinutes: number;
  sessionTimeoutMinutes: number;
  minPasswordLength: number;
  requirePasswordChangeOnFirstLogin: boolean;
  allowCashierProductRemoval: boolean;
  lowStockThreshold: number;
  lowStockEmailEnabled: boolean;
  lowStockEmailRecipients: string;
}

const defaults: TenantSettings = {
  maxLoginAttempts: 5,
  lockoutDurationMinutes: 15,
  sessionTimeoutMinutes: 5,
  minPasswordLength: 8,
  requirePasswordChangeOnFirstLogin: true,
  allowCashierProductRemoval: false,
  lowStockThreshold: 10,
  lowStockEmailEnabled: false,
  lowStockEmailRecipients: '',
};

export default function TenantSettingsPage() {
  const auth = useAuthStore();
  const { enqueueSnackbar } = useSnackbar();
  const [settings, setSettings] = useState<TenantSettings>(defaults);
  const [loading, setLoading] = useState(false);

  useEffect(() => { auth.hydrate(); }, []);

  useEffect(() => {
    const tenantId = typeof window !== 'undefined' ? localStorage.getItem('tenantId') : null;
    if (!tenantId) return;
    tenantSettingsApi.get(tenantId).then((r) => {
      if (r.data) setSettings({ ...defaults, ...r.data });
    }).catch(() => {});
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      await tenantSettingsApi.update(settings as unknown as Record<string, unknown>);
      enqueueSnackbar('Settings saved', { variant: 'success' });
    } catch { enqueueSnackbar('Failed to save settings', { variant: 'error' }); }
    finally { setLoading(false); }
  };

  const update = <K extends keyof TenantSettings>(key: K, value: TenantSettings[K]) =>
    setSettings((prev) => ({ ...prev, [key]: value }));

  return (
    <Box>
      <Typography variant="h5" mb={3}>Tenant Rules & Settings</Typography>

      <Paper sx={{ p: 3, maxWidth: 600 }}>
        <Typography variant="subtitle1" fontWeight={700} mb={2}>Login & Security</Typography>
        <Box display="flex" flexDirection="column" gap={2}>
          <TextField label="Max Login Attempts" type="number" value={settings.maxLoginAttempts}
            onChange={(e) => update('maxLoginAttempts', parseInt(e.target.value) || 5)}
            helperText="Account locks after this many failed attempts" />
          <TextField label="Lockout Duration (minutes)" type="number" value={settings.lockoutDurationMinutes}
            onChange={(e) => update('lockoutDurationMinutes', parseInt(e.target.value) || 15)} />
          <TextField label="Session Timeout (minutes)" type="number" value={settings.sessionTimeoutMinutes}
            onChange={(e) => update('sessionTimeoutMinutes', parseInt(e.target.value) || 5)}
            helperText="Terminal locks after idle for this duration" />
          <TextField label="Min Password Length" type="number" value={settings.minPasswordLength}
            onChange={(e) => update('minPasswordLength', parseInt(e.target.value) || 8)} />
          <FormControlLabel control={
            <Switch checked={settings.requirePasswordChangeOnFirstLogin}
              onChange={(e) => update('requirePasswordChangeOnFirstLogin', e.target.checked)} />
          } label="Require password change on first login" />
        </Box>

        <Divider sx={{ my: 3 }} />

        <Typography variant="subtitle1" fontWeight={700} mb={2}>POS Rules</Typography>
        <Box display="flex" flexDirection="column" gap={2}>
          <FormControlLabel control={
            <Switch checked={settings.allowCashierProductRemoval}
              onChange={(e) => update('allowCashierProductRemoval', e.target.checked)} />
          } label="Allow cashiers to remove products from cart" />
        </Box>

        <Divider sx={{ my: 3 }} />

        <Typography variant="subtitle1" fontWeight={700} mb={2}>Stock Alerts</Typography>
        <Box display="flex" flexDirection="column" gap={2}>
          <TextField label="Low Stock Threshold" type="number" value={settings.lowStockThreshold}
            onChange={(e) => update('lowStockThreshold', parseInt(e.target.value) || 10)}
            helperText="Alert when stock falls below this quantity" />
          <FormControlLabel control={
            <Switch checked={settings.lowStockEmailEnabled}
              onChange={(e) => update('lowStockEmailEnabled', e.target.checked)} />
          } label="Enable low stock email alerts" />
          {settings.lowStockEmailEnabled && (
            <TextField label="Email Recipients" value={settings.lowStockEmailRecipients}
              onChange={(e) => update('lowStockEmailRecipients', e.target.value)}
              helperText="Comma-separated email addresses" multiline rows={2} />
          )}
        </Box>

        <Box mt={3}>
          <Button variant="contained" onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save Settings'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
