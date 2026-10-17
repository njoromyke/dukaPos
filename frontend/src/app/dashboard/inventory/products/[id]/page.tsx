'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { inventoryApi } from '@/lib/api';
import { useSnackbar } from 'notistack';

interface Category { id: string; name: string; }

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState({ id: '', name: '', sku: '', barcode: '', categoryId: '', unit: 'piece', sellingPrice: '', costPrice: '', vatRate: '16', isWeighed: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    inventoryApi.getCategories().then((r) => setCategories(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!id) return;
    import('@/lib/api').then(({ default: api }) => {
      api.get(`/api/inventory/products/${id}`).then((res) => {
        const p = res.data;
        setForm({ id: p.id, name: p.name, sku: p.sku, barcode: p.barcode || '', categoryId: p.categoryId, unit: p.unit, sellingPrice: String(p.sellingPrice), costPrice: String(p.costPrice), vatRate: String(p.vatRate), isWeighed: p.isWeighed });
      }).catch(() => enqueueSnackbar('Product not found', { variant: 'error' }))
        .finally(() => setLoading(false));
    });
  }, [id, enqueueSnackbar]);

  const handleSave = async () => {
    try {
      await inventoryApi.updateProduct({ ...form, sellingPrice: parseFloat(form.sellingPrice), costPrice: parseFloat(form.costPrice), vatRate: parseInt(form.vatRate) });
      enqueueSnackbar('Product updated', { variant: 'success' });
      router.push('/dashboard/inventory/products');
    } catch { enqueueSnackbar('Save failed', { variant: 'error' }); }
  };

  if (loading) return <Typography>Loading...</Typography>;

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={() => router.back()} sx={{ mb: 2 }}>Back</Button>
      <Typography variant="h5" gutterBottom>Edit Product</Typography>
      <Paper sx={{ p: 3, maxWidth: 600 }}>
        <Box display="flex" flexDirection="column" gap={2}>
          <TextField label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <TextField label="SKU" value={form.sku} disabled />
          <TextField label="Barcode" value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
          <TextField select label="Category" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
            {categories.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
          </TextField>
          <Box display="flex" gap={2}>
            <TextField label="Selling Price" type="number" value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })} sx={{ flex: 1 }} />
            <TextField label="Cost Price" type="number" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} sx={{ flex: 1 }} />
          </Box>
          <Box display="flex" gap={2}>
            <TextField select label="Unit" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} sx={{ flex: 1 }}>
              {['piece', 'kg', 'litre', 'pack', 'dozen'].map((u) => <MenuItem key={u} value={u}>{u}</MenuItem>)}
            </TextField>
            <TextField select label="VAT" value={form.vatRate} onChange={(e) => setForm({ ...form, vatRate: e.target.value })} sx={{ flex: 1 }}>
              <MenuItem value="16">16%</MenuItem><MenuItem value="0">Exempt</MenuItem>
            </TextField>
          </Box>
          <Button variant="contained" onClick={handleSave} sx={{ mt: 1, alignSelf: 'flex-start' }}>Save changes</Button>
        </Box>
      </Paper>
    </Box>
  );
}
