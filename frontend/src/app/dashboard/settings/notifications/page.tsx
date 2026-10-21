'use client';

import { useCallback, useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import SendIcon from '@mui/icons-material/SendOutlined';
import api from '@/lib/api';
import { DPageHeader, DSearchFilter, DTable, DStatusChip } from '@/components';
import type { DColumn } from '@/components';

interface NotificationSettings {
  id: string;
  lowStockEmailEnabled: boolean;
  lowStockSmsEnabled: boolean;
  lowStockPushEnabled: boolean;
  alertEmailRecipients: string[];
  alertSmsRecipients: string[];
  registeredDevices: number;
}

interface NotificationDelivery {
  id: string;
  channel: string;
  title: string;
  body: string;
  status: string;
  sentAt: string;
  resentFromId?: string | null;
}

export default function NotificationSettingsPage() {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [pushTitle, setPushTitle] = useState('');
  const [pushBody, setPushBody] = useState('');
  const [sending, setSending] = useState(false);
  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
  const [tab, setTab] = useState(0);
  const [deliveries, setDeliveries] = useState<NotificationDelivery[]>([]);
  const [deliveryCount, setDeliveryCount] = useState(0);
  const [deliveryPage, setDeliveryPage] = useState(0);
  const [deliveryPageSize, setDeliveryPageSize] = useState(10);
  const [deliverySearch, setDeliverySearch] = useState('');
  const [historyLoading, setHistoryLoading] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const response = await api.get('/api/notifications/history', {
        params: { page: deliveryPage + 1, pageSize: deliveryPageSize, search: deliverySearch || undefined },
      });
      setDeliveries(response.data.items || []);
      setDeliveryCount(response.data.totalCount || 0);
    } catch {
      setSnack({ open: true, message: 'Failed to load notification history', severity: 'error' });
    } finally {
      setHistoryLoading(false);
    }
  }, [deliveryPage, deliveryPageSize, deliverySearch]);

  useEffect(() => {
    if (tab === 1) void loadHistory();
  }, [tab, loadHistory]);

  useEffect(() => {
    api.get('/api/notifications/settings').then((res) => {
      setSettings(res.data);
    }).catch(() => {
      setSnack({ open: true, message: 'Failed to load notification settings', severity: 'error' });
    }).finally(() => setLoading(false));
  }, []);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const res = await api.put('/api/notifications/settings', {
        lowStockEmailEnabled: settings.lowStockEmailEnabled,
        lowStockSmsEnabled: settings.lowStockSmsEnabled,
        lowStockPushEnabled: settings.lowStockPushEnabled,
        alertEmailRecipients: settings.alertEmailRecipients,
        alertSmsRecipients: settings.alertSmsRecipients,
      });
      setSettings(res.data);
      setSnack({ open: true, message: 'Settings saved', severity: 'success' });
    } catch {
      setSnack({ open: true, message: 'Failed to save settings', severity: 'error' });
    }
    setSaving(false);
  };

  const addEmail = () => {
    if (!settings || !newEmail.trim() || settings.alertEmailRecipients.includes(newEmail.trim())) return;
    setSettings({ ...settings, alertEmailRecipients: [...settings.alertEmailRecipients, newEmail.trim()] });
    setNewEmail('');
  };

  const removeEmail = (email: string) => {
    if (!settings) return;
    setSettings({ ...settings, alertEmailRecipients: settings.alertEmailRecipients.filter((e) => e !== email) });
  };

  const addPhone = () => {
    if (!settings || !newPhone.trim() || settings.alertSmsRecipients.includes(newPhone.trim())) return;
    setSettings({ ...settings, alertSmsRecipients: [...settings.alertSmsRecipients, newPhone.trim()] });
    setNewPhone('');
  };

  const removePhone = (phone: string) => {
    if (!settings) return;
    setSettings({ ...settings, alertSmsRecipients: settings.alertSmsRecipients.filter((p) => p !== phone) });
  };

  const sendPush = async () => {
    if (!pushTitle.trim() || !pushBody.trim()) return;
    setSending(true);
    try {
      const response = await api.post('/api/notifications/send-push', { title: pushTitle, body: pushBody });
      const status = response.data?.status || 'Sent';
      setSnack({ open: true, message: status === 'Sent' ? 'Push notification sent' : `Notification status: ${status}`, severity: status === 'Sent' ? 'success' : 'error' });
      setPushTitle('');
      setPushBody('');
      if (tab === 1) void loadHistory();
    } catch {
      setSnack({ open: true, message: 'Failed to send push notification', severity: 'error' });
    }
    setSending(false);
  };

  const resend = async (notification: NotificationDelivery) => {
    setResendingId(notification.id);
    try {
      const response = await api.post(`/api/notifications/${notification.id}/resend`);
      const status = response.data?.status || 'Sent';
      setSnack({ open: true, message: status === 'Sent' ? 'Notification resent' : `Notification status: ${status}`, severity: status === 'Sent' ? 'success' : 'error' });
      await loadHistory();
    } catch (error: any) {
      setSnack({ open: true, message: error.response?.data?.message || 'Failed to resend notification', severity: 'error' });
    } finally {
      setResendingId(null);
    }
  };

  const deliveryColumns: DColumn<NotificationDelivery>[] = [
    { field: 'sentAt', header: 'Sent', render: (item) => new Date(item.sentAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) },
    { field: 'channel', header: 'Channel' },
    { field: 'title', header: 'Title' },
    { field: 'body', header: 'Message', render: (item) => <Typography variant="body2" title={item.body} noWrap sx={{ maxWidth: 360 }}>{item.body}</Typography> },
    { field: 'status', header: 'Status', render: (item) => <DStatusChip status={item.status} /> },
    { field: 'actions', header: 'Actions', sortable: false, render: (item) => <Button size="small" onClick={() => void resend(item)} disabled={resendingId === item.id}>{resendingId === item.id ? 'Sending…' : 'Resend'}</Button> },
  ];

  if (loading) return <Typography>Loading...</Typography>;
  if (!settings) return <Typography color="error">Could not load settings.</Typography>;

  return (
    <Box>
      <DPageHeader title="Notifications" subtitle="Manage delivery settings and review sent notifications" breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Settings' }, { label: 'Notifications' }]} />
      <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ mb: 2 }}>
        <Tab label="Settings" />
        <Tab label={`Notification history (${deliveryCount})`} />
      </Tabs>

      <Box sx={{ display: tab === 0 ? 'block' : 'none' }}>

      <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Low Stock Alerts</Typography>

        <FormControlLabel
          control={<Switch checked={settings.lowStockEmailEnabled} onChange={(e) => setSettings({ ...settings, lowStockEmailEnabled: e.target.checked })} />}
          label="Email notifications"
        />
        <FormControlLabel
          control={<Switch checked={settings.lowStockSmsEnabled} onChange={(e) => setSettings({ ...settings, lowStockSmsEnabled: e.target.checked })} />}
          label="SMS notifications"
        />
        <FormControlLabel
          control={<Switch checked={settings.lowStockPushEnabled} onChange={(e) => setSettings({ ...settings, lowStockPushEnabled: e.target.checked })} />}
          label="Mobile push notifications"
        />

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Email Recipients</Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
          {settings.alertEmailRecipients.map((email) => (
            <Chip key={email} label={email} onDelete={() => removeEmail(email)} size="small" />
          ))}
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField size="small" label="Add email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addEmail()} sx={{ flex: 1 }} />
          <Button variant="outlined" onClick={addEmail}>Add</Button>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>SMS Recipients</Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
          {settings.alertSmsRecipients.map((phone) => (
            <Chip key={phone} label={phone} onDelete={() => removePhone(phone)} size="small" />
          ))}
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField size="small" label="Add phone" value={newPhone} onChange={(e) => setNewPhone(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addPhone()} sx={{ flex: 1 }} />
          <Button variant="outlined" onClick={addPhone}>Add</Button>
        </Box>

        <Divider sx={{ my: 2 }} />
        <Button variant="contained" onClick={save} disabled={saving}>
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </Paper>

      <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Send Push Notification</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Send a push notification to all registered mobile devices ({settings.registeredDevices} device{settings.registeredDevices !== 1 ? 's' : ''}).
        </Typography>

        <TextField fullWidth size="small" label="Title" value={pushTitle} onChange={(e) => setPushTitle(e.target.value)} sx={{ mb: 1.5 }} />
        <TextField fullWidth size="small" label="Message" value={pushBody} onChange={(e) => setPushBody(e.target.value)} multiline rows={2} sx={{ mb: 2 }} />
        <Button variant="contained" startIcon={<SendIcon />} onClick={sendPush} disabled={sending || !pushTitle.trim() || !pushBody.trim()}>
          {sending ? 'Sending...' : 'Send Notification'}
        </Button>
      </Paper>
      </Box>

      {tab === 1 && <>
        <DSearchFilter search={deliverySearch} onSearchChange={(value) => { setDeliverySearch(value); setDeliveryPage(0); }} searchPlaceholder="Search notifications..." onRefresh={() => void loadHistory()} />
        <DTable
          columns={deliveryColumns}
          rows={deliveries}
          rowKey={(item) => item.id}
          loading={historyLoading}
          totalCount={deliveryCount}
          page={deliveryPage}
          pageSize={deliveryPageSize}
          pageSizeOptions={[10, 20, 50]}
          onPageChange={setDeliveryPage}
          onPageSizeChange={(size) => { setDeliveryPageSize(size); setDeliveryPage(0); }}
          emptyMessage="No sent notifications found"
        />
      </>}

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack({ ...snack, open: false })}>
        <Alert severity={snack.severity} onClose={() => setSnack({ ...snack, open: false })}>{snack.message}</Alert>
      </Snackbar>
    </Box>
  );
}
