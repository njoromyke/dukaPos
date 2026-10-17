'use client';

import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ReceiptIcon from '@mui/icons-material/ReceiptLongOutlined';
import ShoppingBasketIcon from '@mui/icons-material/ShoppingBasketOutlined';
import PaymentsIcon from '@mui/icons-material/PaymentsOutlined';
import { useAuthStore } from '@/stores/auth-store';
import { reportsApi } from '@/lib/api';

interface DailySummary {
  totalSales: number;
  totalRevenue: number;
  averageBasket: number;
  topPaymentMethod: string;
  cashTotal: number;
  mpesaTotal: number;
}

const formatKES = (n: number) => `KES ${n.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;

export default function DashboardPage() {
  const auth = useAuthStore();
  const [summary, setSummary] = useState<DailySummary | null>(null);

  useEffect(() => { auth.hydrate(); }, []);

  useEffect(() => {
    if (!auth.user?.branchId) return;
    reportsApi.dailySummary(auth.user.branchId).then((res) => setSummary(res.data)).catch(() => {});
  }, [auth.user?.branchId]);

  const cards = [
    { label: 'Total Sales', value: summary?.totalSales ?? 0, format: (v: number) => String(v), icon: <ReceiptIcon />, color: '#1565C0' },
    { label: 'Revenue', value: summary?.totalRevenue ?? 0, format: formatKES, icon: <TrendingUpIcon />, color: '#2E7D32' },
    { label: 'Avg Basket', value: summary?.averageBasket ?? 0, format: formatKES, icon: <ShoppingBasketIcon />, color: '#E65100' },
    { label: 'Top Payment', value: summary?.topPaymentMethod ?? '—', format: (v: string) => v, icon: <PaymentsIcon />, color: '#6A1B9A' },
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

      <Paper sx={{ mt: 3, p: 3 }}>
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
    </Box>
  );
}
