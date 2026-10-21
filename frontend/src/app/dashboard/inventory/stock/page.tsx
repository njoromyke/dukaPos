"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import { useAuthStore } from "@/stores/auth-store";
import { inventoryApi } from "@/lib/api";
import { useSnackbar } from "notistack";
import { DPageHeader, DTable, DFormDialog, DSearchFilter, InventoryBranchSelector } from "@/components";
import type { DColumn } from "@/components";

interface Product {
  id: string;
  name: string;
  sku: string;
  unit: string;
  stockQuantity: number;
  reorderLevel?: number;
  isLowStock?: boolean;
}

export default function StockPage() {
  const auth = useAuthStore();
  const { enqueueSnackbar } = useSnackbar();
  const [products, setProducts] = useState<Product[]>([]);
  const [branchId, setBranchId] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [selected, setSelected] = useState<Product | null>(null);
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState("Adjustment");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const requestSequence = useRef(0);
  const canAdjustStock = auth.user?.role === "Admin" || auth.user?.role === "SuperAdmin"
    || auth.user?.permissions?.includes("stock.adjust");

  const load = useCallback(async () => {
    if (!branchId || branchId === "00000000-0000-0000-0000-000000000000") return;
    const requestId = ++requestSequence.current;
    setLoading(true);
    try {
      const r = await inventoryApi.getStockLevels(branchId, { search: search || undefined, page: page + 1, pageSize });
      const data = r.data;
      const items = data.stockLevels || data.StockLevels || data.items || data.Items || [];
      if (requestId !== requestSequence.current) return;
      setProducts(items.map((item: any) => ({
        id: item.productId,
        name: item.productName,
        sku: item.sku,
        unit: item.unit,
        stockQuantity: item.quantity,
        reorderLevel: item.reorderLevel,
        isLowStock: item.isLowStock,
      })));
      setTotal(Number(data.totalCount ?? data.TotalCount ?? items.length));
    } catch { /* */ }
    finally { if (requestId === requestSequence.current) setLoading(false); }
  }, [branchId, search, page, pageSize]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (auth.user && auth.user.role !== "SuperAdmin") setBranchId(auth.user.branchId || "");
  }, [auth.user?.id, auth.user?.role, auth.user?.branchId]);

  const openAdjust = (p: Product) => {
    setSelected(p); setQty(""); setReason("Adjustment"); setNotes(""); setAdjustOpen(true);
  };

  const handleAdjust = async () => {
    const quantityChange = Number(qty);
    if (!selected || !auth.user || !Number.isFinite(quantityChange) || quantityChange === 0) return;
    setSaving(true);
    try {
      await inventoryApi.adjustStock({ productId: selected.id, branchId, quantityChange, reason, notes: notes || undefined, adjustedBy: auth.user.id });
      enqueueSnackbar("Stock adjusted", { variant: "success" });
      setAdjustOpen(false);
      load();
    } catch (error: any) {
      enqueueSnackbar(error.response?.data?.message || error.response?.data?.detail || error.response?.data?.title || error.message || "Adjustment failed", { variant: "error" });
    }
    finally { setSaving(false); }
  };

  const columns: DColumn<Product>[] = [
    { field: "name", header: "Product", render: (p) => <Typography variant="body2" fontWeight={600}>{p.name}</Typography> },
    { field: "sku", header: "SKU" },
    { field: "stockQuantity", header: "Quantity", align: "right", render: (p) => <Typography fontWeight={700}>{p.stockQuantity}</Typography> },
    { field: "unit", header: "Unit" },
    {
      field: "_status", header: "Status",
      render: (p) => (
        <Chip size="small" variant="outlined"
          label={p.stockQuantity <= 0 ? "Out of stock" : p.stockQuantity < 10 ? "Low" : "OK"}
          color={p.stockQuantity <= 0 ? "error" : p.stockQuantity < 10 ? "warning" : "success"} />
      ),
    },
    ...(!canAdjustStock ? [] : [{
      field: "_actions", header: "", width: 100, sortable: false,
      render: (p: Product) => <Button size="small" onClick={() => openAdjust(p)}>Adjust</Button>,
    }]),
  ];

  return (
    <Box>
      <DPageHeader
        title="Stock Levels"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Inventory", href: "/dashboard/inventory/products" },
          { label: "Stock" },
        ]}
      />
      <InventoryBranchSelector value={branchId} onChange={(value) => { setBranchId(value); setPage(0); }} />
      <DSearchFilter
        search={search}
        onSearchChange={(value) => { setSearch(value); setPage(0); }}
        searchPlaceholder="Search products or SKU..."
        onRefresh={() => void load()}
      />
      <DTable
        columns={columns}
        rows={products}
        rowKey={(p) => p.id}
        loading={loading}
        totalCount={total}
        page={page}
        pageSize={pageSize}
        pageSizeOptions={[10, 20, 50]}
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(0); }}
        emptyMessage="No products found"
      />

      <DFormDialog open={adjustOpen} onClose={() => setAdjustOpen(false)} title={`Adjust Stock — ${selected?.name || ""}`} onSave={handleAdjust} saving={saving} saveLabel="Apply" disabled={!qty || !Number.isFinite(Number(qty)) || Number(qty) === 0}>
        <Typography variant="body2" color="text.secondary">Current: {selected?.stockQuantity} {selected?.unit}</Typography>
        <TextField label="Quantity change" type="number" value={qty} onChange={(e) => setQty(e.target.value)} helperText="Positive to add, negative to subtract" />
        <TextField select label="Reason" value={reason} onChange={(e) => setReason(e.target.value)}>
          {["Adjustment", "Damaged", "Expired", "PurchaseReceived", "Transfer"].map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
        </TextField>
        <TextField label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} multiline rows={2} />
      </DFormDialog>
    </Box>
  );
}
