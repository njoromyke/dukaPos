'use client';

import {
  Box, Typography, IconButton, Button, Divider, Stack,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import PaymentIcon from '@mui/icons-material/Payment';
import { formatCurrency } from '@/lib/utils';

interface LineItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  vatRatePercent: number;
  vatAmount: number;
  discount: number;
  lineTotal: number;
}

interface Sale {
  id: string | null;
  saleNumber: string;
  status: string;
  lineItems: LineItem[];
  subtotal: number;
  vatTotal: number;
  discountTotal: number;
  grandTotal: number;
}

interface Props {
  sale: Sale | null;
  onUpdateQuantity: (lineItemId: string, delta: number) => void;
  onRemoveItem: (lineItemId: string) => void;
  onPark: () => void;
  onPay: () => void;
}

export default function Cart({ sale, onUpdateQuantity, onRemoveItem, onPark, onPay }: Props) {
  if (!sale || sale.lineItems.length === 0) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
        <Box sx={{
          width: 64, height: 64, borderRadius: '50%',
          bgcolor: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2,
        }}>
          <ShoppingCartOutlinedIcon sx={{ fontSize: 28, color: '#94A3B8' }} />
        </Box>
        <Typography sx={{ fontWeight: 700, color: '#334155', fontSize: '1rem' }}>
          Cart is empty
        </Typography>
        <Typography sx={{ color: '#94A3B8', fontSize: '0.8125rem', mt: 0.5 }}>
          Tap products to add them
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Cart header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.9375rem', color: '#0F172A' }}>Cart</Typography>
          <Box sx={{
            px: 1, py: 0.25, borderRadius: 1, bgcolor: '#ECFDF5',
            fontSize: '0.7rem', fontWeight: 700, color: '#047857',
          }}>
            {sale.lineItems.length} item{sale.lineItems.length !== 1 ? 's' : ''}
          </Box>
        </Box>
        <Typography sx={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 500 }}>{sale.saleNumber}</Typography>
      </Box>

      <Divider sx={{ borderColor: '#F1F5F9' }} />

      {/* Line items */}
      <Box sx={{ flex: 1, overflow: 'auto', my: 1.5 }}>
        {sale.lineItems.map((item) => (
          <Box
            key={item.id}
            sx={{
              p: 1.5, mb: 1, borderRadius: 2.5,
              border: '1px solid #F1F5F9',
              bgcolor: '#FAFBFC',
              transition: 'border-color 0.15s ease',
              '&:hover': { borderColor: '#E2E8F0' },
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box sx={{ flex: 1, mr: 1, minWidth: 0 }}>
                <Typography sx={{ fontWeight: 600, fontSize: '0.8125rem', color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.productName}
                </Typography>
                <Typography sx={{ fontSize: '0.7rem', color: '#94A3B8', mt: 0.25 }}>
                  {formatCurrency(item.unitPrice)} &times; {item.quantity}
                </Typography>
              </Box>
              <Typography sx={{ fontWeight: 800, fontSize: '0.875rem', color: '#0F172A', flexShrink: 0 }}>
                {formatCurrency(item.lineTotal)}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', mt: 0.75, gap: 0.25 }}>
              <IconButton
                size="small"
                onClick={() => onUpdateQuantity(item.id, -1)}
                sx={{
                  width: 28, height: 28,
                  border: '1px solid #E2E8F0', borderRadius: 1.5,
                  '&:hover': { bgcolor: '#F1F5F9' },
                }}
              >
                <RemoveIcon sx={{ fontSize: 14 }} />
              </IconButton>
              <Typography sx={{ fontWeight: 800, fontSize: '0.8125rem', minWidth: 28, textAlign: 'center', color: '#0F172A' }}>
                {item.quantity}
              </Typography>
              <IconButton
                size="small"
                onClick={() => onUpdateQuantity(item.id, 1)}
                sx={{
                  width: 28, height: 28,
                  border: '1px solid #E2E8F0', borderRadius: 1.5,
                  '&:hover': { bgcolor: '#F1F5F9' },
                }}
              >
                <AddIcon sx={{ fontSize: 14 }} />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => onRemoveItem(item.id)}
                sx={{
                  width: 28, height: 28, ml: 0.75,
                  color: '#94A3B8', borderRadius: 1.5,
                  '&:hover': { bgcolor: '#FEE2E2', color: '#DC2626' },
                }}
              >
                <DeleteOutlineIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Box>
          </Box>
        ))}
      </Box>

      <Divider sx={{ borderColor: '#F1F5F9' }} />

      {/* Totals */}
      <Box sx={{ py: 1.5 }}>
        <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
          <Typography sx={{ fontSize: '0.8125rem', color: '#64748B' }}>Subtotal</Typography>
          <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155' }}>{formatCurrency(sale.subtotal)}</Typography>
        </Stack>
        <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
          <Typography sx={{ fontSize: '0.8125rem', color: '#64748B' }}>VAT included</Typography>
          <Typography sx={{ fontSize: '0.8125rem', fontWeight: 500, color: '#94A3B8' }}>{formatCurrency(sale.vatTotal)}</Typography>
        </Stack>
        {sale.discountTotal > 0 && (
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
            <Typography sx={{ fontSize: '0.8125rem', color: '#64748B' }}>Discount</Typography>
            <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: '#059669' }}>-{formatCurrency(sale.discountTotal)}</Typography>
          </Stack>
        )}
        <Divider sx={{ my: 1, borderColor: '#E2E8F0' }} />
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: '#0F172A' }}>TOTAL</Typography>
          <Typography sx={{ fontWeight: 800, fontSize: '1.375rem', color: '#059669' }}>
            {formatCurrency(sale.grandTotal)}
          </Typography>
        </Stack>
      </Box>

      {/* Action buttons */}
      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
        <Button
          variant="outlined"
          startIcon={<BookmarkBorderIcon />}
          onClick={onPark}
          sx={{
            flex: 1, borderRadius: 2.5, py: 1.25,
            borderColor: '#E2E8F0', color: '#475569',
            '&:hover': { borderColor: '#CBD5E1', bgcolor: '#F8FAFC' },
          }}
        >
          Park
        </Button>
        <Button
          variant="contained"
          startIcon={<PaymentIcon />}
          onClick={onPay}
          size="large"
          sx={{
            flex: 2, borderRadius: 2.5, py: 1.25,
            bgcolor: '#059669', fontWeight: 700,
            boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)',
            '&:hover': { bgcolor: '#047857', boxShadow: '0 6px 16px rgba(5, 150, 105, 0.35)' },
          }}
        >
          Pay {formatCurrency(sale.grandTotal)}
        </Button>
      </Stack>
    </Box>
  );
}
