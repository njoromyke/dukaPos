'use client';

import { useEffect, useState, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TablePagination from '@mui/material/TablePagination';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import dayjs from 'dayjs';
import { useAuthStore } from '@/stores/auth-store';
import { salesApi } from '@/lib/api';

interface SaleRecord {
  id: string; saleNumber: string; status: string; cashierName: string;
  grandTotal: number; lineItems: { productName: string; quantity: number; unitPrice: number; lineTotal: number }[];
  completedAt?: string; startedAt: string;
}

const formatKES = (n: number) => `KES ${n.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;
const statusColor: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  Completed: 'success', Active: 'warning', Parked: 'default', Voided: 'error', AwaitingPayment: 'warning',
};

export default function SalesHistoryPage() {
  const auth = useAuthStore();
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [from, setFrom] = useState(dayjs().format('YYYY-MM-DD'));
  const [to, setTo] = useState(dayjs().format('YYYY-MM-DD'));
  const [detail, setDetail] = useState<SaleRecord | null>(null);

  useEffect(() => { auth.hydrate(); }, []);

  const load = useCallback(async () => {
    if (!auth.user?.branchId) return;
    try {
      const res = await salesApi.getHistory(auth.user.branchId, from, to, page + 1, 20);
      setSales(res.data.sales || res.data);
      setTotal(res.data.totalCount || (res.data.sales || res.data).length);
    } catch { /* */ }
  }, [auth.user?.branchId, from, to, page]);

  useEffect(() => { load(); }, [load]);

  return (
    <Box>
      <Typography variant="h5" mb={3}>Sales History</Typography>
      <Paper sx={{ p: 2, mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <TextField label="From" type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(0); }} slotProps={{ inputLabel: { shrink: true } }} />
        <TextField label="To" type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(0); }} slotProps={{ inputLabel: { shrink: true } }} />
      </Paper>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Sale #</TableCell>
              <TableCell>Cashier</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Total</TableCell>
              <TableCell>Date</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sales.map((s) => (
              <TableRow key={s.id} hover sx={{ cursor: 'pointer' }} onClick={() => setDetail(s)}>
                <TableCell><Typography variant="body2" fontWeight={600}>{s.saleNumber}</Typography></TableCell>
                <TableCell>{s.cashierName}</TableCell>
                <TableCell><Chip label={s.status} size="small" color={statusColor[s.status] || 'default'} variant="outlined" /></TableCell>
                <TableCell align="right">{formatKES(s.grandTotal)}</TableCell>
                <TableCell>{dayjs(s.completedAt || s.startedAt).format('DD/MM/YYYY HH:mm')}</TableCell>
              </TableRow>
            ))}
            {sales.length === 0 && (
              <TableRow><TableCell colSpan={5} align="center"><Typography color="text.secondary" py={4}>No sales found</Typography></TableCell></TableRow>
            )}
          </TableBody>
        </Table>
        <TablePagination component="div" count={total} page={page} rowsPerPage={20} rowsPerPageOptions={[20]} onPageChange={(_, p) => setPage(p)} />
      </TableContainer>

      <Dialog open={!!detail} onClose={() => setDetail(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Sale {detail?.saleNumber}</DialogTitle>
        <DialogContent>
          {detail && (
            <Box>
              <Typography variant="body2" color="text.secondary" mb={2}>
                {detail.cashierName} &middot; {dayjs(detail.completedAt || detail.startedAt).format('DD/MM/YYYY HH:mm')} &middot; {detail.status}
              </Typography>
              <Table size="small">
                <TableHead><TableRow><TableCell>Item</TableCell><TableCell align="right">Qty</TableCell><TableCell align="right">Price</TableCell><TableCell align="right">Total</TableCell></TableRow></TableHead>
                <TableBody>
                  {detail.lineItems.map((li, i) => (
                    <TableRow key={i}>
                      <TableCell>{li.productName}</TableCell>
                      <TableCell align="right">{li.quantity}</TableCell>
                      <TableCell align="right">{formatKES(li.unitPrice)}</TableCell>
                      <TableCell align="right">{formatKES(li.lineTotal)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Typography variant="h6" fontWeight={800} textAlign="right" mt={2}>{formatKES(detail.grandTotal)}</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setDetail(null)}>Close</Button></DialogActions>
      </Dialog>
    </Box>
  );
}
