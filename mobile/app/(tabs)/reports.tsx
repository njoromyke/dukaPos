import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores';
import { reportsApi, expensesApi } from '@/lib/api';
import ScreenHeader from '@/components/ui/ScreenHeader';
import StatCard from '@/components/ui/StatCard';
import DProgressBar from '@/components/ui/DProgressBar';
import FeatureUpgradeHint from '@/components/FeatureUpgradeHint';
import { useAppTheme } from '@/lib/theme';

interface DailySummary {
  totalSales: number;
  revenue: number;
  averageBasket: number;
  topPaymentMethod: string;
}

interface TopProduct {
  productName: string;
  revenue: number;
  quantity: number;
}

interface PaymentBreakdown {
  cash: number;
  mpesa: number;
  total: number;
}

interface ExpenseSummary {
  totalAmount: number;
  count: number;
  byCategory: { category: string; total: number; count: number }[];
}

export default function ReportsScreen() {
  const { colors } = useAppTheme();
  const auth = useAuthStore();
  const branchId = auth.user?.branchId || '';
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const [date, setDate] = useState(today);
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [payments, setPayments] = useState<PaymentBreakdown | null>(null);
  const [expenseSummary, setExpenseSummary] = useState<ExpenseSummary | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');

  const formatKES = (n: number) => `KES ${n.toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;

  const loadData = useCallback(async () => {
    if (!branchId) {
      setLoadError('No branch is assigned to this account. Select a branch and try again.');
      return;
    }
    setLoadError('');
    const results = await Promise.allSettled([
      reportsApi.getDailySummary(branchId, date),
      reportsApi.getTopProducts(branchId, date, date, 5),
      reportsApi.getPaymentBreakdown(branchId, date, date),
      expensesApi.summary(branchId, date, date),
    ]);
    const [sumResult, topResult, paymentResult, expenseResult] = results;

    if (sumResult.status === 'fulfilled') {
      const value = sumResult.value.data;
      const cash = Number(value.cashTotal ?? value.CashTotal ?? 0);
      const mpesa = Number(value.mpesaTotal ?? value.MpesaTotal ?? 0);
      setSummary({
        totalSales: Number(value.totalSales ?? value.TotalSales ?? 0),
        revenue: Number(value.totalRevenue ?? value.TotalRevenue ?? value.revenue ?? value.Revenue ?? 0),
        averageBasket: Number(value.averageBasket ?? value.AverageBasket ?? 0),
        topPaymentMethod: cash === 0 && mpesa === 0 ? '--' : cash >= mpesa ? 'Cash' : 'M-Pesa',
      });
    } else {
      setSummary(null);
    }

    if (topResult.status === 'fulfilled') {
      const values = topResult.value.data;
      setTopProducts((Array.isArray(values) ? values : []).map((product: any) => ({
        productName: product.productName ?? product.ProductName ?? 'Product',
        revenue: Number(product.revenue ?? product.Revenue ?? 0),
        quantity: Number(product.quantitySold ?? product.QuantitySold ?? product.quantity ?? 0),
      })));
    } else {
      setTopProducts([]);
    }

    if (paymentResult.status === 'fulfilled') {
      const values = Array.isArray(paymentResult.value.data) ? paymentResult.value.data : [];
      const breakdown = values.reduce((totals: PaymentBreakdown, item: any) => {
        const method = String(item.method ?? item.Method ?? '').toLowerCase();
        const amt = Number(item.total ?? item.Total ?? 0);
        if (method.includes('cash')) totals.cash += amt;
        if (method.includes('mpesa') || method.includes('m-pesa')) totals.mpesa += amt;
        totals.total += amt;
        return totals;
      }, { cash: 0, mpesa: 0, total: 0 });
      setPayments(breakdown);
    } else {
      setPayments(null);
    }

    if (expenseResult.status === 'fulfilled') {
      const value = expenseResult.value.data;
      setExpenseSummary({
        totalAmount: Number(value.totalAmount ?? value.TotalAmount ?? 0),
        count: Number(value.count ?? value.Count ?? 0),
        byCategory: value.byCategory ?? value.ByCategory ?? [],
      });
    } else {
      setExpenseSummary(null);
    }

    if (results.slice(0, 3).every((result) => result.status === 'rejected')) {
      const failure = results[0].status === 'rejected' ? results[0].reason : null;
      const status = failure?.response?.status;
      setLoadError(status === 403
        ? 'Your account cannot view reports for this branch.'
        : failure?.response?.data?.message || 'Could not load reports. Pull down to retry.');
    }
  }, [branchId, date]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const changeDate = (offset: number) => {
    const [year, month, day] = date.split('-').map(Number);
    const d = new Date(year, month - 1, day + offset);
    const next = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (next <= today) setDate(next);
  };

  const isToday = date === today;
  const maxRevenue = topProducts.length > 0 ? Math.max(...topProducts.map((p) => p.revenue)) : 1;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title="Reports"
        rightAction={
          <Pressable onPress={() => router.push('/sales-history')} style={[styles.historyBtn, { backgroundColor: colors.primaryLight }]}>
            <MaterialCommunityIcons name="history" size={18} color={colors.primary} />
            <Text style={[styles.historyText, { color: colors.primary }]}>History</Text>
          </Pressable>
        }
      />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {loadError ? <Text style={[styles.loadError, { color: colors.danger }]}>{loadError}</Text> : null}

        <View style={styles.dateRow}>
          <Pressable onPress={() => changeDate(-1)} style={[styles.dateBtn, { backgroundColor: colors.surface }]}>
            <MaterialCommunityIcons name="chevron-left" size={22} color={colors.textSecondary} />
          </Pressable>
          <View style={styles.dateCenter}>
            <Text style={[styles.dateText, { color: colors.text }]}>
              {new Date(date).toLocaleDateString('en-KE', {
                weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
              })}
            </Text>
            {isToday && <View style={[styles.todayDot, { backgroundColor: colors.primary }]} />}
          </View>
          <Pressable
            onPress={() => changeDate(1)}
            style={[styles.dateBtn, { backgroundColor: colors.surface }, isToday && { opacity: 0.3 }]}
            disabled={isToday}
          >
            <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textSecondary} />
          </Pressable>
        </View>

        <View style={styles.statsGrid}>
          <StatCard label="Total Sales" value={summary?.totalSales?.toString() || '0'} icon="receipt" color={colors.primary} bgColor={colors.primaryLight} delay={100} />
          <StatCard label="Revenue" value={formatKES(summary?.revenue || 0)} icon="cash-multiple" color={colors.secondary} bgColor={colors.secondaryLight} delay={150} />
          <StatCard label="Avg Basket" value={formatKES(summary?.averageBasket || 0)} icon="cart-outline" color="#8B5CF6" bgColor="#EDE9FE" delay={200} />
          <StatCard label="Top Method" value={summary?.topPaymentMethod || '--'} icon="credit-card-outline" color={colors.accent} bgColor={colors.accentLight} delay={250} />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Top Products</Text>
          {auth.features.length > 0 && !auth.features.includes('top_products_reports') ? (
            <FeatureUpgradeHint feature="top_products_reports" label="Top products report" />
          ) : topProducts.length === 0 ? (
            <Text style={[styles.noData, { color: colors.textSecondary }]}>No data for this date</Text>
          ) : (
            topProducts.map((p, i) => (
              <View key={i} style={styles.productRow}>
                <View style={styles.productInfo}>
                  <Text style={[styles.productRank, { backgroundColor: colors.primaryLight, color: colors.primary }]}>{i + 1}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.productName, { color: colors.text }]}>{p.productName}</Text>
                    <Text style={[styles.productQty, { color: colors.textSecondary }]}>{p.quantity} sold</Text>
                  </View>
                  <Text style={[styles.productRev, { color: colors.primary }]}>{formatKES(p.revenue)}</Text>
                </View>
                <DProgressBar progress={p.revenue / maxRevenue} color={colors.primary} />
              </View>
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Payment Breakdown</Text>
          {payments && payments.total > 0 ? (
            <View style={[styles.paymentsCard, { backgroundColor: colors.surface }]}>
              <View style={styles.paymentRow}>
                <View style={[styles.paymentDot, { backgroundColor: colors.secondary }]} />
                <Text style={[styles.paymentLabel, { color: colors.textSecondary }]}>Cash</Text>
                <Text style={[styles.paymentValue, { color: colors.text }]}>{formatKES(payments.cash)}</Text>
              </View>
              <DProgressBar progress={payments.cash / payments.total} color={colors.secondary} />
              <View style={[styles.paymentRow, { marginTop: 14 }]}>
                <View style={[styles.paymentDot, { backgroundColor: colors.accent }]} />
                <Text style={[styles.paymentLabel, { color: colors.textSecondary }]}>M-Pesa</Text>
                <Text style={[styles.paymentValue, { color: colors.text }]}>{formatKES(payments.mpesa)}</Text>
              </View>
              <DProgressBar progress={payments.mpesa / payments.total} color={colors.accent} />
            </View>
          ) : (
            <Text style={[styles.noData, { color: colors.textSecondary }]}>No payments for this date</Text>
          )}
        </View>

        {expenseSummary && expenseSummary.count > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Expenses</Text>
            <View style={[styles.expenseCard, { backgroundColor: colors.surface }]}>
              <View style={styles.paymentRow}>
                <Text style={[styles.paymentLabel, { color: colors.textSecondary }]}>Total</Text>
                <Text style={[styles.paymentValue, { color: colors.danger }]}>
                  {formatKES(expenseSummary.totalAmount)}
                </Text>
              </View>
              <Text style={[styles.expenseCount, { color: colors.textSecondary }]}>
                {expenseSummary.count} transaction{expenseSummary.count !== 1 ? 's' : ''}
              </Text>
              <View style={styles.expenseTags}>
                {expenseSummary.byCategory.map((cat) => (
                  <View key={cat.category} style={[styles.expenseTag, { backgroundColor: colors.border }]}>
                    <Text style={[styles.expenseTagText, { color: colors.textSecondary }]}>
                      {cat.category}: {formatKES(cat.total)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  historyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
  },
  historyText: { fontSize: 13, fontWeight: '600' },
  dateRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 16, paddingVertical: 16,
  },
  dateBtn: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  dateCenter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dateText: { fontSize: 15, fontWeight: '700' },
  todayDot: { width: 6, height: 6, borderRadius: 3 },
  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 12,
    paddingHorizontal: 16,
  },
  section: { paddingHorizontal: 16, paddingTop: 24 },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 14 },
  noData: { fontSize: 14 },
  loadError: { marginHorizontal: 16, marginTop: 12, fontSize: 13 },
  productRow: { marginBottom: 16 },
  productInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  productRank: {
    width: 24, height: 24, borderRadius: 8,
    textAlign: 'center',
    lineHeight: 24, fontSize: 12, fontWeight: '800',
    overflow: 'hidden',
  },
  productName: { fontSize: 14, fontWeight: '600' },
  productQty: { fontSize: 12 },
  productRev: { fontSize: 14, fontWeight: '800' },
  paymentsCard: {
    borderRadius: 16, padding: 16,
  },
  paymentRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  paymentDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  paymentLabel: { flex: 1, fontSize: 14 },
  paymentValue: { fontSize: 14, fontWeight: '800' },
  expenseCard: {
    borderRadius: 16, padding: 16,
  },
  expenseCount: { fontSize: 12, marginBottom: 10 },
  expenseTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  expenseTag: {
    borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  expenseTagText: { fontSize: 12, fontWeight: '600' },
});
