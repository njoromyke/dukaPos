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
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import TablePagination from '@mui/material/TablePagination';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/EditOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useAuthStore } from '@/stores/auth-store';
import { inventoryApi } from '@/lib/api';
import { useSnackbar } from 'notistack';

interface Product {
  id: string; name: string; sku: string; barcode?: string; categoryName: string;
  unit: string; sellingPrice: number; costPrice: number; vatRate: number;
  isWeighed: boolean; stockQuantity: number; categoryId: string;
}
interface Category { id: string; name: string; }

const formatKES = (n: number) => `KES ${n.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;

export default function ProductsPage() {
  const auth = useAuthStore();
  const { enqueueSnackbar } = useSnackbar();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState({ name: '', sku: '', barcode: '', categoryId: '', unit: 'piece', sellingPrice: '', costPrice: '', vatRate: '16', isWeighed: false, imageUrl: '' });

  useEffect(() => { auth.hydrate(); }, []);

  const loadProducts = useCallback(async () => {
    if (!auth.user?.branchId) return;
    try {
      const res = await inventoryApi.getProducts(auth.user.branchId, { search: search || undefined, categoryId: catFilter || undefined, page: page + 1, pageSize: 20 });
      const d = res.data;
      const items = Array.isArray(d) ? d : Array.isArray(d?.products) ? d.products : [];
      setProducts(items);
      setTotal(d?.totalCount ?? items.length);
    } catch { /* */ }
  }, [auth.user?.branchId, search, catFilter, page]);

  useEffect(() => { loadProducts(); }, [loadProducts]);
  useEffect(() => {
    inventoryApi.getCategories().then((r) => setCategories(r.data)).catch(() => {});
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', sku: '', barcode: '', categoryId: '', unit: 'piece', sellingPrice: '', costPrice: '', vatRate: '16', isWeighed: false, imageUrl: '' });
    setDialogOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({ name: p.name, sku: p.sku, barcode: p.barcode || '', categoryId: p.categoryId, unit: p.unit, sellingPrice: String(p.sellingPrice), costPrice: String(p.costPrice), vatRate: String(p.vatRate), isWeighed: p.isWeighed, imageUrl: '' });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const payload = { ...form, sellingPrice: parseFloat(form.sellingPrice), costPrice: parseFloat(form.costPrice), vatRate: parseInt(form.vatRate) };
    try {
      if (editing) { await inventoryApi.updateProduct({ id: editing.id, ...payload }); }
      else { await inventoryApi.createProduct(payload); }
      enqueueSnackbar(editing ? 'Product updated' : 'Product created', { variant: 'success' });
      setDialogOpen(false);
      loadProducts();
    } catch { enqueueSnackbar('Failed to save product', { variant: 'error' }); }
  };

  return (
    <Box>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Typography variant="h5">Products</Typography>
        <Box display="flex" gap={1}>
          <IconButton onClick={loadProducts} title="Refresh"><RefreshIcon /></IconButton>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>Add product</Button>
        </Box>
      </Box>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Box display="flex" gap={2} flexWrap="wrap">
          <TextField placeholder="Search products..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
            sx={{ minWidth: 260 }}
          />
          <TextField select label="Category" value={catFilter} onChange={(e) => { setCatFilter(e.target.value); setPage(0); }} sx={{ minWidth: 180 }}>
            <MenuItem value="">All categories</MenuItem>
            {categories.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
          </TextField>
        </Box>
      </Paper>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>SKU</TableCell>
              <TableCell>Category</TableCell>
              <TableCell align="right">Price</TableCell>
              <TableCell align="right">Cost</TableCell>
              <TableCell align="right">Stock</TableCell>
              <TableCell>VAT</TableCell>
              <TableCell width={50} />
            </TableRow>
          </TableHead>
          <TableBody>
            {products?.map((p) => (
              <TableRow key={p.id} hover>
                <TableCell><Typography variant="body2" fontWeight={600}>{p.name}</Typography></TableCell>
                <TableCell>{p.sku}</TableCell>
                <TableCell>{p.categoryName}</TableCell>
                <TableCell align="right">{formatKES(p.sellingPrice)}</TableCell>
                <TableCell align="right">{formatKES(p.costPrice)}</TableCell>
                <TableCell align="right">
                  <Chip label={`${p.stockQuantity} ${p.unit}`} size="small"
                    color={p.stockQuantity <= 0 ? 'error' : p.stockQuantity < 10 ? 'warning' : 'default'} variant="outlined" />
                </TableCell>
                <TableCell>{p.vatRate}%</TableCell>
                <TableCell><IconButton size="small" onClick={() => openEdit(p)}><EditIcon fontSize="small" /></IconButton></TableCell>
              </TableRow>
            ))}
            {products.length === 0 && (
              <TableRow><TableCell colSpan={8} align="center"><Typography color="text.secondary" py={4}>No products found</Typography></TableCell></TableRow>
            )}
          </TableBody>
        </Table>
        <TablePagination component="div" count={total} page={page} rowsPerPage={20} rowsPerPageOptions={[20]}
          onPageChange={(_, p) => setPage(p)} />
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Edit Product' : 'New Product'}</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <TextField label="SKU" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} required disabled={!!editing} />
            <TextField label="Barcode" value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
            <TextField select label="Category" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} required>
              {categories.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
            </TextField>
            <Box display="flex" gap={2}>
              <TextField label="Selling Price" type="number" value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })} required sx={{ flex: 1 }} />
              <TextField label="Cost Price" type="number" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} required sx={{ flex: 1 }} />
            </Box>
            <Box display="flex" gap={2}>
              <TextField select label="Unit" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} sx={{ flex: 1 }}>
                {['piece', 'kg', 'litre', 'pack', 'dozen'].map((u) => <MenuItem key={u} value={u}>{u}</MenuItem>)}
              </TextField>
              <TextField select label="VAT Rate" value={form.vatRate} onChange={(e) => setForm({ ...form, vatRate: e.target.value })} sx={{ flex: 1 }}>
                <MenuItem value="16">16% (Standard)</MenuItem>
                <MenuItem value="0">Exempt</MenuItem>
              </TextField>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
