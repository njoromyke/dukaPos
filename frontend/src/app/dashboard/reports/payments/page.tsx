'use client';

import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import dayjs from 'dayjs';
import { useAuthStore } from '@/stores/auth-store';
import IconButton from '@mui/material/IconButton';
import RefreshIcon from '@mui/icons-material/Refresh';
import { reportsApi } from '@/lib/api';

const formatKES = (n: number) => `KES ${n.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;

interface Breakdown { method: string; count: number; total: number; }

export default function PaymentsReportPage() {
  const auth = useAuthStore();
  const [from, setFrom] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
  const [to, setTo] = useState(dayjs().format('YYYY-MM-DD'));
  const [data, setData] = useState<Breakdown[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => { auth.hydrate(); }, []);

  useEffect(() => {
    if (!auth.user?.branchId) return;
    reportsApi.paymentBreakdown(auth.user.branchId, from, to).then((r) => setData(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  }, [auth.user?.branchId, from, to, refreshKey]);

  const grandTotal = data.reduce((s, d) => s + d.total, 0);

  return (
    <Box>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Typography variant="h5">Payment Report</Typography>
        <IconButton onClick={() => setRefreshKey((k) => k + 1)} title="Refresh"><RefreshIcon /></IconButton>
      </Box>
      <Paper sx={{ p: 2, mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <TextField label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
        <TextField label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead><TableRow><TableCell>Method</TableCell><TableCell align="right">Transactions</TableCell><TableCell align="right">Total</TableCell><TableCell align="right">Share</TableCell></TableRow></TableHead>
          <TableBody>
            {data.map((d) => (
              <TableRow key={d.method}>
                <TableCell><Typography fontWeight={600}>{d.method}</Typography></TableCell>
                <TableCell align="right">{d.count}</TableCell>
                <TableCell align="right">{formatKES(d.total)}</TableCell>
                <TableCell align="right">{grandTotal > 0 ? `${((d.total / grandTotal) * 100).toFixed(1)}%` : '—'}</TableCell>
              </TableRow>
            ))}
            {data.length > 0 && (
              <TableRow>
                <TableCell><Typography fontWeight={800}>Total</Typography></TableCell>
                <TableCell align="right"><Typography fontWeight={700}>{data.reduce((s, d) => s + d.count, 0)}</Typography></TableCell>
                <TableCell align="right"><Typography fontWeight={800}>{formatKES(grandTotal)}</Typography></TableCell>
                <TableCell />
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
