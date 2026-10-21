'use client';

import { forwardRef } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import { formatCurrency } from '@/lib/utils';

interface LineItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

interface ReceiptProps {
  businessName: string;
  branchName: string;
  branchAddress?: string;
  saleNumber: string;
  timestamp: string;
  cashierName: string;
  lineItems: LineItem[];
  subtotal: number;
  vatTotal: number;
  discountTotal: number;
  grandTotal: number;
  paymentMethod: string;
  amountPaid: number;
  change: number;
  mpesaRef?: string;
}

const mono = { fontFamily: "'Courier New', Courier, monospace" };


const ReceiptPreview = forwardRef<HTMLDivElement, ReceiptProps>(function ReceiptPreview(props, ref) {
  const {
    businessName, branchName, branchAddress, saleNumber, timestamp,
    cashierName, lineItems, subtotal, vatTotal, discountTotal, grandTotal,
    paymentMethod, amountPaid, change, mpesaRef,
  } = props;

  return (
    <Box
      ref={ref}
      sx={{
        width: 300,
        mx: 'auto',
        p: 2,
        bgcolor: '#fff',
        color: '#000',
        ...mono,
        fontSize: 12,
      }}
    >
      <Box textAlign="center" mb={1}>
        <Typography sx={{ ...mono, fontWeight: 800, fontSize: 16 }}>{businessName}</Typography>
        <Typography sx={{ ...mono, fontSize: 12 }}>{branchName}</Typography>
        {branchAddress && <Typography sx={{ ...mono, fontSize: 11 }}>{branchAddress}</Typography>}
      </Box>

      <Divider sx={{ borderStyle: 'dashed', my: 1 }} />

      <Box display="flex" justifyContent="space-between">
        <Typography sx={{ ...mono, fontSize: 11 }}>Receipt: {saleNumber}</Typography>
      </Box>
      <Typography sx={{ ...mono, fontSize: 11 }}>Date: {new Date(timestamp).toLocaleString('en-KE')}</Typography>
      <Typography sx={{ ...mono, fontSize: 11 }}>Cashier: {cashierName}</Typography>

      <Divider sx={{ borderStyle: 'dashed', my: 1 }} />

      <Box display="flex" justifyContent="space-between" mb={0.5}>
        <Typography sx={{ ...mono, fontSize: 11, fontWeight: 700 }}>Item</Typography>
        <Box display="flex" gap={2}>
          <Typography sx={{ ...mono, fontSize: 11, fontWeight: 700 }}>Qty</Typography>
          <Typography sx={{ ...mono, fontSize: 11, fontWeight: 700, minWidth: 60, textAlign: 'right' }}>Total</Typography>
        </Box>
      </Box>

      {lineItems.map((item, i) => (
        <Box key={i} mb={0.5}>
          <Typography sx={{ ...mono, fontSize: 11 }}>{item.productName}</Typography>
          <Box display="flex" justifyContent="space-between">
            <Typography sx={{ ...mono, fontSize: 11, pl: 1 }}>@{item.unitPrice.toFixed(0)}</Typography>
            <Box display="flex" gap={2}>
              <Typography sx={{ ...mono, fontSize: 11 }}>{item.quantity}</Typography>
              <Typography sx={{ ...mono, fontSize: 11, minWidth: 60, textAlign: 'right' }}>{item.lineTotal.toFixed(0)}</Typography>
            </Box>
          </Box>
        </Box>
      ))}

      <Divider sx={{ borderStyle: 'dashed', my: 1 }} />

      <Row label="Subtotal:" value={formatCurrency(subtotal)} />
      <Row label="VAT:" value={formatCurrency(vatTotal)} />
      {discountTotal > 0 && <Row label="Discount:" value={`-${formatCurrency(discountTotal)}`} />}
      <Row label="TOTAL:" value={formatCurrency(grandTotal)} bold />

      <Divider sx={{ borderStyle: 'dashed', my: 1 }} />

      <Row label="Paid via:" value={paymentMethod} />
      <Row label="Amount:" value={formatCurrency(amountPaid)} />
      {change > 0 && <Row label="Change:" value={formatCurrency(change)} />}
      {mpesaRef && <Row label="M-Pesa Ref:" value={mpesaRef} />}

      <Divider sx={{ borderStyle: 'dashed', my: 1 }} />

      <Box textAlign="center" mt={1}>
        <Typography sx={{ ...mono, fontSize: 11 }}>Thank you for shopping with us!</Typography>
        <Typography sx={{ ...mono, fontSize: 10, mt: 0.5 }}>Powered by DukaPoS</Typography>
      </Box>
    </Box>
  );
});

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <Box display="flex" justifyContent="space-between">
      <Typography sx={{ ...mono, fontSize: 11, fontWeight: bold ? 700 : 400 }}>{label}</Typography>
      <Typography sx={{ ...mono, fontSize: 11, fontWeight: bold ? 700 : 400 }}>{value}</Typography>
    </Box>
  );
}

export default ReceiptPreview;
