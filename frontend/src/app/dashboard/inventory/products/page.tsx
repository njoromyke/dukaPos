"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/EditOutlined";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Divider from "@mui/material/Divider";
import { useAuthStore } from "@/stores/auth-store";
import { inventoryApi, blobApi } from "@/lib/api";
import { useSnackbar } from "notistack";
import { formatCurrency } from "@/lib/utils";
import { DPageHeader, DSearchFilter, DTable, DFormDialog, DImageUpload, InventoryBranchSelector } from "@/components";
import DProductImage from "@/components/DProductImage";
import type { DColumn, FilterConfig } from "@/components";

interface Product {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  categoryName: string;
  unit: string;
  sellingPrice: number;
  costPrice: number;
  vatRate: number;
  isWeighed: boolean;
  stockQuantity: number;
  categoryId: string;
  imageUrl?: string;
  imageData?: string | null;
}

interface Category {
  id: string;
  name: string;
}

export default function ProductsPage() {
  const auth = useAuthStore();
  const { enqueueSnackbar } = useSnackbar();
  const [products, setProducts] = useState<Product[]>([]);
  const [branchId, setBranchId] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState({
    name: "",
    sku: "",
    barcode: "",
    categoryId: "",
    unit: "piece",
    sellingPrice: "",
    costPrice: "",
    vatRate: "16",
    isWeighed: false,
    imageUrl: "",
    initialStock: "0",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const requestSequence = useRef(0);
  const canManageInventory = ["Admin", "SuperAdmin", "Manager"].includes(auth.user?.role || "")
    || auth.user?.permissions?.includes("inventory.manage")
    || auth.user?.permissions?.includes("admin.portal.view");

  const loadProducts = useCallback(async () => {
    if (!branchId || branchId === "00000000-0000-0000-0000-000000000000") return;
    const requestId = ++requestSequence.current;
    setLoading(true);
    try {
      const res = await inventoryApi.getProducts(branchId, {
        search: search || undefined,
        categoryId: catFilter || undefined,
        page: page + 1,
        pageSize,
      });
      const d = res.data;
      const items = Array.isArray(d)
        ? d
        : Array.isArray(d?.products)
          ? d.products
          : Array.isArray(d?.Products)
            ? d.Products
            : Array.isArray(d?.items)
              ? d.items
              : [];
      if (requestId !== requestSequence.current) return;
      setProducts(items);
      setTotal(Number(d?.totalCount ?? d?.TotalCount ?? d?.total ?? items.length));
    } catch (error: any) {
      if (requestId !== requestSequence.current) return;
      enqueueSnackbar(error.response?.data?.message || error.response?.data?.detail || error.response?.data?.title || "Could not load this products page", { variant: "error" });
    } finally {
      if (requestId === requestSequence.current) setLoading(false);
    }
  }, [branchId, search, catFilter, page, pageSize]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    if (auth.user && auth.user.role !== "SuperAdmin") setBranchId(auth.user.branchId || "");
  }, [auth.user?.id, auth.user?.role, auth.user?.branchId]);

  useEffect(() => {
    inventoryApi
      .getCategories()
      .then((r) => setCategories(r.data))
      .catch(() => {});
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", sku: "", barcode: "", categoryId: "", unit: "piece", sellingPrice: "", costPrice: "", vatRate: "16", isWeighed: false, imageUrl: "", initialStock: "0" });
    setImageFile(null);
    setImagePreview(null);
    setDialogOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({ name: p.name, sku: p.sku, barcode: p.barcode || "", categoryId: p.categoryId, unit: p.unit, sellingPrice: String(p.sellingPrice), costPrice: String(p.costPrice), vatRate: String(p.vatRate), isWeighed: p.isWeighed, imageUrl: p.imageUrl || "", initialStock: "0" });
    setImageFile(null);
    setImagePreview(p.imageUrl || null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.sku.trim() || !form.categoryId || !form.sellingPrice || !form.costPrice) {
      enqueueSnackbar("Enter a name, SKU, category, selling price, and cost price.", { variant: "warning" });
      return;
    }
    if (!editing && (!branchId || branchId === "00000000-0000-0000-0000-000000000000")) {
      enqueueSnackbar("Select a branch before adding a product.", { variant: "warning" });
      return;
    }
    const payload: Record<string, unknown> = {
      ...form,
      sellingPrice: parseFloat(form.sellingPrice),
      costPrice: parseFloat(form.costPrice),
      vatRate: parseInt(form.vatRate),
    };
    if (!editing) {
      payload.branchId = branchId;
      payload.initialStock = Number(form.initialStock || 0);
    }
    setSaving(true);
    try {
      if (imageFile) {
        const uploadRes = await blobApi.upload(imageFile, "product-image");
        payload.imageUrl = uploadRes.data.url || blobApi.getUrl(uploadRes.data.id);
      }
      if (editing) {
        await inventoryApi.updateProduct({ id: editing.id, ...payload });
      } else {
        await inventoryApi.createProduct(payload);
      }
      enqueueSnackbar(editing ? "Product updated" : "Product created", { variant: "success" });
      setDialogOpen(false);
      loadProducts();
    } catch (error: any) {
      enqueueSnackbar(error.response?.data?.message || "Failed to save product", { variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const columns: DColumn<Product>[] = [
    { field: "imageUrl", header: "Image", width: 68, render: (p) => <DProductImage imageUrl={p.imageUrl} imageData={p.imageData} size={40} /> },
    {
      field: "name",
      header: "Name",
      render: (p: Product) => (
        <Typography variant="body2" fontWeight={600}>{p.name}</Typography>
      ),
    },
    { field: "sku", header: "SKU" },
    { field: "categoryName", header: "Category" },
    {
      field: "sellingPrice",
      header: "Price",
      align: "right",
      render: (p) => formatCurrency(p.sellingPrice),
    },
    {
      field: "costPrice",
      header: "Cost",
      align: "right",
      render: (p) => formatCurrency(p.costPrice),
    },
    {
      field: "stockQuantity",
      header: "Stock",
      align: "right",
      render: (p) => (
        <Chip
          label={`${p.stockQuantity} ${p.unit}`}
          size="small"
          color={p.stockQuantity <= 0 ? "error" : p.stockQuantity < 10 ? "warning" : "default"}
          variant="outlined"
        />
      ),
    },
    {
      field: "vatRate",
      header: "VAT",
      render: (p) => `${p.vatRate}%`,
    },
    ...(canManageInventory ? [{
      field: "_actions",
      header: "",
      width: 50,
      sortable: false,
      render: (p: Product) => (
        <IconButton size="small" onClick={(e) => { e.stopPropagation(); openEdit(p); }}>
          <EditIcon fontSize="small" />
        </IconButton>
      ),
    }] : []),
  ];

  const filters: FilterConfig[] = [
    {
      label: "Category",
      value: catFilter,
      options: [
        { label: "All categories", value: "" },
        ...categories.map((c) => ({ label: c.name, value: c.id })),
      ],
      onChange: (v) => { setCatFilter(v); setPage(0); },
    },
  ];

  return (
    <Box sx={{ width: "100%", minWidth: 0, maxWidth: "100%", overflowX: "hidden" }}>
      <DPageHeader
        title="Products"
        subtitle="Manage your catalog, pricing and stock details."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Inventory", href: "/dashboard/inventory/products" },
          { label: "Products" },
        ]}
        action={canManageInventory ? (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            Add product
          </Button>
        ) : undefined}
      />

      <Paper sx={{ p: { xs: 1.5, sm: 2 }, mb: 2, border: '1px solid #E6EAF0', borderRadius: 3, boxShadow: '0 2px 8px rgba(15,23,42,.035)' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap', mb: 1.5 }}>
          <Box>
            <Typography sx={{ color: '#233247', fontSize: '0.92rem', fontWeight: 700 }}>Catalog overview</Typography>
            <Typography sx={{ color: '#8390A1', fontSize: '0.78rem', mt: .25 }}>Search and filter the products available at this branch.</Typography>
          </Box>
          <Chip label={`${total.toLocaleString()} ${total === 1 ? 'product' : 'products'}`} size="small" sx={{ bgcolor: '#E9F7F1', color: '#087A58', fontWeight: 700 }} />
        </Box>
        <Divider sx={{ mb: 1.5, borderColor: '#EEF1F4' }} />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <InventoryBranchSelector value={branchId} onChange={(value) => { setBranchId(value); setPage(0); }} />
          <Box sx={{ flex: 1, minWidth: { xs: '100%', sm: 280 } }}>
            <DSearchFilter
              search={search}
              onSearchChange={(v) => { setSearch(v); setPage(0); }}
              searchPlaceholder="Search by product name or SKU"
              filters={filters}
              filterAction
            />
          </Box>
        </Box>
      </Paper>

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

      <DFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editing ? "Edit Product" : "New Product"}
        onSave={handleSave}
        saving={saving}
      >
        <TextField label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <TextField label="SKU" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} required disabled={!!editing} />
        <TextField label="Barcode" value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
        <TextField select label="Category" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} required>
          {categories.map((c) => (
            <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
          ))}
        </TextField>
        <Box display="flex" gap={2}>
          <TextField label="Selling Price" type="number" value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })} required sx={{ flex: 1 }} />
          <TextField label="Cost Price" type="number" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} required sx={{ flex: 1 }} />
        </Box>
        <Box display="flex" gap={2}>
          <TextField select label="Unit" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} sx={{ flex: 1 }}>
            {["piece", "kg", "litre", "pack", "dozen"].map((u) => (
              <MenuItem key={u} value={u}>{u}</MenuItem>
            ))}
          </TextField>
          <TextField select label="VAT Rate" value={form.vatRate} onChange={(e) => setForm({ ...form, vatRate: e.target.value })} sx={{ flex: 1 }}>
            <MenuItem value="16">16% (Standard)</MenuItem>
            <MenuItem value="0">Exempt</MenuItem>
          </TextField>
        </Box>
        <DImageUpload
          preview={imagePreview}
          onSelect={(file) => { setImageFile(file); setImagePreview(URL.createObjectURL(file)); }}
          onRemove={() => { setImageFile(null); setImagePreview(null); setForm((current) => ({ ...current, imageUrl: "" })); }}
        />
        {!editing && <TextField label="Opening stock" type="number" value={form.initialStock} onChange={(e) => setForm({ ...form, initialStock: e.target.value })} inputProps={{ min: 0, step: "any" }} />}
      </DFormDialog>
    </Box>
  );
}
