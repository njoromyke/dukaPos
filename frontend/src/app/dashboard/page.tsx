'use client';

import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid2';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import ReceiptIcon from '@mui/icons-material/ReceiptLongOutlined';
import PaymentsIcon from '@mui/icons-material/PaymentsOutlined';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroidOutlined';
import PointOfSaleIcon from '@mui/icons-material/PointOfSaleOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import InventoryIcon from '@mui/icons-material/Inventory2Outlined';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { reportsApi, expensesApi, salesApi, inventoryApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { DStatCard } from '@/components';
import dayjs from 'dayjs';

interface DailySummary {
  totalSales: number;
  totalRevenue: number;
  averageBasket: number;
  topPaymentMethod: string;
  cashTotal: number;
  mpesaTotal: number;
}

interface ExpenseSummary {
  totalAmount: number;
  count: number;
  byCategory: { category: string; total: number; count: number }[];
}

interface SaleSummary {
  id: string; saleNumber: string; status: string; cashierName: string;
  grandTotal: number; paymentMethod?: string; completedAt: string;
}

interface StockAlert {
  productId: string; productName: string; sku: string; unit: string;
  quantity: number; reorderLevel: number;
}

const panelSx = {
  p: { xs: 2, sm: 2.5, md: 3 },
  height: '100%',
  border: '1px solid #E6EAF0',
  borderRadius: 3,
  boxShadow: '0 2px 8px rgba(15, 23, 42, 0.035)',
  bgcolor: '#fff',
};

