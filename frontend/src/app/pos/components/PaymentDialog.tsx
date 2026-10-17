'use client';

import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
  ToggleButtonGroup, ToggleButton, Typography, Box, Chip, Alert, Stack,
  CircularProgress, Paper,
} from '@mui/material';
import MoneyIcon from '@mui/icons-material/Money';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';
import { paymentsApi } from '@/lib/api';

interface Sale {
  id: string | null;
  grandTotal: number;
  saleNumber: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  sale: Sale | null;
  onComplete: () => void;
}

const formatKES = (n: number) => `KES ${n.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;

export default function PaymentDialog({ open, onClose, sale, onComplete }: Props) {
  const [method, setMethod] = useState<'cash' | 'mpesa'>('cash');
  const [cashAmount, setCashAmount] = useState('');
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!sale) return null;

  const quickAmounts = [100, 200, 500, 1000, 2000, 5000];
  const tendered = parseFloat(cashAmount) || 0;
  const change = tendered - sale.grandTotal;

  const handleCash = async () => {
    if (tendered < sale.grandTotal) {
      setError('Tendered amount is less than the total');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await paymentsApi.recordCash(sale.id!, tendered);
      setSuccess(`Payment complete. Change: ${formatKES(res.data.change)}`);
      setTimeout(() => {
        setSuccess('');
        setCashAmount('');
        onComplete();
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Payment failed');
    }
    setLoading(false);
  };

  const handleMpesa = async () => {
    if (!mpesaPhone || mpesaPhone.length < 10) {
      setError('Enter a valid phone number');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await paymentsApi.initiateMpesa(sale.id!, mpesaPhone, sale.grandTotal);
      setSuccess('STK Push sent. Customer should check their phone.');
    } catch (err: any) {
      setError(err.response?.data?.message || 'M-Pesa request failed');
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Payment
        <Typography variant="h6" color="primary" sx={{ fontWeight: 800 }}>
          {formatKES(sale.grandTotal)}
        </Typography>
      </DialogTitle>

      <DialogContent>
        <ToggleButtonGroup
          value={method}
          exclusive
          onChange={(_, v) => v && setMethod(v)}
          fullWidth
          sx={{ mb: 2 }}
        >
          <ToggleButton value="cash"><MoneyIcon sx={{ mr: 1 }} /> Cash</ToggleButton>
          <ToggleButton value="mpesa"><PhoneAndroidIcon sx={{ mr: 1 }} /> M-Pesa</ToggleButton>
        </ToggleButtonGroup>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        {method === 'cash' && (
          <>
            <TextField
              label="Amount tendered (KES)"
              type="number"
              fullWidth
              value={cashAmount}
              onChange={(e) => { setCashAmount(e.target.value); setError(''); }}
              autoFocus
              sx={{ mb: 2 }}
            />
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
              {quickAmounts.map((amt) => (
                <Chip key={amt} label={amt} onClick={() => setCashAmount(String(amt))} />
              ))}
              <Chip label="Exact" color="primary" onClick={() => setCashAmount(String(sale.grandTotal))} />
            </Box>
            {change >= 0 && cashAmount !== '' && (
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'success.light', borderRadius: 2, mb: 2 }}>
                <Typography variant="body2" color="success.dark">Change</Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, color: 'success.dark' }}>
                  {formatKES(change)}
                </Typography>
              </Paper>
            )}
          </>
        )}

        {method === 'mpesa' && (
          <>
            <TextField
              label="M-Pesa phone number"
              placeholder="0712345678"
              fullWidth
              value={mpesaPhone}
              onChange={(e) => { setMpesaPhone(e.target.value); setError(''); }}
              autoFocus
              sx={{ mb: 2 }}
            />
            <Typography variant="body2" color="text.secondary">
              An STK push will be sent to this number. The customer approves payment on their phone.
            </Typography>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        {method === 'cash' ? (
          <Button
            variant="contained"
            onClick={handleCash}
            disabled={loading || !cashAmount || tendered < sale.grandTotal}
            startIcon={loading ? <CircularProgress size={18} /> : undefined}
          >
            Complete cash payment
          </Button>
        ) : (
          <Button
            variant="contained"
            color="success"
            onClick={handleMpesa}
            disabled={loading || !mpesaPhone || mpesaPhone.length < 10}
            startIcon={loading ? <CircularProgress size={18} /> : <PhoneAndroidIcon />}
          >
            Send STK Push
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
