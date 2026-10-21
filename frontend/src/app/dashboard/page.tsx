'use client';

import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid2';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import ReceiptIcon from '@mui/icons-material/ReceiptLongOutlined';
import PaymentsIcon from '@mui/icons-material/PaymentsOutlined';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroidOutlined';
import { useAuthStore } from '@/stores/auth-store';
import { reportsApi, expensesApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { DStatCard, DPageHeader } from '@/components';
import dayjs from 'dayjs';

interface DailySummary {
  totalSales: number;
  totalRevenue: number;
  averageBasket: number;
  topPaymentMethod: string;
  cashTotal: number;
  mpesaTotal: number;
}

interface ExpenseSummary {
  totalAmount: number;
  count: number;
  byCategory: { category: string; total: number; count: number }[];
}

export default function DashboardPage() {
  const auth = useAuthStore();
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [expenses, setExpenses] = useState<ExpenseSummary | null>(null);

  useEffect(() => {
    if (!auth.user?.branchId) return;
    const today = dayjs().format('YYYY-MM-DD');
    Promise.all([
      reportsApi.dailySummary(auth.user.branchId),
      expensesApi.summary(auth.user.branchId, today, today),
    ]).then(([sumRes, expRes]) => {
      setSummary(sumRes.data);
      setExpenses(expRes.data);
    }).catch(() => {});
  }, [auth.user?.branchId]);

  const netRevenue = (summary?.totalRevenue ?? 0) - (expenses?.totalAmount ?? 0);
  const cashPct = summary?.totalRevenue ? (summary.cashTotal / summary.totalRevenue * 100) : 0;
  const mpesaPct = summary?.totalRevenue ? (summary.mpesaTotal / summary.totalRevenue * 100) : 0;

  return (
    <Box>
      <DPageHeader
        title="Dashboard"
        subtitle={`Today's performance overview • ${dayjs().format('dddd, DD MMM YYYY')}`}
      />

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <DStatCard label="Total Sales" value={String(summary?.totalSales ?? 0)} icon={<ReceiptIcon />} color="#0284C7" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <DStatCard label="Revenue" value={formatCurrency(summary?.totalRevenue ?? 0)} icon={<TrendingUpIcon />} color="#059669" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <DStatCard label="Expenses" value={formatCurrency(expenses?.totalAmount ?? 0)} icon={<TrendingDownIcon />} color="#D97706" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <DStatCard label="Net Revenue" value={formatCurrency(netRevenue)} icon={<PaymentsIcon />} color={netRevenue >= 0 ? '#059669' : '#DC2626'} />
        </Grid>
      </Grid>

      <Grid container spacing={2.5} sx={{ mt: 0.5 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3, height: '100%', border: '1px solid', borderColor: 'divider', overflow: 'hidden', position: 'relative' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
              <Typography sx={{ fontWeight: 700, fontSize: '0.9375rem', color: 'text.primary' }}>
                Payment Breakdown
              </Typography>
              {summary && (
                <Chip
                  label={`Top: ${summary.topPaymentMethod || 'N/A'}`}
                  size="small"
                  sx={{ bgcolor: '#ECFDF5', color: '#047857', fontWeight: 600, fontSize: '0.7rem' }}
                />
              )}
            </Box>
            {summary ? (
              <Box>
                {/* Multi-segment bar */}
                <Box sx={{
                  display: 'flex', width: '100%', height: 10, borderRadius: 5,
                  overflow: 'hidden', bgcolor: '#F1F5F9', mb: 3,
                }}>
                  <Box sx={{
                    width: `${cashPct}%`,
                    background: 'linear-gradient(90deg, #0284C7, #38BDF8)',
                    transition: 'width 0.5s ease',
                  }} />
                  <Box sx={{
                    width: `${mpesaPct}%`,
                    background: 'linear-gradient(90deg, #059669, #34D399)',
                    transition: 'width 0.5s ease',
                  }} />
                </Box>

                <Box display="flex" gap={3}>
                  <Box sx={{ flex: 1, p: 2, borderRadius: 2.5, bgcolor: '#F0F9FF', border: '1px solid #BAE6FD' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <AccountBalanceWalletIcon sx={{ fontSize: 18, color: '#0284C7' }} />
                      <Typography sx={{ color: '#0369A1', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Cash</Typography>
                    </Box>
                    <Typography sx={{ fontWeight: 800, color: '#0F172A', fontSize: '1.25rem' }}>
                      {formatCurrency(summary.cashTotal)}
                    </Typography>
                    <Typography sx={{ fontSize: '0.7rem', color: '#64748B', mt: 0.5 }}>
                      {cashPct.toFixed(0)}% of total
                    </Typography>
                  </Box>
                  <Box sx={{ flex: 1, p: 2, borderRadius: 2.5, bgcolor: '#ECFDF5', border: '1px solid #A7F3D0' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <PhoneAndroidIcon sx={{ fontSize: 18, color: '#059669' }} />
                      <Typography sx={{ color: '#047857', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>M-Pesa</Typography>
                    </Box>
                    <Typography sx={{ fontWeight: 800, color: '#0F172A', fontSize: '1.25rem' }}>
                      {formatCurrency(summary.mpesaTotal)}
                    </Typography>
                    <Typography sx={{ fontSize: '0.7rem', color: '#64748B', mt: 0.5 }}>
                      {mpesaPct.toFixed(0)}% of total
                    </Typography>
                  </Box>
                </Box>
              </Box>
            ) : (
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">Loading payment data...</Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3, height: '100%', border: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
              <Typography sx={{ fontWeight: 700, fontSize: '0.9375rem', color: 'text.primary' }}>
                Expenses Breakdown
              </Typography>
              {expenses && expenses.count > 0 && (
                <Chip
                  label={`${expenses.count} transaction${expenses.count !== 1 ? 's' : ''}`}
                  size="small"
                  sx={{ bgcolor: '#FFF7ED', color: '#B45309', fontWeight: 600, fontSize: '0.7rem' }}
                />
              )}
            </Box>
            {expenses && expenses.count > 0 ? (
              <Box>
                <Box sx={{
                  p: 2, borderRadius: 2.5, mb: 2.5,
                  bgcolor: '#FFFBEB', border: '1px solid #FDE68A',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <Typography sx={{ color: '#92400E', fontSize: '0.8125rem', fontWeight: 500 }}>Total expenses today</Typography>
                  <Typography sx={{ fontWeight: 800, color: '#D97706', fontSize: '1.25rem' }}>
                    {formatCurrency(expenses.totalAmount)}
                  </Typography>
                </Box>
                <Box display="flex" flexWrap="wrap" gap={1}>
                  {expenses.byCategory.map((cat) => (
                    <Chip
                      key={cat.category}
                      label={`${cat.category}: ${formatCurrency(cat.total)}`}
                      size="small"
                      sx={{
                        bgcolor: '#FFF7ED', color: '#B45309', fontWeight: 600,
                        border: '1px solid #FED7AA', fontSize: '0.75rem',
                      }}
                    />
                  ))}
                </Box>
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Box sx={{
                  width: 48, height: 48, borderRadius: '50%',
                  bgcolor: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  mx: 'auto', mb: 1.5,
                }}>
                  <TrendingDownIcon sx={{ color: '#94A3B8' }} />
                </Box>
                <Typography sx={{ color: '#94A3B8', fontSize: '0.8125rem' }}>No expenses recorded today</Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
