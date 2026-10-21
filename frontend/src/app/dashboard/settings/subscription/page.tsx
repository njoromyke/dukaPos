'use client';

import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import LinearProgress from '@mui/material/LinearProgress';
import api from '@/lib/api';
import { DTable } from '@/components';

interface SubscriptionInfo {
  id: string;
  tenantId: string;
  packageId: string;
  packageName: string;
  tier: number;
  billingCycle: number;
  status: number;
  pricePerCycle: number;
  startDate: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  expiresAt: string | null;
  features: string[];
  lastPaymentAt: string | null;
}

interface PackageInfo {
  id: string;
  name: string;
  tier: number;
  description: string;
  monthlyPrice: number;
  lifetimePrice: number | null;
  features: string[];
  maxBranches: number;
  maxUsers: number;
}

interface PaymentRow {
  id: string;
  amount: number;
  paymentMethod: string;
  transactionReference: string | null;
  periodStart: string;
  periodEnd: string;
  paidAt: string;
  notes: string | null;
}

const statusLabel = (s: number) => ['Trial', 'Active', 'Past Due', 'Expired', 'Cancelled', 'Lifetime'][s] || 'Unknown';
const statusColor = (s: number): 'info' | 'success' | 'warning' | 'error' | 'default' => (['info', 'success', 'warning', 'error', 'default', 'success'] as const)[s] || 'default';
const cycleLabel = (c: number) => ({ 0: 'Lifetime', 1: 'Monthly', 2: 'Bi-Monthly', 3: 'Quarterly', 6: 'Semi-Annual', 12: 'Annual' }[c] || `${c} months`);
const tierLabel = (t: number) => ['Beginner', 'Intermediate', 'Business'][t] || `Tier ${t}`;
const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function SubscriptionPage() {
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [packages, setPackages] = useState<PackageInfo[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/api/subscriptions/current').catch(() => ({ data: null })),
      api.get('/api/subscriptions/packages').catch(() => ({ data: [] })),
      api.get('/api/subscriptions/payments').catch(() => ({ data: { items: [] } })),
    ]).then(([subRes, pkgRes, payRes]) => {
      setSubscription(subRes.data);
      setPackages(Array.isArray(pkgRes.data) ? pkgRes.data : []);
      const payData = payRes.data;
      setPayments(Array.isArray(payData) ? payData : payData?.items || []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <LinearProgress />;

  const daysLeft = subscription?.expiresAt
    ? Math.max(0, Math.ceil((new Date(subscription.expiresAt).getTime() - Date.now()) / 86400000))
    : null;

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 800, mb: 3, color: '#0F172A' }}>Subscription</Typography>

      {subscription ? (
        <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2}>
            <Box>
              <Typography variant="h6" fontWeight={700}>{subscription.packageName}</Typography>
              <Chip label={tierLabel(subscription.tier)} size="small" sx={{ mr: 1, mt: 0.5 }} />
              <Chip label={statusLabel(subscription.status)} size="small" color={statusColor(subscription.status)} sx={{ mt: 0.5 }} />
            </Box>
            <Box textAlign="right">
              <Typography variant="h5" fontWeight={800} color="primary">
                KES {subscription.pricePerCycle.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">{cycleLabel(subscription.billingCycle)}</Typography>
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Box display="flex" gap={4} flexWrap="wrap">
            <Box>
              <Typography variant="caption" color="text.secondary">Started</Typography>
              <Typography fontWeight={600}>{fmtDate(subscription.startDate)}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Current Period</Typography>
              <Typography fontWeight={600}>{fmtDate(subscription.currentPeriodStart)} — {fmtDate(subscription.currentPeriodEnd)}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Expires</Typography>
              <Typography fontWeight={600} color={daysLeft !== null && daysLeft <= 7 ? 'error' : 'text.primary'}>
                {fmtDate(subscription.expiresAt)}
                {daysLeft !== null && <Typography component="span" variant="body2" color="text.secondary"> ({daysLeft} days left)</Typography>}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Last Payment</Typography>
              <Typography fontWeight={600}>{fmtDate(subscription.lastPaymentAt)}</Typography>
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>Features</Typography>
          <Box display="flex" gap={0.5} flexWrap="wrap">
            {subscription.features.map((f) => (
              <Chip key={f} label={f.replace(/_/g, ' ')} size="small" variant="outlined" color="primary" />
            ))}
          </Box>
        </Paper>
      ) : null}

      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Available Packages</Typography>
      <Box display="flex" gap={2} flexWrap="wrap" mb={3}>
        {packages.map((pkg) => (
          <Paper key={pkg.id} sx={{
            p: 2.5, borderRadius: 3, flex: '1 1 280px', minWidth: 280, maxWidth: 380,
            border: subscription?.packageId === pkg.id ? '2px solid #1565C0' : '1px solid #E2E8F0',
          }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="h6" fontWeight={700}>{pkg.name}</Typography>
              <Chip label={tierLabel(pkg.tier)} size="small" />
            </Box>
            <Typography variant="body2" color="text.secondary" mb={1}>{pkg.description}</Typography>
            <Typography variant="h5" fontWeight={800} color="primary" mb={1}>
              KES {pkg.monthlyPrice.toLocaleString()}<Typography component="span" variant="body2" color="text.secondary">/mo</Typography>
            </Typography>
            {pkg.lifetimePrice && (
              <Typography variant="body2" color="text.secondary" mb={1}>
                Lifetime: KES {pkg.lifetimePrice.toLocaleString()}
              </Typography>
            )}
            <Box display="flex" gap={0.5} flexWrap="wrap" mb={1.5}>
              {pkg.features.map((f) => <Chip key={f} label={f.replace(/_/g, ' ')} size="small" variant="outlined" />)}
            </Box>
            <Typography variant="caption" color="text.secondary">
              Up to {pkg.maxBranches} branch{pkg.maxBranches !== 1 ? 'es' : ''}, {pkg.maxUsers} users
            </Typography>
            {subscription?.packageId === pkg.id && (
              <Chip label="Current Plan" color="primary" size="small" sx={{ mt: 1, display: 'block', width: 'fit-content' }} />
            )}
          </Paper>
        ))}
      </Box>

      {payments.length > 0 && (
        <>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Payment History</Typography>
          <DTable
            rows={payments}
            rowKey={(payment) => payment.id}
            columns={[
              { field: 'paidAt', header: 'Date', render: (payment) => fmtDate(payment.paidAt) },
              { field: 'amount', header: 'Amount', render: (payment) => <Typography fontWeight={600}>KES {payment.amount.toLocaleString()}</Typography> },
              { field: 'paymentMethod', header: 'Method' },
              { field: 'transactionReference', header: 'Reference', render: (payment) => <Typography variant="caption" color="text.secondary">{payment.transactionReference || '—'}</Typography> },
              { field: 'periodStart', header: 'Period', render: (payment) => <Typography variant="caption">{fmtDate(payment.periodStart)} — {fmtDate(payment.periodEnd)}</Typography> },
            ]}
            pageSize={10}
            pageSizeOptions={[10, 20, 50]}
            emptyMessage="No payment history"
          />
        </>
      )}
    </Box>
  );
}
