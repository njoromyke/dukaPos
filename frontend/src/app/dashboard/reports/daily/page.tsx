'use client';

import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid2';
import TextField from '@mui/material/TextField';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import dayjs from 'dayjs';
import { useAuthStore } from '@/stores/auth-store';
import { reportsApi } from '@/lib/api';

const formatKES = (n: number) => `KES ${n.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;

interface TopProduct { productName: string; quantitySold: number; revenue: number; }

export default function DailyReportPage() {
  const auth = useAuthStore();
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [summary, setSummary] = useState<{ totalSales: number; totalRevenue: number; averageBasket: number; cashTotal: number; mpesaTotal: number } | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);

  useEffect(() => { auth.hydrate(); }, []);

  useEffect(() => {
    if (!auth.user?.branchId) return;
    reportsApi.dailySummary(auth.user.branchId, date).then((r) => setSummary(r.data)).catch(() => {});
    reportsApi.topProducts(auth.user.branchId, date, date, 10).then((r) => setTopProducts(r.data)).catch(() => {});
  }, [auth.user?.branchId, date]);

  const cashPct = summary && summary.totalRevenue > 0 ? (summary.cashTotal / summary.totalRevenue) * 100 : 0;
  const mpesaPct = summary && summary.totalRevenue > 0 ? (summary.mpesaTotal / summary.totalRevenue) * 100 : 0;

  return (
    <Box>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Typography variant="h5">Daily Report</Typography>
        <TextField type="date" value={date} onChange={(e) => setDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
      </Box>

      {summary && (
        <Grid container spacing={2} mb={3}>
          {[
            { label: 'Total Sales', value: summary.totalSales },
            { label: 'Revenue', value: formatKES(summary.totalRevenue) },
            { label: 'Avg Basket', value: formatKES(summary.averageBasket) },
          ].map((c) => (
            <Grid key={c.label} size={{ xs: 12, sm: 4 }}>
              <Paper sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">{c.label}</Typography>
                <Typography variant="h5" fontWeight={800}>{c.value}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Payment Breakdown</Typography>
            {summary ? (
              <Box>
                <Box mb={2}>
                  <Box display="flex" justifyContent="space-between" mb={0.5}>
                    <Typography variant="body2">Cash</Typography>
                    <Typography variant="body2" fontWeight={700}>{formatKES(summary.cashTotal)}</Typography>
                  </Box>
                  <Box sx={{ height: 8, borderRadius: 4, bgcolor: 'action.hover', overflow: 'hidden' }}>
                    <Box sx={{ height: '100%', width: `${cashPct}%`, bgcolor: 'primary.main', borderRadius: 4 }} />
                  </Box>
                </Box>
                <Box>
                  <Box display="flex" justifyContent="space-between" mb={0.5}>
                    <Typography variant="body2">M-Pesa</Typography>
                    <Typography variant="body2" fontWeight={700}>{formatKES(summary.mpesaTotal)}</Typography>
                  </Box>
                  <Box sx={{ height: 8, borderRadius: 4, bgcolor: 'action.hover', overflow: 'hidden' }}>
                    <Box sx={{ height: '100%', width: `${mpesaPct}%`, bgcolor: 'secondary.main', borderRadius: 4 }} />
                  </Box>
                </Box>
              </Box>
            ) : <Typography color="text.secondary">Loading...</Typography>}
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Top Products</Typography>
            <Table size="small">
              <TableHead><TableRow><TableCell>Product</TableCell><TableCell align="right">Qty</TableCell><TableCell align="right">Revenue</TableCell></TableRow></TableHead>
              <TableBody>
                {topProducts?.map((p, i) => (
                  <TableRow key={i}><TableCell>{p.productName}</TableCell><TableCell align="right">{p.quantitySold}</TableCell><TableCell align="right">{formatKES(p.revenue)}</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
