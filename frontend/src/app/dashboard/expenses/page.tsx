"use client";

import { useEffect, useState, useCallback } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Alert from "@mui/material/Alert";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import { useAuthStore } from "@/stores/auth-store";
import { expensesApi } from "@/lib/api";
import { useSnackbar } from "notistack";
import { formatCurrency } from "@/lib/utils";
import { DPageHeader, DSearchFilter, DTable, DFormDialog, DDateRange, DStatCard, DStatusChip, DConfirmDialog, DFeatureUpgradeHint } from "@/components";
import type { DColumn, FilterConfig } from "@/components";
import dayjs from "dayjs";
import api from "@/lib/api";

const CATEGORIES = ["Rent", "Utilities", "Salaries", "Supplies", "Transport", "Maintenance", "Marketing", "Taxes", "Other"] as const;

const CATEGORY_COLORS: Record<string, string> = {
  Rent: "#1565C0", Utilities: "#F57C00", Salaries: "#2E7D32", Supplies: "#7B1FA2",
  Transport: "#C62828", Maintenance: "#00838F", Marketing: "#AD1457", Taxes: "#4E342E", Other: "#546E7A",
};

interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  recordedByName: string;
  expenseDate: string;
  createdAt: string;
  status?: string;
  approvedByName?: string;
  rejectionReason?: string;
}

interface ExpenseSummary {
  totalAmount: number;
  count: number;
  byCategory: { category: string; total: number; count: number }[];
}

