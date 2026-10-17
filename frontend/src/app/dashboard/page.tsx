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
import { useAuthStore } from '@/stores/auth-store';
import { reportsApi, expensesApi } from '@/lib/api';

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

const formatKES = (n: number) => `KES ${n.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  gradient: string;
  shadow: string;
}

function StatCard({ label, value, icon, gradient, shadow }: StatCardProps) {
  return (
    <Paper sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2.5, border: '1px solid #E2E8F0', boxShadow: 'none' }}>
      <Box sx={{
        width: 52, height: 52, borderRadius: 3, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        background: gradient, color: '#fff', boxShadow: shadow,
      }}>
        {icon}
      </Box>
      <Box>
        <Typography sx={{ color: '#64748B', fontSize: '0.8rem', fontWeight: 500 }}>{label}</Typography>
        <Typography sx={{ fontWeight: 800, color: '#0F172A', fontSize: '1.35rem' }}>{value}</Typography>
      </Box>
    </Paper>
  );
}

export default function DashboardPage() {
  const auth = useAuthStore();
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [expenses, setExpenses] = useState<ExpenseSummary | null>(null);

  useEffect(() => { auth.hydrate(); }, []);

  useEffect(() => {
    if (!auth.user?.branchId) return;
    const today = new Date().toISOString().split('T')[0];
    Promise.all([
      reportsApi.dailySummary(auth.user.branchId),
      expensesApi.summary(auth.user.branchId, today, today),
    ]).then(([sumRes, expRes]) => {
      setSummary(sumRes.data);
      setExpenses(expRes.data);
    }).catch(() => {});
  }, [auth.user?.branchId]);

  const netRevenue = (summary?.totalRevenue ?? 0) - (expenses?.totalAmount ?? 0);

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A' }}>Dashboard</Typography>
        <Typography variant="body2" sx={{ color: '#64748B', mt: 0.5 }}>
          Today&apos;s summary for {auth.user?.fullName || 'your branch'}
        </Typography>
      </Box>

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label="Total Sales"
            value={String(summary?.totalSales ?? 0)}
            icon={<ReceiptIcon />}
            gradient="linear-gradient(135deg, #1565C0, #0D47A1)"
            shadow="0 4px 12px rgba(21,101,192,0.3)"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label="Revenue"
            value={formatKES(summary?.totalRevenue ?? 0)}
            icon={<TrendingUpIcon />}
            gradient="linear-gradient(135deg, #059669, #047857)"
            shadow="0 4px 12px rgba(5,150,105,0.3)"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label="Expenses"
            value={formatKES(expenses?.totalAmount ?? 0)}
            icon={<TrendingDownIcon />}
            gradient="linear-gradient(135deg, #D97706, #B45309)"
            shadow="0 4px 12px rgba(217,119,6,0.3)"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label="Net Revenue"
            value={formatKES(netRevenue)}
            icon={<PaymentsIcon />}
            gradient={netRevenue >= 0
              ? 'linear-gradient(135deg, #059669, #047857)'
              : 'linear-gradient(135deg, #DC2626, #B91C1C)'}
            shadow={netRevenue >= 0
              ? '0 4px 12px rgba(5,150,105,0.3)'
              : '0 4px 12px rgba(220,38,38,0.3)'}
          />
        </Grid>
      </Grid>

      <Grid container spacing={2.5} sx={{ mt: 0.5 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3, height: '100%', border: '1px solid #E2E8F0', boxShadow: 'none' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0F172A', mb: 2.5 }}>
              Payment Breakdown
            </Typography>
            {summary ? (
              <Box display="flex" gap={4}>
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ color: '#64748B', fontSize: '0.8rem', mb: 0.5 }}>Cash</Typography>
                  <Typography sx={{ fontWeight: 800, color: '#0F172A', fontSize: '1.25rem' }}>
                    {formatKES(summary.cashTotal)}
                  </Typography>
                  <Box sx={{ width: '100%', height: 4, borderRadius: 2, bgcolor: '#E2E8F0', mt: 1.5 }}>
                    <Box sx={{
                      height: 4, borderRadius: 2,
                      background: 'linear-gradient(90deg, #1565C0, #42A5F5)',
                      width: summary.totalRevenue ? `${(summary.cashTotal / summary.totalRevenue * 100)}%` : '0%',
                    }} />
                  </Box>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ color: '#64748B', fontSize: '0.8rem', mb: 0.5 }}>M-Pesa</Typography>
                  <Typography sx={{ fontWeight: 800, color: '#0F172A', fontSize: '1.25rem' }}>
                    {formatKES(summary.mpesaTotal)}
                  </Typography>
                  <Box sx={{ width: '100%', height: 4, borderRadius: 2, bgcolor: '#E2E8F0', mt: 1.5 }}>
                    <Box sx={{
                      height: 4, borderRadius: 2,
                      background: 'linear-gradient(90deg, #059669, #34D399)',
                      width: summary.totalRevenue ? `${(summary.mpesaTotal / summary.totalRevenue * 100)}%` : '0%',
                    }} />
                  </Box>
                </Box>
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">Loading...</Typography>
            )}
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3, height: '100%', border: '1px solid #E2E8F0', boxShadow: 'none' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0F172A', mb: 2.5 }}>
              Expenses Breakdown
            </Typography>
            {expenses && expenses.count > 0 ? (
              <Box>
                <Box display="flex" justifyContent="space-between" alignItems="baseline" mb={2}>
                  <Typography sx={{ color: '#64748B', fontSize: '0.85rem' }}>
                    {expenses.count} transaction{expenses.count !== 1 ? 's' : ''} today
                  </Typography>
                  <Typography sx={{ fontWeight: 800, color: '#D97706', fontSize: '1.25rem' }}>
                    {formatKES(expenses.totalAmount)}
                  </Typography>
                </Box>
                <Box display="flex" flexWrap="wrap" gap={1}>
                  {expenses.byCategory.map((cat) => (
                    <Chip
                      key={cat.category}
                      label={`${cat.category}: ${formatKES(cat.total)}`}
                      size="small"
                      sx={{ bgcolor: '#FFF7ED', color: '#B45309', fontWeight: 600, border: '1px solid #FED7AA' }}
                    />
                  ))}
                </Box>
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center', py: 3 }}>
                <Typography variant="body2" sx={{ color: '#94A3B8' }}>No expenses recorded today</Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
