'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Box, TextField, InputAdornment, Chip, Card, CardActionArea,
  CardContent, Typography, CircularProgress, IconButton, Tooltip,
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import SearchIcon from '@mui/icons-material/Search';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RefreshIcon from '@mui/icons-material/Refresh';
import { inventoryApi } from '@/lib/api';

interface Product {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  categoryName: string;
  unit: string;
  sellingPrice: number;
  vatRate: number;
  isWeighed: boolean;
  stockQuantity: number;
}

interface Category {
  id: string;
  name: string;
  parentId: string | null;
}

interface Props {
  branchId: string;
  onAddProduct: (product: Product) => void;
}

export default function ProductGrid({ branchId, onAddProduct }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadProducts = useCallback(async (s?: string, catId?: string | null) => {
    if (!branchId) return;
    setLoading(true);
    try {
      const res = await inventoryApi.getProducts(branchId, {
        search: s || undefined,
        categoryId: catId || undefined,
      });
      setProducts(Array.isArray(res.data) ? res.data : res.data.products || []);
    } catch { /* */ }
    setLoading(false);
  }, [branchId]);

  const loadCategories = useCallback(async () => {
    try {
      const res = await inventoryApi.getCategories();
      setCategories(Array.isArray(res.data) ? res.data : []);
    } catch { /* */ }
  }, []);

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, [loadProducts, loadCategories]);

  useEffect(() => {
    const timer = setTimeout(() => loadProducts(search, selectedCat), 300);
    return () => clearTimeout(timer);
  }, [search, selectedCat, loadProducts]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <TextField
        placeholder="Search or scan barcode..."
        size="small"
        fullWidth
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start"><SearchIcon /></InputAdornment>
            ),
          },
        }}
        sx={{ mb: 1 }}
      />

      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1, minHeight: 36, alignItems: 'center' }}>
        {selectedCat && categories.some((c) => c.parentId === selectedCat || categories.find((p) => p.id === selectedCat)?.parentId) ? (
          <Tooltip title="Back">
            <IconButton size="small" onClick={() => {
              const current = categories.find((c) => c.id === selectedCat);
              setSelectedCat(current?.parentId || null);
            }}>
              <ArrowBackIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        ) : null}
        <Chip
          label="All"
          size="small"
          color={selectedCat === null ? 'primary' : 'default'}
          onClick={() => setSelectedCat(null)}
        />
        {(selectedCat
          ? categories.filter((c) => c.parentId === selectedCat)
          : categories.filter((c) => !c.parentId)
        ).map((cat) => (
          <Chip
            key={cat.id}
            label={cat.name}
            size="small"
            color={selectedCat === cat.id ? 'primary' : 'default'}
            onClick={() => setSelectedCat(cat.id)}
          />
        ))}
        {selectedCat && categories.filter((c) => c.parentId === selectedCat).length === 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
            {categories.find((c) => c.id === selectedCat)?.name}
          </Typography>
        )}
        <Box sx={{ flex: 1 }} />
        <Tooltip title="Refresh">
          <IconButton size="small" onClick={() => { loadProducts(search, selectedCat); loadCategories(); }}>
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {loading && products.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}>
            <CircularProgress />
          </Box>
        ) : products.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}>
            <Typography color="text.secondary">No products found</Typography>
          </Box>
        ) : (
          <Grid container spacing={1}>
            {products?.map((p) => (
              <Grid size={{ xs: 4, sm: 3, md: 3 }} key={p.id}>
                <Card
                  variant="outlined"
                  sx={{
                    borderRadius: 2,
                    opacity: p.stockQuantity <= 0 ? 0.5 : 1,
                    '&:hover': { borderColor: 'primary.main' },
                  }}
                >
                  <CardActionArea
                    onClick={() => {
                      if (p.stockQuantity <= 0) return;
                      onAddProduct(p);
                    }}
                    disabled={p.stockQuantity <= 0}
                    sx={{ p: 1.5, textAlign: 'center' }}
                  >
                    <CardContent sx={{ p: '0 !important' }}>
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 600, minHeight: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        noWrap={false}
                      >
                        {p.name}
                      </Typography>
                      <Typography variant="h6" color="primary" sx={{ fontWeight: 800, mt: 0.5 }}>
                        {p.sellingPrice.toFixed(0)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {p.stockQuantity > 0 ? `${p.stockQuantity} ${p.unit}` : 'Out of stock'}
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    </Box>
  );
}
