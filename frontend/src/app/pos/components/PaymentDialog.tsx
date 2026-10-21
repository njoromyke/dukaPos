'use client';

import { useEffect, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
  ToggleButtonGroup, ToggleButton, Typography, Box, Chip, Alert, Stack,
  CircularProgress,
} from '@mui/material';
import { formatCurrency } from '@/lib/utils';
import MoneyIcon from '@mui/icons-material/Money';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { paymentsApi, receiptApi } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import api from '@/lib/api';
import DFeatureUpgradeHint from '@/components/DFeatureUpgradeHint';

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

export default function PaymentDialog({ open, onClose, sale, onComplete }: Props) {
  const auth = useAuthStore();
  const [method, setMethod] = useState<'cash' | 'mpesa'>('cash');
  const [cashAmount, setCashAmount] = useState('');
  const [denominationCounts, setDenominationCounts] = useState<Record<number, number>>({});
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [mpesaEnabled, setMpesaEnabled] = useState(true);

  useEffect(() => {
    if (!open) return;
    let active = true;
    api.get('/api/subscriptions/current').then((response) => {
      if (!active) return;
      const features = response.data?.features as string[] | undefined;
      if (features?.length) setMpesaEnabled(features.includes('mpesa_stk_push'));
    }).catch(() => {});
    return () => { active = false; };
  }, [open]);

  if (!sale) return null;

  const printReceipt = async (paymentMethod: string, amountPaid: number, change: number, mpesaRef?: string) => {
    try {
      await receiptApi.generate({
        saleId: sale.id!,
        businessName: 'DukaPoS',
        branchName: auth.user?.branchName || 'Branch',
        paymentMethod,
        amountPaid,
        change,
        mpesaRef,
      });
      const printWindow = window.open('', '_blank', 'width=320,height=600');
      if (printWindow) {
        printWindow.document.write(`<!DOCTYPE html><html><head><title>Receipt</title>
<style>body{font-family:'Courier New',monospace;font-size:12px;width:280px;margin:0 auto;padding:10px}
.c{text-align:center}.b{font-weight:bold}.d{border-top:1px dashed #000;margin:8px 0}
.r{display:flex;justify-content:space-between}h2{margin:0;font-size:16px}
@media print{body{width:100%}}</style></head><body>
<div class="c"><h2 class="b">DukaPoS</h2><div>${auth.user?.branchName || 'Branch'}</div></div>
<div class="d"></div>
<div>Receipt: ${sale.saleNumber}</div>
<div>Date: ${new Date().toLocaleString()}</div>
<div class="d"></div>
<div class="r"><span>Total:</span><span class="b">KES ${sale.grandTotal.toFixed(2)}</span></div>
<div class="r"><span>Payment:</span><span>${paymentMethod}</span></div>
<div class="r"><span>Amount:</span><span>KES ${amountPaid.toFixed(2)}</span></div>
${change > 0 ? `<div class="r"><span>Change:</span><span>KES ${change.toFixed(2)}</span></div>` : ''}
${mpesaRef ? `<div class="r"><span>M-Pesa Ref:</span><span>${mpesaRef}</span></div>` : ''}
<div class="d"></div>
<div class="c">Thank you for shopping with us!</div>
<div class="c" style="margin-top:4px;font-size:10px">Powered by DukaPoS</div>
</body></html>`);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
      }
    } catch { /* receipt generation failed, don't block the flow */ }
  };

  const quickAmounts = [100, 200, 500, 1000, 2000, 5000];
  const denominations = [50, 100, 200, 500, 1000, 2000, 5000];
  const tendered = parseFloat(cashAmount) || 0;
  const change = tendered - sale.grandTotal;
  const addDenomination = (value: number) => {
    setDenominationCounts((counts) => ({ ...counts, [value]: (counts[value] || 0) + 1 }));
    setCashAmount((current) => String((Number(current) || 0) + value));
    setError('');
  };
  const resetCashTally = () => { setCashAmount(''); setDenominationCounts({}); };

  const handleCash = async () => {
    if (tendered < sale.grandTotal) {
      setError('Tendered amount is less than the total');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await paymentsApi.recordCash(sale.id!, tendered);
      setSuccess(`Payment complete. Change: ${formatCurrency(res.data.change)}`);
      printReceipt('Cash', tendered, res.data.change);
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
      const res = await paymentsApi.initiateMpesa(sale.id!, mpesaPhone, sale.grandTotal);
      setSuccess('STK Push sent. Customer should check their phone.');
      if (res.data?.mpesaReceiptNumber) {
        printReceipt('M-Pesa', sale.grandTotal, 0, res.data.mpesaReceiptNumber);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'M-Pesa request failed');
    }
    setLoading(false);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 4,
          border: '1px solid #E2E8F0',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.15)',
        },
      }}
    >
      <DialogTitle component="div" sx={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: '1px solid #F1F5F9', pb: 2,
      }}>
        <Typography sx={{ fontWeight: 800, fontSize: '1.125rem', color: '#0F172A' }}>Payment</Typography>
        <Box sx={{
          px: 2, py: 0.75, borderRadius: 2.5,
          bgcolor: '#ECFDF5', border: '1px solid #A7F3D0',
        }}>
          <Typography sx={{ fontWeight: 800, fontSize: '1.125rem', color: '#059669' }}>
            {formatCurrency(sale.grandTotal)}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: '16px !important' }}>
        <ToggleButtonGroup
          value={method}
          exclusive
          onChange={(_, v) => v && setMethod(v)}
          fullWidth
          sx={{
            mb: 2.5, gap: 1,
            '& .MuiToggleButtonGroup-grouped': { border: 'none' },
            '& .MuiToggleButton-root': {
              borderRadius: '10px !important',
              border: '1px solid #E2E8F0 !important',
              fontWeight: 600, fontSize: '0.8125rem', py: 1.25,
              textTransform: 'none', color: '#64748B',
              '&.Mui-selected': {
                bgcolor: '#ECFDF5',
                borderColor: '#059669 !important',
                color: '#059669',
              },
            },
          }}
        >
          <ToggleButton value="cash"><MoneyIcon sx={{ mr: 1, fontSize: 20 }} /> Cash</ToggleButton>
          {mpesaEnabled
            ? <ToggleButton value="mpesa"><PhoneAndroidIcon sx={{ mr: 1, fontSize: 20 }} /> M-Pesa</ToggleButton>
            : <DFeatureUpgradeHint feature="mpesa_stk_push" label="M-Pesa STK prompt" />}
        </ToggleButtonGroup>

        {error && (
          <Alert severity="error" sx={{
            mb: 2, borderRadius: 2.5,
            bgcolor: '#FEF2F2', border: '1px solid #FECACA',
          }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert
            severity="success"
            icon={<CheckCircleIcon />}
            sx={{
              mb: 2, borderRadius: 2.5,
              bgcolor: '#ECFDF5', border: '1px solid #A7F3D0',
            }}
          >
            {success}
          </Alert>
        )}

        {method === 'cash' && (
          <>
            <TextField
              label="Amount tendered (KES)"
              type="number"
              fullWidth
              value={cashAmount}
              onChange={(e) => { setCashAmount(e.target.value); setDenominationCounts({}); setError(''); }}
              autoFocus
              sx={{
                mb: 2,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2.5,
                  '&.Mui-focused fieldset': { borderColor: '#059669' },
                },
              }}
            />

            {/* Quick amounts */}
            <Typography sx={{ fontSize: '0.6875rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1 }}>
              Quick select
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 2 }}>
              {quickAmounts.map((amt) => (
                <Chip
                  key={amt}
                  label={formatCurrency(amt)}
                  onClick={() => { setCashAmount(String(amt)); setDenominationCounts({}); }}
                  sx={{
                    fontWeight: 600, fontSize: '0.75rem',
                    bgcolor: '#F1F5F9', color: '#334155',
                    border: '1px solid #E2E8F0',
                    '&:hover': { bgcolor: '#E2E8F0' },
                  }}
                />
              ))}
              <Chip
                label="Exact"
                onClick={() => { setCashAmount(String(sale.grandTotal)); setDenominationCounts({}); }}
                sx={{
                  fontWeight: 700, fontSize: '0.75rem',
                  bgcolor: '#ECFDF5', color: '#059669',
                  border: '1px solid #A7F3D0',
                  '&:hover': { bgcolor: '#D1FAE5' },
                }}
              />
            </Box>

            {/* Denomination counter */}
            <Box sx={{
              p: 2, mb: 2, borderRadius: 2.5,
              border: '1px solid #E2E8F0', bgcolor: '#FAFBFC',
            }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
                <Typography sx={{ fontWeight: 700, fontSize: '0.8125rem', color: '#0F172A' }}>Count cash</Typography>
                <Button
                  size="small"
                  onClick={resetCashTally}
                  disabled={!cashAmount}
                  sx={{ fontSize: '0.7rem', color: '#64748B', minWidth: 0 }}
                >
                  Clear
                </Button>
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0.75 }}>
                {denominations.map((value) => (
                  <Button
                    key={value}
                    variant="outlined"
                    size="small"
                    onClick={() => addDenomination(value)}
                    sx={{
                      fontSize: '0.75rem', fontWeight: 700, py: 0.75,
                      borderColor: '#E2E8F0', color: '#334155',
                      borderRadius: 2,
                      '&:hover': { borderColor: '#059669', bgcolor: '#ECFDF5', color: '#059669' },
                    }}
                  >
                    +{value >= 1000 ? `${value / 1000}K` : value}
                  </Button>
                ))}
              </Box>
              {!!Object.keys(denominationCounts).length && (
                <Typography sx={{ fontSize: '0.7rem', color: '#94A3B8', mt: 1.5 }}>
                  {Object.entries(denominationCounts).filter(([, count]) => count > 0).sort(([a], [b]) => Number(b) - Number(a)).map(([value, count]) => `${count} × ${value}`).join('  ·  ')}
                </Typography>
              )}
            </Box>

            {/* Change display */}
            {change >= 0 && cashAmount !== '' && (
              <Box sx={{
                p: 2, textAlign: 'center', borderRadius: 2.5, mb: 2,
                bgcolor: '#ECFDF5', border: '1px solid #A7F3D0',
              }}>
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#047857', mb: 0.5 }}>Change due</Typography>
                <Typography sx={{ fontWeight: 800, fontSize: '1.5rem', color: '#059669' }}>
                  {formatCurrency(change)}
                </Typography>
              </Box>
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
              sx={{
                mb: 2,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2.5,
                  '&.Mui-focused fieldset': { borderColor: '#059669' },
                },
              }}
            />
            <Box sx={{
              p: 2, borderRadius: 2.5,
              bgcolor: '#F0F9FF', border: '1px solid #BAE6FD',
            }}>
              <Typography sx={{ fontSize: '0.8125rem', color: '#0369A1', lineHeight: 1.5 }}>
                An STK push will be sent to this number. The customer approves payment on their phone.
              </Typography>
            </Box>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, pt: 1, borderTop: '1px solid #F1F5F9' }}>
        <Button
          onClick={onClose}
          disabled={loading}
          sx={{
            color: '#64748B', borderRadius: 2.5,
            '&:hover': { bgcolor: '#F1F5F9' },
          }}
        >
          Cancel
        </Button>
        {method === 'cash' ? (
          <Button
            variant="contained"
            onClick={handleCash}
            disabled={loading || !cashAmount || tendered < sale.grandTotal}
            startIcon={loading ? <CircularProgress size={18} /> : undefined}
            sx={{
              borderRadius: 2.5, px: 3,
              bgcolor: '#059669', fontWeight: 700,
              boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)',
              '&:hover': { bgcolor: '#047857' },
            }}
          >
            Complete payment
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={handleMpesa}
            disabled={loading || !mpesaPhone || mpesaPhone.length < 10}
            startIcon={loading ? <CircularProgress size={18} /> : <PhoneAndroidIcon />}
            sx={{
              borderRadius: 2.5, px: 3,
              bgcolor: '#059669', fontWeight: 700,
              boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)',
              '&:hover': { bgcolor: '#047857' },
            }}
          >
            Send STK Push
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