export default function DashboardPage() {
  const auth = useAuthStore();
  const router = useRouter();
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [expenses, setExpenses] = useState<ExpenseSummary | null>(null);
  const [recentSales, setRecentSales] = useState<SaleSummary[]>([]);
  const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([]);

  useEffect(() => {
    if (!auth.user?.branchId) return;
    const today = dayjs().format('YYYY-MM-DD');
    Promise.all([
      reportsApi.dailySummary(auth.user.branchId),
      expensesApi.summary(auth.user.branchId, today, today),
      salesApi.getHistory(auth.user.branchId, today, today, 1, 5),
      inventoryApi.getStockLevels(auth.user.branchId, { lowStockOnly: true, page: 1, pageSize: 5 }),
    ]).then(([sumRes, expRes, salesRes, stockRes]) => {
      setSummary(sumRes.data);
      setExpenses(expRes.data);
      const salesData = salesRes.data;
      setRecentSales(salesData?.sales ?? salesData?.Sales ?? (Array.isArray(salesData) ? salesData : []));
      const stockData = stockRes.data;
      setStockAlerts(stockData?.stockLevels ?? stockData?.StockLevels ?? stockData?.items ?? stockData?.Items ?? []);
    }).catch(() => {});
  }, [auth.user?.branchId]);

  const revenue = summary?.totalRevenue ?? 0;
  const expenseTotal = expenses?.totalAmount ?? 0;
  const netRevenue = revenue - expenseTotal;
  const cashPct = revenue ? Math.min(100, summary!.cashTotal / revenue * 100) : 0;
  const mpesaPct = revenue ? Math.min(100, summary!.mpesaTotal / revenue * 100) : 0;
  const firstName = auth.user?.fullName?.trim().split(/\s+/)[0] || 'there';

  return (
    <Box sx={{ maxWidth: 1560, mx: 'auto' }}>
      <Box sx={{
        mb: 3, display: 'flex', alignItems: { xs: 'flex-start', sm: 'center' },
        justifyContent: 'space-between', gap: 2, flexWrap: 'wrap',
      }}>
        <Box>
          <Typography sx={{ fontSize: { xs: '1.5rem', md: '1.8rem' }, fontWeight: 750, letterSpacing: '-0.035em', color: '#142033' }}>
            Good {Number(dayjs().format('H')) < 12 ? 'morning' : Number(dayjs().format('H')) < 17 ? 'afternoon' : 'evening'}, {firstName}
          </Typography>
          <Typography sx={{ mt: 0.5, color: '#718096', fontSize: '0.9rem' }}>
            Here’s what’s happening at your store today.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip
            icon={<Box component="span" sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#10B981', ml: '10px !important' }} />}
            label={dayjs().format('ddd, DD MMM YYYY')}
            sx={{ bgcolor: '#fff', border: '1px solid #E6EAF0', color: '#526174', fontWeight: 600, height: 38, borderRadius: 2 }}
          />
          <Button
            variant="contained"
            startIcon={<PointOfSaleIcon />}
            onClick={() => router.push('/pos')}
            sx={{ height: 38, px: 1.8, bgcolor: '#087A58', borderRadius: 2, boxShadow: 'none', '&:hover': { bgcolor: '#066648', boxShadow: 'none' } }}
          >
            Open register
          </Button>
        </Stack>
      </Box>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
          <DStatCard label="Today's sales" value={String(summary?.totalSales ?? 0)} icon={<ReceiptIcon />} color="#1682A5" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
          <DStatCard label="Revenue" value={formatCurrency(revenue)} icon={<TrendingUpIcon />} color="#07845C" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
          <DStatCard label="Expenses" value={formatCurrency(expenseTotal)} icon={<TrendingDownIcon />} color="#D58A18" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, xl: 3 }}>
          <DStatCard label="Net revenue" value={formatCurrency(netRevenue)} icon={<PaymentsIcon />} color={netRevenue >= 0 ? '#07845C' : '#DC2626'} />
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mt: 0.25, alignItems: 'stretch' }}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <Paper sx={panelSx}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, mb: 2.5 }}>
              <Box>
                <Typography sx={{ color: '#172334', fontWeight: 700, fontSize: '1rem' }}>Payment breakdown</Typography>
                <Typography sx={{ color: '#8692A3', mt: 0.4, fontSize: '0.8rem' }}>How customers paid today</Typography>
              </Box>
              {summary?.topPaymentMethod && (
                <Chip label={`Most used · ${summary.topPaymentMethod}`} size="small" sx={{ bgcolor: '#E9F7F1', color: '#087A58', fontWeight: 650, borderRadius: 1.5 }} />
              )}
            </Box>

            {summary ? (
              <>
                <Box sx={{ height: 12, display: 'flex', overflow: 'hidden', borderRadius: 99, bgcolor: '#EDF1F5', mb: 2.5 }}>
                  <Box sx={{ width: `${cashPct}%`, bgcolor: '#2587B8', transition: 'width .35s ease' }} />
                  <Box sx={{ width: `${mpesaPct}%`, bgcolor: '#0B9B70', transition: 'width .35s ease' }} />
                </Box>
                <Grid container spacing={1.5}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <PaymentMethod label="Cash" amount={summary.cashTotal} percent={cashPct} color="#2587B8" icon={<AccountBalanceWalletIcon />} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <PaymentMethod label="M-Pesa" amount={summary.mpesaTotal} percent={mpesaPct} color="#0B9B70" icon={<PhoneAndroidIcon />} />
                  </Grid>
                </Grid>
              </>
            ) : (
              <EmptyState message="Payment data will appear when sales are recorded." loading={!auth.user?.branchId} />
            )}
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, lg: 5 }}>
          <Paper sx={panelSx}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, mb: 2.5 }}>
              <Box>
                <Typography sx={{ color: '#172334', fontWeight: 700, fontSize: '1rem' }}>Expenses</Typography>
                <Typography sx={{ color: '#8692A3', mt: 0.4, fontSize: '0.8rem' }}>Today's recorded spending</Typography>
              </Box>
              <Button size="small" endIcon={<ArrowForwardIcon />} onClick={() => router.push('/dashboard/expenses')} sx={{ color: '#68778A', fontWeight: 600 }}>
                View all
              </Button>
            </Box>

            {expenses && expenses.count > 0 ? (
              <>
                <Box sx={{ p: 2, mb: 1.5, borderRadius: 2, bgcolor: '#FFF8EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                  <Box>
                    <Typography sx={{ color: '#8C682E', fontSize: '0.77rem', fontWeight: 600 }}>Total expenses</Typography>
                    <Typography sx={{ color: '#A96C11', mt: 0.35, fontWeight: 750, fontSize: '1.3rem', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(expenseTotal)}</Typography>
                  </Box>
                  <Chip label={`${expenses.count} ${expenses.count === 1 ? 'entry' : 'entries'}`} size="small" sx={{ bgcolor: '#fff', color: '#936A29', fontWeight: 600 }} />
                </Box>
                <Stack spacing={0.4}>
                  {expenses.byCategory.slice(0, 4).map((cat) => (
                    <Box key={cat.category} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1, borderBottom: '1px solid #F0F2F5', '&:last-child': { borderBottom: 0 } }}>
                      <Typography sx={{ color: '#566477', fontSize: '0.83rem' }}>{cat.category}</Typography>
                      <Typography sx={{ color: '#243247', fontWeight: 650, fontSize: '0.83rem', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(cat.total)}</Typography>
                    </Box>
                  ))}
                </Stack>
              </>
            ) : (
              <EmptyState message={expenses ? 'No expenses recorded today.' : 'Expense summary is loading.'} loading={!expenses} />
            )}
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mt: 0.25, alignItems: 'stretch' }}>
        <Grid size={{ xs: 12, xl: 8 }}>
          <Paper sx={{ ...panelSx, p: 0, overflow: 'hidden' }}>
            <Box sx={{ px: { xs: 2, sm: 2.5, md: 3 }, py: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
              <Box>
                <Typography sx={{ color: '#172334', fontWeight: 700, fontSize: '1rem' }}>Recent sales</Typography>
                <Typography sx={{ color: '#8692A3', mt: 0.35, fontSize: '0.8rem' }}>Latest transactions from this outlet</Typography>
              </Box>
              <Button size="small" endIcon={<ArrowForwardIcon />} onClick={() => router.push('/dashboard/sales/history')} sx={{ color: '#68778A', fontWeight: 600, flexShrink: 0 }}>View sales</Button>
            </Box>
            {recentSales.length ? (
              <Box sx={{ overflowX: 'auto' }}>
                <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
                  <Box component="thead" sx={{ bgcolor: '#F8FAFC' }}>
                    <Box component="tr">
                      {['Sale', 'Time', 'Cashier', 'Payment', 'Amount'].map((label) => <Box component="th" key={label} sx={{ px: 2.5, py: 1.2, color: '#8995A5', textAlign: label === 'Amount' ? 'right' : 'left', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '.045em', textTransform: 'uppercase' }}>{label}</Box>)}
                    </Box>
                  </Box>
                  <Box component="tbody">
                    {recentSales.slice(0, 5).map((sale) => <Box component="tr" key={sale.id} sx={{ '&:not(:last-child) td': { borderBottom: '1px solid #F0F2F5' } }}>
                      <Box component="td" sx={{ px: 2.5, py: 1.45, color: '#28364A', fontSize: '0.82rem', fontWeight: 650 }}>{sale.saleNumber}</Box>
                      <Box component="td" sx={{ px: 2.5, py: 1.45, color: '#657387', fontSize: '0.8rem' }}>{dayjs(sale.completedAt).format('h:mm A')}</Box>
                      <Box component="td" sx={{ px: 2.5, py: 1.45, color: '#657387', fontSize: '0.8rem' }}>{sale.cashierName || '—'}</Box>
                      <Box component="td" sx={{ px: 2.5, py: 1.45 }}><Chip size="small" label={sale.paymentMethod || 'Paid'} sx={{ height: 23, bgcolor: sale.paymentMethod?.toLowerCase().includes('mpesa') ? '#E9F7F1' : '#EDF6FA', color: sale.paymentMethod?.toLowerCase().includes('mpesa') ? '#087A58' : '#297398', fontSize: '0.68rem', fontWeight: 650 }} /></Box>
                      <Box component="td" sx={{ px: 2.5, py: 1.45, textAlign: 'right', color: '#243247', fontSize: '0.82rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(sale.grandTotal)}</Box>
                    </Box>)}
                  </Box>
                </Box>
              </Box>
            ) : <EmptyState message="No sales recorded today." loading={!auth.user?.branchId} />}
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, xl: 4 }}>
          <Paper sx={panelSx}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, mb: 2 }}>
              <Box>
                <Typography sx={{ color: '#172334', fontWeight: 700, fontSize: '1rem' }}>Stock to check</Typography>
                <Typography sx={{ color: '#8692A3', mt: 0.35, fontSize: '0.8rem' }}>At or below reorder level</Typography>
              </Box>
              <Chip icon={<InventoryIcon sx={{ fontSize: '16px !important' }} />} label={stockAlerts.length} size="small" sx={{ bgcolor: stockAlerts.length ? '#FFF5E5' : '#E9F7F1', color: stockAlerts.length ? '#A96C11' : '#087A58', fontWeight: 700 }} />
            </Box>
            {stockAlerts.length ? <Stack spacing={0.25}>
              {stockAlerts.slice(0, 5).map((item) => <Box key={item.productId} sx={{ py: 1.1, display: 'flex', justifyContent: 'space-between', gap: 1.5, borderBottom: '1px solid #F0F2F5', '&:last-child': { borderBottom: 0 } }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography noWrap sx={{ color: '#344257', fontWeight: 600, fontSize: '0.82rem' }}>{item.productName}</Typography>
                  <Typography sx={{ color: '#97A1AF', fontSize: '0.72rem', mt: 0.2 }}>{item.sku}</Typography>
                </Box>
                <Typography sx={{ color: item.quantity <= 0 ? '#C94A4A' : '#A96C11', fontWeight: 700, fontSize: '0.78rem', whiteSpace: 'nowrap', alignSelf: 'center' }}>{item.quantity} / {item.reorderLevel} {item.unit}</Typography>
              </Box>)}
              <Button size="small" endIcon={<ArrowForwardIcon />} onClick={() => router.push('/dashboard/inventory/stock')} sx={{ alignSelf: 'flex-start', mt: 1, color: '#68778A', fontWeight: 600 }}>Manage stock</Button>
            </Stack> : <EmptyState message="No items need reordering." loading={!auth.user?.branchId} />}
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ ...panelSx, mt: 2, p: { xs: 2, sm: 2.5 }, display: 'flex', alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography sx={{ fontWeight: 700, color: '#172334', fontSize: '0.92rem' }}>Need a closer look?</Typography>
          <Typography sx={{ color: '#8692A3', mt: 0.35, fontSize: '0.8rem' }}>Review sales activity and payment performance for more detail.</Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button size="small" endIcon={<ArrowForwardIcon />} onClick={() => router.push('/dashboard/reports/daily')} sx={{ border: '1px solid #E4E9EF', color: '#47566A', borderRadius: 2 }}>Daily report</Button>
          <Button size="small" endIcon={<ArrowForwardIcon />} onClick={() => router.push('/dashboard/reports/payments')} sx={{ border: '1px solid #E4E9EF', color: '#47566A', borderRadius: 2 }}>Payment report</Button>
        </Stack>
      </Paper>
    </Box>
  );
}

