'use client';

import { useCallback, useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useSnackbar } from 'notistack';
import { DPageHeader, DSearchFilter, DTable } from '@/components';
import { useAuthStore } from '@/stores/auth-store';
import { adminApi } from '@/lib/api';

type SubscriptionRow = {
  id: string; tenantId: string; tenantName: string; tenantSlug: string; packageName: string;
  billingCycle: number; status: number; pricePerCycle: number; startDate: string; expiresAt: string | null;
};
type InvoiceRow = {
  id: string; tenantId: string; tenantName: string; invoiceNumber: string; issuedAt: string; dueAt: string;
  periodStart: string; periodEnd: string | null; amount: number; status: number; paidAt: string | null;
  paymentMethod: string | null; transactionReference: string | null;
};

const cycleName = (value: number) => ({ 0: 'Lifetime', 1: 'Monthly', 2: 'Every 2 months', 3: 'Quarterly', 6: 'Every 6 months', 12: 'Annual' }[value] || `${value} months`);
const subscriptionStatus = (value: number) => ['Trial', 'Active', 'Past due', 'Expired', 'Cancelled', 'Lifetime'][value] || 'Unknown';
const invoiceStatus = (value: number) => ['Unpaid', 'Paid', 'Overdue', 'Void'][value] || 'Unknown';
const statusColor = (value: number): 'default' | 'success' | 'warning' | 'error' | 'info' => value === 1 || value === 5 ? 'success' : value === 2 ? 'warning' : value === 0 ? 'info' : 'default';
const dateLabel = (value: string | null) => value ? new Date(value).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function AdminSubscriptionsPage() {
  const role = useAuthStore((state) => state.user?.role);
  const { enqueueSnackbar } = useSnackbar();
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState('');
  const [payingInvoice, setPayingInvoice] = useState<InvoiceRow | null>(null);
  const [cancellingSubscription, setCancellingSubscription] = useState<SubscriptionRow | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('M-Pesa');
  const [reference, setReference] = useState('');
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [subscriptionResult, invoiceResult] = await Promise.all([
        adminApi.listSubscriptions(),
        adminApi.listInvoices({ page: 1, pageSize: 200, status: invoiceStatusFilter || undefined }),
      ]);
      setSubscriptions(Array.isArray(subscriptionResult.data) ? subscriptionResult.data : []);
      setInvoices(Array.isArray(invoiceResult.data) ? invoiceResult.data : []);
    } catch (error: any) {
      enqueueSnackbar(error.response?.data?.message || 'Could not load subscription billing data', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar, invoiceStatusFilter]);

  useEffect(() => { void load(); }, [load]);

  const cancel = async () => {
    if (!cancellingSubscription) return;
    try {
      await adminApi.cancelSubscription(cancellingSubscription.id);
      enqueueSnackbar('Subscription cancelled', { variant: 'success' });
      setCancellingSubscription(null);
      await load();
    } catch (error: any) {
      enqueueSnackbar(error.response?.data?.message || 'Could not cancel subscription', { variant: 'error' });
    }
  };

  const markPaid = async () => {
    if (!payingInvoice) return;
    setSaving(true);
    try {
      await adminApi.markInvoicePaid(payingInvoice.id, { paymentMethod, transactionReference: reference || undefined });
      enqueueSnackbar(`${payingInvoice.invoiceNumber} marked as paid`, { variant: 'success' });
      setPayingInvoice(null);
      setReference('');
      await load();
    } catch (error: any) {
      enqueueSnackbar(error.response?.data?.message || 'Could not update invoice', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (role !== 'SuperAdmin') return <Alert severity="error">SuperAdmin access required.</Alert>;

  const currentSubscriptions = subscriptions.filter((item) => ![3, 4].includes(item.status));
  const visibleSubscriptions = currentSubscriptions.filter((item) => `${item.tenantName} ${item.tenantSlug} ${item.packageName}`.toLowerCase().includes(search.toLowerCase()));
  const visibleInvoices = invoices.filter((item) => `${item.invoiceNumber} ${item.tenantName} ${item.transactionReference || ''}`.toLowerCase().includes(search.toLowerCase()));
  const subscriptionColumns = [
    { field: 'tenantName', header: 'Tenant', render: (item: SubscriptionRow) => <><Typography fontWeight={600}>{item.tenantName}</Typography><Typography variant="caption" color="text.secondary">{item.tenantSlug}</Typography></> },
    { field: 'packageName', header: 'Package' },
    { field: 'billingCycle', header: 'Cycle', render: (item: SubscriptionRow) => cycleName(item.billingCycle) },
    { field: 'pricePerCycle', header: 'Price per cycle', render: (item: SubscriptionRow) => `KES ${item.pricePerCycle.toLocaleString()}` },
    { field: 'startDate', header: 'Started', render: (item: SubscriptionRow) => dateLabel(item.startDate) },
    { field: 'expiresAt', header: 'Next expiry', render: (item: SubscriptionRow) => dateLabel(item.expiresAt) },
    { field: 'status', header: 'Status', render: (item: SubscriptionRow) => <Chip size="small" label={subscriptionStatus(item.status)} color={statusColor(item.status)} /> },
    { field: 'actions', header: 'Actions', sortable: false, render: (item: SubscriptionRow) => <Button size="small" color="error" disabled={item.status === 4} onClick={() => setCancellingSubscription(item)}>Cancel</Button> },
  ];
  const invoiceColumns = [
    { field: 'invoiceNumber', header: 'Invoice' },
    { field: 'tenantName', header: 'Tenant' },
    { field: 'periodStart', header: 'Billing period', render: (item: InvoiceRow) => `${dateLabel(item.periodStart)} – ${dateLabel(item.periodEnd)}` },
    { field: 'issuedAt', header: 'Issued', render: (item: InvoiceRow) => dateLabel(item.issuedAt) },
    { field: 'dueAt', header: 'Due', render: (item: InvoiceRow) => dateLabel(item.dueAt) },
    { field: 'amount', header: 'Amount', render: (item: InvoiceRow) => `KES ${item.amount.toLocaleString()}` },
    { field: 'status', header: 'Status', render: (item: InvoiceRow) => <Chip size="small" label={invoiceStatus(item.status)} color={statusColor(item.status)} /> },
    { field: 'paymentMethod', header: 'Payment', render: (item: InvoiceRow) => item.paymentMethod || item.transactionReference || '—' },
    { field: 'actions', header: 'Actions', sortable: false, render: (item: InvoiceRow) => item.status !== 1 && item.status !== 3 ? <Button size="small" onClick={() => setPayingInvoice(item)}>Record payment</Button> : '—' },
  ];

  return (
    <Box>
      <DPageHeader title="Subscriptions & invoices" subtitle="Manage tenant plans, billing periods, due dates, and payment status" breadcrumbs={[{ label: 'Admin', href: '/dashboard/admin' }, { label: 'Subscriptions & invoices' }]} />

      <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5 }}>Active subscriptions ({currentSubscriptions.length})</Typography>
      <DSearchFilter search={search} onSearchChange={setSearch} onRefresh={() => void load()} searchPlaceholder="Search tenant or package" />
      <DTable columns={subscriptionColumns} rows={visibleSubscriptions} rowKey={(item) => item.id} loading={loading} pageSize={10} pageSizeOptions={[10, 20, 50]} emptyMessage="No subscriptions found" />

      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} sx={{ mb: 1.5 }} spacing={1}>
        <Typography variant="h6" fontWeight={700}>Invoices ({invoices.length})</Typography>
        <TextField select size="small" label="Invoice status" value={invoiceStatusFilter} onChange={(event) => setInvoiceStatusFilter(event.target.value)} sx={{ minWidth: 180 }}>
          <MenuItem value="">All statuses</MenuItem><MenuItem value="Unpaid">Unpaid</MenuItem><MenuItem value="Overdue">Overdue</MenuItem><MenuItem value="Paid">Paid</MenuItem><MenuItem value="Void">Void</MenuItem>
        </TextField>
      </Stack>
      <DTable columns={invoiceColumns} rows={visibleInvoices} rowKey={(item) => item.id} loading={loading} pageSize={10} pageSizeOptions={[10, 20, 50]} emptyMessage="No invoices match this filter" />

      <Dialog open={!!payingInvoice} onClose={() => !saving && setPayingInvoice(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Record invoice payment</DialogTitle>
        <DialogContent><Stack spacing={2} sx={{ pt: 1 }}>
          <Typography variant="body2">{payingInvoice?.tenantName} · {payingInvoice?.invoiceNumber} · KES {payingInvoice?.amount.toLocaleString()}</Typography>
          <TextField select label="Payment method" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
            {['M-Pesa', 'Bank transfer', 'Cash', 'Other'].map((method) => <MenuItem key={method} value={method}>{method}</MenuItem>)}
          </TextField>
          <TextField label="Transaction reference" value={reference} onChange={(event) => setReference(event.target.value)} />
        </Stack></DialogContent>
        <DialogActions><Button onClick={() => setPayingInvoice(null)} disabled={saving}>Cancel</Button><Button variant="contained" onClick={() => void markPaid()} disabled={saving}>{saving ? 'Saving…' : 'Mark paid'}</Button></DialogActions>
      </Dialog>

      <Dialog open={!!cancellingSubscription} onClose={() => !saving && setCancellingSubscription(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Cancel subscription?</DialogTitle>
        <DialogContent>
          <Typography>
            Cancel the {cancellingSubscription?.packageName} plan for {cancellingSubscription?.tenantName}?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            The subscription will be marked cancelled and this tenant will no longer renew on this plan.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancellingSubscription(null)} disabled={saving}>Keep subscription</Button>
          <Button color="error" variant="contained" onClick={() => void cancel()} disabled={saving}>
            {saving ? 'Cancelling…' : 'Cancel subscription'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