export default function ExpensesPage() {
  const auth = useAuthStore();
  const { enqueueSnackbar } = useSnackbar();
  const branchId = auth.user?.branchId || "";

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ category: "", description: "", amount: "", expenseDate: dayjs().format("YYYY-MM-DD") });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [expenseFeature, setExpenseFeature] = useState(true);

  useEffect(() => {
    api.get('/api/subscriptions/current').then((response) => {
      const features = response.data?.features as string[] | undefined;
      if (features?.length) setExpenseFeature(features.includes('expense_tracking'));
    }).catch(() => {});
  }, []);

  const loadExpenses = useCallback(async () => {
    if (!branchId || !expenseFeature) return;
    setLoading(true);
    try {
      const res = await expensesApi.list(branchId, {
        from: dateFrom || undefined, to: dateTo || undefined,
        category: categoryFilter || undefined, page: page + 1, pageSize,
      });
      setExpenses(res.data.items || []);
      setTotal(res.data.totalCount || 0);
    } catch { /* */ } finally { setLoading(false); }
  }, [branchId, dateFrom, dateTo, categoryFilter, page, pageSize, expenseFeature]);

  const loadSummary = useCallback(async () => {
    if (!branchId || !expenseFeature) return;
    const today = dayjs().format("YYYY-MM-DD");
    try {
      const res = await expensesApi.summary(branchId, dateFrom || today, dateTo || today);
      setSummary(res.data);
    } catch { /* */ }
  }, [branchId, dateFrom, dateTo, expenseFeature]);

  useEffect(() => { loadExpenses(); }, [loadExpenses]);
  useEffect(() => { loadSummary(); }, [loadSummary]);

  const handleAddExpense = async () => {
    if (!form.category || !form.description || !form.amount) { setFormError("All fields are required"); return; }
    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount <= 0) { setFormError("Enter a valid amount"); return; }
    setSubmitting(true); setFormError("");
    try {
      await expensesApi.create({ branchId, category: form.category, description: form.description, amount, recordedBy: auth.user?.id || "", recordedByName: auth.user?.fullName || "", expenseDate: form.expenseDate });
      setDialogOpen(false);
      setForm({ category: "", description: "", amount: "", expenseDate: dayjs().format("YYYY-MM-DD") });
      enqueueSnackbar("Expense recorded", { variant: "success" });
      loadExpenses(); loadSummary();
    } catch (err: any) { setFormError(err?.response?.data?.message || "Failed to add expense"); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    try { await expensesApi.delete(id); enqueueSnackbar("Expense deleted", { variant: "success" }); loadExpenses(); loadSummary(); }
    catch { enqueueSnackbar("Failed to delete expense", { variant: "error" }); }
  };

  const canApprove = ["Supervisor", "Manager", "Admin", "SuperAdmin"].includes(auth.user?.role || "");

  const handleApprove = async (id: string) => {
    try { await expensesApi.approve(id, auth.user?.id || "", auth.user?.fullName || ""); enqueueSnackbar("Expense approved", { variant: "success" }); loadExpenses(); }
    catch { enqueueSnackbar("Failed to approve expense", { variant: "error" }); }
  };

  const handleReject = async () => {
    if (!rejectId || !rejectReason) return;
    try { await expensesApi.reject(rejectId, auth.user?.id || "", auth.user?.fullName || "", rejectReason); enqueueSnackbar("Expense rejected", { variant: "success" }); loadExpenses(); }
    catch { enqueueSnackbar("Failed to reject expense", { variant: "error" }); }
    finally { setRejectId(null); setRejectReason(""); }
  };

  const columns: DColumn<Expense>[] = [
    {
      field: "expenseDate", header: "Date",
      render: (e) => new Date(e.expenseDate || e.createdAt).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" }),
    },
    {
      field: "category", header: "Category",
      render: (e) => <Chip label={e.category} size="small" sx={{ bgcolor: (CATEGORY_COLORS[e.category] || "#546E7A") + "18", color: CATEGORY_COLORS[e.category] || "#546E7A", fontWeight: 600 }} />,
    },
    { field: "description", header: "Description" },
    { field: "recordedByName", header: "Recorded By" },
    { field: "amount", header: "Amount", align: "right", render: (e) => <Typography fontWeight={700}>{formatCurrency(e.amount)}</Typography> },
    { field: "status", header: "Status", render: (e) => <DStatusChip status={e.status || "Draft"} /> },
    {
      field: "_actions", header: "Actions", align: "center", width: 120, sortable: false,
      render: (e) => (
        <Box display="flex" gap={0.5} justifyContent="center">
          {canApprove && (!e.status || e.status === "Draft" || e.status === "PendingApproval") && (
            <>
              <IconButton size="small" color="success" onClick={() => handleApprove(e.id)} title="Approve"><CheckCircleOutlineIcon fontSize="small" /></IconButton>
              <IconButton size="small" color="error" onClick={() => { setRejectId(e.id); setRejectReason(""); }} title="Reject"><CancelOutlinedIcon fontSize="small" /></IconButton>
            </>
          )}
          <IconButton size="small" color="error" onClick={() => handleDelete(e.id)} title="Delete"><DeleteOutlineIcon fontSize="small" /></IconButton>
        </Box>
      ),
    },
  ];

  const filters: FilterConfig[] = [
    {
      label: "Category", value: categoryFilter,
      options: [{ label: "All Categories", value: "" }, ...CATEGORIES.map((c) => ({ label: c, value: c }))],
      onChange: (v) => { setCategoryFilter(v); setPage(0); },
    },
  ];

  return (
    <Box>
      <DPageHeader
        title="Expenses"
        subtitle="Track and manage business expenses"
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Expenses" }]}
        action={expenseFeature ?
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
            Add Expense
          </Button>
        : <DFeatureUpgradeHint feature="expense_tracking" label="Expense tracking" />}
      />

      {expenseFeature && summary && (
        <Paper sx={{ p: 2, mb: 3, display: "flex", gap: 3, flexWrap: "wrap", alignItems: "center" }}>
          <Box>
            <Typography variant="body2" color="text.secondary">Total Expenses</Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, color: "error.main" }}>{formatCurrency(summary.totalAmount)}</Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">Transactions</Typography>
            <Typography variant="h6" fontWeight={700}>{summary.count}</Typography>
          </Box>
          {summary.byCategory?.map((cat) => (
            <Chip key={cat.category} label={`${cat.category}: ${formatCurrency(cat.total)}`} size="small"
              sx={{ bgcolor: (CATEGORY_COLORS[cat.category] || "#546E7A") + "18", color: CATEGORY_COLORS[cat.category] || "#546E7A", fontWeight: 600 }} />
          ))}
        </Paper>
      )}

      {expenseFeature && <Box display="flex" gap={2} flexWrap="wrap" alignItems="center" mb={2}>
        <DDateRange from={dateFrom} to={dateTo} onFromChange={(v) => { setDateFrom(v); setPage(0); }} onToChange={(v) => { setDateTo(v); setPage(0); }} />
      </Box>}

      {expenseFeature && <DSearchFilter filters={filters} onRefresh={() => { loadExpenses(); loadSummary(); }} />}

      {expenseFeature && <DTable
        columns={columns} rows={expenses} rowKey={(e) => e.id}
        loading={loading} totalCount={total} page={page} pageSize={pageSize}
        pageSizeOptions={[10, 20, 50]}
        onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(0); }}
        emptyMessage="No expenses found"
      />}

      {expenseFeature && <DFormDialog open={dialogOpen} onClose={() => setDialogOpen(false)} title="Add Expense" onSave={handleAddExpense} saving={submitting}>
        {formError && <Alert severity="error" sx={{ mb: 1 }}>{formError}</Alert>}
        <TextField select label="Category" fullWidth value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
          {CATEGORIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
        </TextField>
        <TextField label="Description" fullWidth value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <TextField label="Amount (KES)" type="number" fullWidth value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
        <TextField label="Date" type="date" fullWidth value={form.expenseDate} onChange={(e) => setForm({ ...form, expenseDate: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
      </DFormDialog>}

      <DConfirmDialog
        open={!!rejectId}
        onClose={() => setRejectId(null)}
        onConfirm={handleReject}
        title="Reject Expense"
        message="Enter a reason for rejecting this expense:"
        confirmLabel="Reject"
        confirmColor="error"
      />
    </Box>
  );
}
