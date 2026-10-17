'use client';

import { forwardRef } from 'react';
import { Box, Typography, Divider, Stack } from '@mui/material';

interface LineItem {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  vatAmount: number;
}

interface ReceiptData {
  saleNumber: string;
  cashierName: string;
  branchName?: string;
  tenantName?: string;
  lineItems: LineItem[];
  subtotal: number;
  vatTotal: number;
  discountTotal: number;
  grandTotal: number;
  paymentMethod?: string;
  amountTendered?: number;
  change?: number;
  completedAt?: string;
}

interface Props {
  receipt: ReceiptData;
}

const formatKES = (n: number) => `KES ${n.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;

const ReceiptPreview = forwardRef<HTMLDivElement, Props>(({ receipt }, ref) => {
  const now = receipt.completedAt
    ? new Date(receipt.completedAt)
    : new Date();

  return (
    <Box
      ref={ref}
      sx={{
        width: 300,
        p: 2,
        fontFamily: '"Courier New", monospace',
        bgcolor: 'white',
        color: 'black',
      }}
    >
      <Box sx={{ textAlign: 'center', mb: 1 }}>
        <Typography sx={{ fontWeight: 800, fontSize: 16, fontFamily: 'inherit' }}>
          {receipt.tenantName || 'DukaPoS'}
        </Typography>
        {receipt.branchName && (
          <Typography sx={{ fontSize: 11, fontFamily: 'inherit' }}>
            {receipt.branchName}
          </Typography>
        )}
        <Divider sx={{ my: 1, borderStyle: 'dashed' }} />
        <Typography sx={{ fontSize: 11, fontFamily: 'inherit' }}>
          {receipt.saleNumber}
        </Typography>
        <Typography sx={{ fontSize: 11, fontFamily: 'inherit' }}>
          {now.toLocaleDateString('en-KE')} {now.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}
        </Typography>
        <Typography sx={{ fontSize: 11, fontFamily: 'inherit' }}>
          Cashier: {receipt.cashierName}
        </Typography>
      </Box>

      <Divider sx={{ my: 1, borderStyle: 'dashed' }} />

      {receipt.lineItems.map((item) => (
        <Box key={item.id} sx={{ mb: 0.5 }}>
          <Typography sx={{ fontSize: 11, fontFamily: 'inherit', fontWeight: 600 }}>
            {item.productName}
          </Typography>
          <Stack direction="row" justifyContent="space-between">
            <Typography sx={{ fontSize: 11, fontFamily: 'inherit' }}>
              {item.quantity} x {item.unitPrice.toFixed(2)}
            </Typography>
            <Typography sx={{ fontSize: 11, fontFamily: 'inherit' }}>
              {item.lineTotal.toFixed(2)}
            </Typography>
          </Stack>
        </Box>
      ))}

      <Divider sx={{ my: 1, borderStyle: 'dashed' }} />

      <Stack direction="row" justifyContent="space-between">
        <Typography sx={{ fontSize: 11, fontFamily: 'inherit' }}>Subtotal</Typography>
        <Typography sx={{ fontSize: 11, fontFamily: 'inherit' }}>{formatKES(receipt.subtotal)}</Typography>
      </Stack>
      <Stack direction="row" justifyContent="space-between">
        <Typography sx={{ fontSize: 11, fontFamily: 'inherit' }}>VAT (16%)</Typography>
        <Typography sx={{ fontSize: 11, fontFamily: 'inherit' }}>{formatKES(receipt.vatTotal)}</Typography>
      </Stack>
      {receipt.discountTotal > 0 && (
        <Stack direction="row" justifyContent="space-between">
          <Typography sx={{ fontSize: 11, fontFamily: 'inherit' }}>Discount</Typography>
          <Typography sx={{ fontSize: 11, fontFamily: 'inherit' }}>-{formatKES(receipt.discountTotal)}</Typography>
        </Stack>
      )}

      <Divider sx={{ my: 1 }} />

      <Stack direction="row" justifyContent="space-between">
        <Typography sx={{ fontSize: 14, fontFamily: 'inherit', fontWeight: 800 }}>TOTAL</Typography>
        <Typography sx={{ fontSize: 14, fontFamily: 'inherit', fontWeight: 800 }}>{formatKES(receipt.grandTotal)}</Typography>
      </Stack>

      {receipt.paymentMethod && (
        <>
          <Divider sx={{ my: 1, borderStyle: 'dashed' }} />
          <Stack direction="row" justifyContent="space-between">
            <Typography sx={{ fontSize: 11, fontFamily: 'inherit' }}>Payment</Typography>
            <Typography sx={{ fontSize: 11, fontFamily: 'inherit' }}>{receipt.paymentMethod}</Typography>
          </Stack>
          {receipt.amountTendered != null && (
            <Stack direction="row" justifyContent="space-between">
              <Typography sx={{ fontSize: 11, fontFamily: 'inherit' }}>Tendered</Typography>
              <Typography sx={{ fontSize: 11, fontFamily: 'inherit' }}>{formatKES(receipt.amountTendered)}</Typography>
            </Stack>
          )}
          {receipt.change != null && receipt.change > 0 && (
            <Stack direction="row" justifyContent="space-between">
              <Typography sx={{ fontSize: 11, fontFamily: 'inherit' }}>Change</Typography>
              <Typography sx={{ fontSize: 11, fontFamily: 'inherit' }}>{formatKES(receipt.change)}</Typography>
            </Stack>
          )}
        </>
      )}

      <Divider sx={{ my: 1, borderStyle: 'dashed' }} />

      <Box sx={{ textAlign: 'center' }}>
        <Typography sx={{ fontSize: 10, fontFamily: 'inherit' }}>
          Thank you for shopping with us!
        </Typography>
        <Typography sx={{ fontSize: 10, fontFamily: 'inherit', mt: 0.5 }}>
          Powered by DukaPoS
        </Typography>
      </Box>
    </Box>
  );
});

ReceiptPreview.displayName = 'ReceiptPreview';

export default ReceiptPreview;
