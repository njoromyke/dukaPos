'use client';

import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import IconButton from '@mui/material/IconButton';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/EditOutlined';
import { inventoryApi } from '@/lib/api';
import api from '@/lib/api';
import { useSnackbar } from 'notistack';

interface Category { id: string; name: string; sortOrder: number; isActive: boolean; }

export default function CategoriesPage() {
  const { enqueueSnackbar } = useSnackbar();
  const [categories, setCategories] = useState<Category[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [sortOrder, setSortOrder] = useState(0);

  const load = () => { inventoryApi.getCategories().then((r) => setCategories(r.data)).catch(() => {}); };
  useEffect(load, []);

  const openCreate = () => { setEditing(null); setName(''); setSortOrder(0); setDialogOpen(true); };
  const openEdit = (c: Category) => { setEditing(c); setName(c.name); setSortOrder(c.sortOrder); setDialogOpen(true); };

  const handleSave = async () => {
    try {
      if (editing) { await api.put('/api/inventory/categories', { id: editing.id, name, sortOrder }); }
      else { await api.post('/api/inventory/categories', { name, sortOrder }); }
      enqueueSnackbar(editing ? 'Updated' : 'Created', { variant: 'success' });
      setDialogOpen(false);
      load();
    } catch { enqueueSnackbar('Failed to save', { variant: 'error' }); }
  };

  return (
    <Box>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Typography variant="h5">Categories</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>Add category</Button>
      </Box>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell align="right">Sort Order</TableCell>
              <TableCell width={50} />
            </TableRow>
          </TableHead>
          <TableBody>
            {categories.map((c) => (
              <TableRow key={c.id} hover>
                <TableCell><Typography variant="body2" fontWeight={600}>{c.name}</Typography></TableCell>
                <TableCell align="right">{c.sortOrder}</TableCell>
                <TableCell><IconButton size="small" onClick={() => openEdit(c)}><EditIcon fontSize="small" /></IconButton></TableCell>
              </TableRow>
            ))}
            {categories.length === 0 && (
              <TableRow><TableCell colSpan={3} align="center"><Typography color="text.secondary" py={4}>No categories</Typography></TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{editing ? 'Edit Category' : 'New Category'}</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
            <TextField label="Sort Order" type="number" value={sortOrder} onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)} />
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
