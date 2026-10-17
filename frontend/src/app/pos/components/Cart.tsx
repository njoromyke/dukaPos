'use client';

import {
  Box, Typography, IconButton, Button, Divider, Paper, Stack,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import PaymentIcon from '@mui/icons-material/Payment';

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

const formatKES = (n: number) => `KES ${n.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;

export default function Cart({ sale, onUpdateQuantity, onRemoveItem, onPark, onPay }: Props) {
  if (!sale || sale.lineItems.length === 0) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 600 }}>
          No items in cart
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Tap products to add them
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Cart</Typography>
        <Typography variant="caption" color="text.secondary">{sale.saleNumber}</Typography>
      </Box>

      <Divider />

      <Box sx={{ flex: 1, overflow: 'auto', my: 1 }}>
        {sale.lineItems.map((item) => (
          <Paper key={item.id} variant="outlined" sx={{ p: 1.5, mb: 1, borderRadius: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box sx={{ flex: 1, mr: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.productName}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatKES(item.unitPrice)} x {item.quantity}
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {formatKES(item.lineTotal)}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', mt: 0.5, gap: 0.5 }}>
              <IconButton size="small" onClick={() => onUpdateQuantity(item.id, -1)}>
                <RemoveIcon fontSize="small" />
              </IconButton>
              <Typography variant="body2" sx={{ fontWeight: 800, minWidth: 24, textAlign: 'center' }}>
                {item.quantity}
              </Typography>
              <IconButton size="small" onClick={() => onUpdateQuantity(item.id, 1)}>
                <AddIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" color="error" onClick={() => onRemoveItem(item.id)} sx={{ ml: 1 }}>
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Box>
          </Paper>
        ))}
      </Box>

      <Divider />

      <Box sx={{ py: 1.5 }}>
        <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
          <Typography variant="body2" color="text.secondary">Subtotal</Typography>
          <Typography variant="body2">{formatKES(sale.subtotal)}</Typography>
        </Stack>
        <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
          <Typography variant="body2" color="text.secondary">VAT (16%)</Typography>
          <Typography variant="body2">{formatKES(sale.vatTotal)}</Typography>
        </Stack>
        {sale.discountTotal > 0 && (
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
            <Typography variant="body2" color="text.secondary">Discount</Typography>
            <Typography variant="body2">-{formatKES(sale.discountTotal)}</Typography>
          </Stack>
        )}
        <Divider sx={{ my: 1 }} />
        <Stack direction="row" justifyContent="space-between">
          <Typography variant="h6" sx={{ fontWeight: 800 }}>TOTAL</Typography>
          <Typography variant="h6" color="primary" sx={{ fontWeight: 800 }}>
            {formatKES(sale.grandTotal)}
          </Typography>
        </Stack>
      </Box>

      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
        <Button
          variant="outlined"
          startIcon={<BookmarkBorderIcon />}
          onClick={onPark}
          sx={{ flex: 1, borderRadius: 2 }}
        >
          Park
        </Button>
        <Button
          variant="contained"
          startIcon={<PaymentIcon />}
          onClick={onPay}
          sx={{ flex: 2, borderRadius: 2, py: 1.5 }}
          size="large"
        >
          Pay {formatKES(sale.grandTotal)}
        </Button>
      </Stack>
    </Box>
  );
}
