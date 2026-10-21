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
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import { inventoryApi } from '@/lib/api';
import DProductImage from '@/components/DProductImage';

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
  imageUrl?: string | null;
  imageData?: string | null;
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

  const getStockBadge = (qty: number) => {
    if (qty <= 0) return { label: 'Out', color: '#DC2626', bg: '#FEE2E2' };
    if (qty <= 5) return { label: `${qty} left`, color: '#D97706', bg: '#FEF3C7' };
    return null;
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Search bar */}
      <TextField
        placeholder="Search products or scan barcode..."
        size="small"
        fullWidth
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        slotProps={{
          input: {
            startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: '#94A3B8' }} /></InputAdornment>,
            endAdornment: (
              <InputAdornment position="end">
                <IconButton size="small" sx={{ color: '#94A3B8' }}><QrCodeScannerIcon fontSize="small" /></IconButton>
              </InputAdornment>
            ),
          },
        }}
        sx={{
          mb: 1.5,
          '& .MuiOutlinedInput-root': {
            bgcolor: '#fff', borderRadius: 2.5,
            border: '1px solid #E2E8F0',
            '& fieldset': { border: 'none' },
            '&:hover': { borderColor: '#CBD5E1' },
            '&.Mui-focused': { borderColor: '#059669', boxShadow: '0 0 0 3px rgba(5, 150, 105, 0.1)' },
          },
        }}
      />

      {/* Category filter chips */}
      <Box sx={{
        display: 'flex', gap: 0.75, flexWrap: 'nowrap', mb: 1.5,
        minHeight: 36, alignItems: 'center', overflowX: 'auto',
        '&::-webkit-scrollbar': { display: 'none' },
        scrollbarWidth: 'none',
      }}>
        {selectedCat && categories.some((c) => c.parentId === selectedCat || categories.find((p) => p.id === selectedCat)?.parentId) ? (
          <Tooltip title="Back">
            <IconButton size="small" onClick={() => {
              const current = categories.find((c) => c.id === selectedCat);
              setSelectedCat(current?.parentId || null);
            }} sx={{ color: '#64748B', flexShrink: 0 }}>
              <ArrowBackIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        ) : null}
        <Chip
          label="All"
          size="small"
          onClick={() => setSelectedCat(null)}
          sx={{
            fontWeight: 600, fontSize: '0.75rem', flexShrink: 0,
            ...(selectedCat === null
              ? { bgcolor: '#059669', color: '#fff', '&:hover': { bgcolor: '#047857' } }
              : { bgcolor: '#F1F5F9', color: '#475569', border: '1px solid #E2E8F0', '&:hover': { bgcolor: '#E2E8F0' } }),
          }}
        />
        {(selectedCat
          ? categories.filter((c) => c.parentId === selectedCat)
          : categories.filter((c) => !c.parentId)
        ).map((cat) => (
          <Chip
            key={cat.id}
            label={cat.name}
            size="small"
            onClick={() => setSelectedCat(cat.id)}
            sx={{
              fontWeight: 600, fontSize: '0.75rem', flexShrink: 0,
              ...(selectedCat === cat.id
                ? { bgcolor: '#059669', color: '#fff', '&:hover': { bgcolor: '#047857' } }
                : { bgcolor: '#F1F5F9', color: '#475569', border: '1px solid #E2E8F0', '&:hover': { bgcolor: '#E2E8F0' } }),
            }}
          />
        ))}
        {selectedCat && categories.filter((c) => c.parentId === selectedCat).length === 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ ml: 1, flexShrink: 0 }}>
            {categories.find((c) => c.id === selectedCat)?.name}
          </Typography>
        )}
        <Box sx={{ flex: 1 }} />
        <Tooltip title="Refresh">
          <IconButton size="small" onClick={() => { loadProducts(search, selectedCat); loadCategories(); }} sx={{ color: '#64748B', flexShrink: 0 }}>
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Product grid */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {loading && products.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}>
            <CircularProgress sx={{ color: '#059669' }} />
          </Box>
        ) : products.length === 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pt: 8 }}>
            <Box sx={{ width: 56, height: 56, borderRadius: '50%', bgcolor: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
              <SearchIcon sx={{ fontSize: 28, color: '#94A3B8' }} />
            </Box>
            <Typography color="text.secondary" sx={{ fontWeight: 500 }}>No products found</Typography>
          </Box>
        ) : (
          <Grid container spacing={1.25}>
            {products?.map((p) => {
              const badge = getStockBadge(p.stockQuantity);
              const outOfStock = p.stockQuantity <= 0;
              return (
                <Grid size={{ xs: 4, sm: 3, md: 3 }} key={p.id}>
                  <Card
                    sx={{
                      borderRadius: 3,
                      border: '1px solid #E2E8F0',
                      boxShadow: 'none',
                      opacity: outOfStock ? 0.5 : 1,
                      transition: 'all 0.15s ease',
                      position: 'relative',
                      overflow: 'visible',
                      '&:hover': outOfStock ? {} : {
                        borderColor: '#059669',
                        boxShadow: '0 4px 12px rgba(5, 150, 105, 0.12)',
                        transform: 'translateY(-1px)',
                      },
                    }}
                  >
                    {badge && (
                      <Box sx={{
                        position: 'absolute', top: 6, right: 6, zIndex: 1,
                        px: 0.75, py: 0.25, borderRadius: 1,
                        bgcolor: badge.bg, color: badge.color,
                        fontSize: '0.6rem', fontWeight: 700, lineHeight: 1.4,
                      }}>
                        {badge.label}
                      </Box>
                    )}
                    <CardActionArea
                      onClick={() => { if (!outOfStock) onAddProduct(p); }}
                      disabled={outOfStock}
                      sx={{ p: 1.5, textAlign: 'center' }}
                    >
                      <CardContent sx={{ p: '0 !important' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
                          <DProductImage imageUrl={p.imageUrl} imageData={p.imageData} size={56} radius={2.5} />
                        </Box>
                        <Typography
                          sx={{
                            fontWeight: 600, fontSize: '0.75rem', minHeight: 32,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            lineHeight: 1.3, color: '#334155',
                          }}
                        >
                          {p.name}
                        </Typography>
                        <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: '#059669', mt: 0.5 }}>
                          {p.sellingPrice.toFixed(0)}
                        </Typography>
                        {!outOfStock && (
                          <Box sx={{
                            mt: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5,
                            color: '#059669', fontSize: '0.7rem', fontWeight: 600,
                          }}>
                            <AddCircleIcon sx={{ fontSize: 14 }} />
                            <span>Add</span>
                          </Box>
                        )}
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Box>
    </Box>
  );
}