function PaymentMethod({ label, amount, percent, color, icon }: { label: string; amount: number; percent: number; color: string; icon: React.ReactNode }) {
  return (
    <Box sx={{ p: 2, borderRadius: 2, bgcolor: '#F7F9FB', minWidth: 0 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 1.25 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color }}>
          {icon}
          <Typography sx={{ fontSize: '0.82rem', fontWeight: 650, color: '#4B596D' }}>{label}</Typography>
        </Box>
        <Typography sx={{ fontSize: '0.76rem', color: '#798697', fontWeight: 600 }}>{percent.toFixed(0)}%</Typography>
      </Box>
      <Typography sx={{ color: '#182437', fontWeight: 750, fontSize: '1.2rem', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(amount)}</Typography>
    </Box>
  );
}

function EmptyState({ message, loading = false }: { message: string; loading?: boolean }) {
  return (
    <Box sx={{ minHeight: 132, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', px: 2 }}>
      <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: '#F1F5F8', mb: 1.2, display: 'grid', placeItems: 'center', color: '#8190A2' }}>
        {loading ? <Box sx={{ width: 15, height: 15, border: '2px solid #CBD5DF', borderTopColor: '#0B9B70', borderRadius: '50%', animation: 'spin 1s linear infinite', '@keyframes spin': { to: { transform: 'rotate(360deg)' } } }} /> : <ReceiptIcon sx={{ fontSize: 19 }} />}
      </Box>
      <Typography sx={{ color: '#8692A3', fontSize: '0.82rem' }}>{message}</Typography>
    </Box>
  );
}
