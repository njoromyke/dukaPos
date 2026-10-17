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
import ShoppingBasketIcon from '@mui/icons-material/ShoppingBasketOutlined';
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

  const cards = [
    { label: 'Total Sales', value: summary?.totalSales ?? 0, format: (v: number) => String(v), icon: <ReceiptIcon />, color: '#1565C0' },
    { label: 'Revenue', value: summary?.totalRevenue ?? 0, format: formatKES, icon: <TrendingUpIcon />, color: '#2E7D32' },
    { label: 'Expenses', value: expenses?.totalAmount ?? 0, format: formatKES, icon: <TrendingDownIcon />, color: '#E65100' },
    { label: 'Net Revenue', value: netRevenue, format: formatKES, icon: <PaymentsIcon />, color: netRevenue >= 0 ? '#2E7D32' : '#C62828' },
  ];

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Dashboard</Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Today&apos;s summary for {auth.user?.name || 'your branch'}
      </Typography>

      <Grid container spacing={2}>
        {cards.map((card) => (
          <Grid key={card.label} size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: card.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', color: card.color }}>
                {card.icon}
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">{card.label}</Typography>
                <Typography variant="h6" fontWeight={800}>{(card.format as (v: never) => string)(card.value as never)}</Typography>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>Payment Breakdown</Typography>
            {summary ? (
              <Box display="flex" gap={4} alignItems="center">
                <Box>
                  <Typography variant="body2" color="text.secondary">Cash</Typography>
                  <Typography variant="h6" fontWeight={700}>{formatKES(summary.cashTotal)}</Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">M-Pesa</Typography>
                  <Typography variant="h6" fontWeight={700} color="secondary">{formatKES(summary.mpesaTotal)}</Typography>
                </Box>
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">Loading...</Typography>
            )}
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>Expenses Breakdown</Typography>
            {expenses && expenses.count > 0 ? (
              <Box>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2" color="text.secondary">
                    {expenses.count} transaction{expenses.count !== 1 ? 's' : ''}
                  </Typography>
                  <Typography variant="h6" fontWeight={700} sx={{ color: '#E65100' }}>
                    {formatKES(expenses.totalAmount)}
                  </Typography>
                </Box>
                <Box display="flex" flexWrap="wrap" gap={1} mt={2}>
                  {expenses.byCategory.map((cat) => (
                    <Chip
                      key={cat.category}
                      label={`${cat.category}: ${formatKES(cat.total)}`}
                      size="small"
                      sx={{ bgcolor: '#FFF3E0', fontWeight: 600 }}
                    />
                  ))}
                </Box>
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">No expenses today</Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
