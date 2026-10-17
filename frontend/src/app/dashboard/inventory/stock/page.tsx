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
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import { useAuthStore } from '@/stores/auth-store';
import { inventoryApi } from '@/lib/api';
import { useSnackbar } from 'notistack';

interface Product { id: string; name: string; sku: string; unit: string; stockQuantity: number; }

export default function StockPage() {
  const auth = useAuthStore();
  const { enqueueSnackbar } = useSnackbar();
  const [products, setProducts] = useState<Product[]>([]);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [selected, setSelected] = useState<Product | null>(null);
  const [qty, setQty] = useState('');
  const [reason, setReason] = useState('Adjustment');
  const [notes, setNotes] = useState('');

  useEffect(() => { auth.hydrate(); }, []);

  const load = useCallback(async () => {
    if (!auth.user?.branchId) return;
    try { const r = await inventoryApi.getProducts(auth.user.branchId, { pageSize: 200 }); setProducts(Array.isArray(r.data) ? r.data : r.data.items || r.data); }
    catch { /* */ }
  }, [auth.user?.branchId]);

  useEffect(() => { load(); }, [load]);

  const openAdjust = (p: Product) => { setSelected(p); setQty(''); setReason('Adjustment'); setNotes(''); setAdjustOpen(true); };

  const handleAdjust = async () => {
    if (!selected || !auth.user) return;
    try {
      await inventoryApi.adjustStock({ productId: selected.id, branchId: auth.user.branchId, quantityChange: parseFloat(qty), reason, notes: notes || undefined, adjustedBy: auth.user.id });
      enqueueSnackbar('Stock adjusted', { variant: 'success' });
      setAdjustOpen(false);
      load();
    } catch { enqueueSnackbar('Adjustment failed', { variant: 'error' }); }
  };

  return (
    <Box>
      <Typography variant="h5" mb={3}>Stock Levels</Typography>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Product</TableCell>
              <TableCell>SKU</TableCell>
              <TableCell align="right">Quantity</TableCell>
              <TableCell>Unit</TableCell>
              <TableCell>Status</TableCell>
              <TableCell width={100} />
            </TableRow>
          </TableHead>
          <TableBody>
            {products.map((p) => (
              <TableRow key={p.id} hover sx={p.stockQuantity <= 0 ? { bgcolor: 'error.50' } : p.stockQuantity < 10 ? { bgcolor: 'warning.50' } : undefined}>
                <TableCell><Typography variant="body2" fontWeight={600}>{p.name}</Typography></TableCell>
                <TableCell>{p.sku}</TableCell>
                <TableCell align="right"><Typography fontWeight={700}>{p.stockQuantity}</Typography></TableCell>
                <TableCell>{p.unit}</TableCell>
                <TableCell>
                  <Chip size="small" variant="outlined"
                    label={p.stockQuantity <= 0 ? 'Out of stock' : p.stockQuantity < 10 ? 'Low' : 'OK'}
                    color={p.stockQuantity <= 0 ? 'error' : p.stockQuantity < 10 ? 'warning' : 'success'} />
                </TableCell>
                <TableCell><Button size="small" onClick={() => openAdjust(p)}>Adjust</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={adjustOpen} onClose={() => setAdjustOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Adjust Stock — {selected?.name}</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <Typography variant="body2" color="text.secondary">Current: {selected?.stockQuantity} {selected?.unit}</Typography>
            <TextField label="Quantity change" type="number" value={qty} onChange={(e) => setQty(e.target.value)} helperText="Positive to add, negative to subtract" />
            <TextField select label="Reason" value={reason} onChange={(e) => setReason(e.target.value)}>
              {['Adjustment', 'Damaged', 'Expired', 'PurchaseReceived', 'Transfer'].map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
            </TextField>
            <TextField label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} multiline rows={2} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setAdjustOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAdjust} disabled={!qty}>Apply</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
