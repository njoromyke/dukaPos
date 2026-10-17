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
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useAuthStore } from '@/stores/auth-store';
import { expensesApi } from '@/lib/api';

const CATEGORIES = [
  'Rent', 'Utilities', 'Salaries', 'Supplies', 'Transport',
  'Maintenance', 'Marketing', 'Taxes', 'Other',
] as const;

const CATEGORY_COLORS: Record<string, string> = {
  Rent: '#1565C0',
  Utilities: '#F57C00',
  Salaries: '#2E7D32',
  Supplies: '#7B1FA2',
  Transport: '#C62828',
  Maintenance: '#00838F',
  Marketing: '#AD1457',
  Taxes: '#4E342E',
  Other: '#546E7A',
};

interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  recordedByName: string;
  expenseDate: string;
  createdAt: string;
}

interface ExpenseSummary {
  totalAmount: number;
  count: number;
  byCategory: { category: string; total: number; count: number }[];
}

const formatKES = (n: number) => `KES ${n.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;

export default function ExpensesPage() {
  const auth = useAuthStore();
  const branchId = auth.user?.branchId || '';

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [snack, setSnack] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);

  const [form, setForm] = useState({
    category: '',
    description: '',
    amount: '',
    expenseDate: new Date().toISOString().split('T')[0],
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadExpenses = useCallback(async () => {
    if (!branchId) return;

    try {
      const res = await expensesApi.list(branchId, {
        from: dateFrom || undefined,
        to: dateTo || undefined,
        category: categoryFilter || undefined,
        page: page + 1,
        pageSize: rowsPerPage,
      });

      setExpenses(res.data.items || []);
      setTotal(res.data.totalCount || 0);
    } catch {
      /* */
    }
  }, [branchId, dateFrom, dateTo, categoryFilter, page, rowsPerPage]);

  const loadSummary = useCallback(async () => {
    if (!branchId) return;

    const today = new Date().toISOString().split('T')[0];
    const from = dateFrom || today;
    const to = dateTo || today;

    try {
      const res = await expensesApi.summary(branchId, from, to);
      setSummary(res.data);
    } catch {
      /* */
    }
  }, [branchId, dateFrom, dateTo]);

  useEffect(() => { auth.hydrate(); }, []);
  useEffect(() => { loadExpenses(); }, [loadExpenses]);
  useEffect(() => { loadSummary(); }, [loadSummary]);

  const handleAddExpense = async () => {
    if (!form.category || !form.description || !form.amount) {
      setFormError('All fields are required');
      return;
    }

    const amount = parseFloat(form.amount);

    if (isNaN(amount) || amount <= 0) {
      setFormError('Enter a valid amount');
      return;
    }

    setSubmitting(true);
    setFormError('');

    try {
      await expensesApi.create({
        branchId,
        category: form.category,
        description: form.description,
        amount,
        recordedBy: auth.user?.id || '',
        recordedByName: auth.user?.name || '',
        expenseDate: form.expenseDate,
      });

      setDialogOpen(false);
      setForm({ category: '', description: '', amount: '', expenseDate: new Date().toISOString().split('T')[0] });
      setSnack({ message: 'Expense recorded', severity: 'success' });
      loadExpenses();
      loadSummary();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to add expense';
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await expensesApi.delete(id);
      setSnack({ message: 'Expense deleted', severity: 'success' });
      loadExpenses();
      loadSummary();
    } catch {
      setSnack({ message: 'Failed to delete expense', severity: 'error' });
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" gutterBottom>Expenses</Typography>
          <Typography variant="body2" color="text.secondary">
            Track and manage business expenses
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)} sx={{ borderRadius: 2 }}>
          Add Expense
        </Button>
      </Box>

      {summary && (
        <Paper sx={{ p: 2, mb: 3, display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'center' }}>
          <Box>
            <Typography variant="body2" color="text.secondary">Total Expenses</Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, color: 'error.main' }}>
              {formatKES(summary.totalAmount)}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">Transactions</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>{summary.count}</Typography>
          </Box>
          {summary.byCategory?.map((cat) => (
            <Chip
              key={cat.category}
              label={`${cat.category}: ${formatKES(cat.total)}`}
              size="small"
              sx={{
                bgcolor: (CATEGORY_COLORS[cat.category] || '#546E7A') + '18',
                color: CATEGORY_COLORS[cat.category] || '#546E7A',
                fontWeight: 600,
              }}
            />
          ))}
        </Paper>
      )}

      <Paper sx={{ mb: 2, p: 2 }}>
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
          <TextField
            label="From"
            type="date"
            size="small"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(0); }}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            label="To"
            type="date"
            size="small"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(0); }}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            label="Category"
            select
            size="small"
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setPage(0); }}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="">All Categories</MenuItem>
            {CATEGORIES.map((cat) => (
              <MenuItem key={cat} value={cat}>{cat}</MenuItem>
            ))}
          </TextField>
        </Stack>
      </Paper>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Recorded By</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell align="center" width={60}></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {expenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">No expenses found</Typography>
                </TableCell>
              </TableRow>
            ) : (
              expenses.map((expense) => (
                <TableRow key={expense.id} hover>
                  <TableCell>
                    {new Date(expense.expenseDate || expense.createdAt).toLocaleDateString('en-KE', {
                      day: '2-digit', month: 'short', year: 'numeric',
                    })}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={expense.category}
                      size="small"
                      sx={{
                        bgcolor: (CATEGORY_COLORS[expense.category] || '#546E7A') + '18',
                        color: CATEGORY_COLORS[expense.category] || '#546E7A',
                        fontWeight: 600,
                      }}
                    />
                  </TableCell>
                  <TableCell>{expense.description}</TableCell>
                  <TableCell>{expense.recordedByName}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    {formatKES(expense.amount)}
                  </TableCell>
                  <TableCell align="center">
                    <IconButton size="small" color="error" onClick={() => handleDelete(expense.id)}>
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={[10, 20, 50]}
        />
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Expense</DialogTitle>
        <DialogContent>
          {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
          <TextField
            label="Category"
            select
            fullWidth
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            sx={{ mt: 1, mb: 2 }}
          >
            {CATEGORIES.map((cat) => (
              <MenuItem key={cat} value={cat}>{cat}</MenuItem>
            ))}
          </TextField>
          <TextField
            label="Description"
            fullWidth
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            label="Amount (KES)"
            type="number"
            fullWidth
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            label="Date"
            type="date"
            fullWidth
            value={form.expenseDate}
            onChange={(e) => setForm({ ...form, expenseDate: e.target.value })}
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} disabled={submitting}>Cancel</Button>
          <Button variant="contained" onClick={handleAddExpense} disabled={submitting}>
            {submitting ? 'Saving...' : 'Save Expense'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!snack}
        autoHideDuration={3000}
        onClose={() => setSnack(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {snack ? <Alert severity={snack.severity} onClose={() => setSnack(null)}>{snack.message}</Alert> : undefined}
      </Snackbar>
    </Box>
  );
}
