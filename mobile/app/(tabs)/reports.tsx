import { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, Pressable } from 'react-native';
import { Text, Button, ProgressBar, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores';
import { reportsApi, expensesApi } from '@/lib/api';
import ScreenHeader from '@/components/ui/ScreenHeader';
import StatCard from '@/components/ui/StatCard';
import { Colors } from '@/constants/Colors';

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
  const auth = useAuthStore();
  const branchId = auth.user?.branchId || '';
  const today = new Date().toISOString().split('T')[0];

  const [date, setDate] = useState(today);
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [payments, setPayments] = useState<PaymentBreakdown | null>(null);
  const [expenseSummary, setExpenseSummary] = useState<ExpenseSummary | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const formatKES = (n: number) => `KES ${n.toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;

  const loadData = useCallback(async () => {
    try {
      const [sumRes, topRes, payRes, expRes] = await Promise.all([
        reportsApi.getDailySummary(branchId, date),
        reportsApi.getTopProducts(branchId, date, date, 5),
        reportsApi.getPaymentBreakdown(branchId, date, date),
        expensesApi.summary(branchId, date, date),
      ]);
      setSummary(sumRes.data);
      setTopProducts(topRes.data || []);
      setPayments(payRes.data);
      setExpenseSummary(expRes.data);
    } catch {}
  }, [branchId, date]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const changeDate = (offset: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + offset);
    if (d <= new Date()) setDate(d.toISOString().split('T')[0]);
  };

  const isToday = date === today;
  const maxRevenue = topProducts.length > 0 ? Math.max(...topProducts.map((p) => p.revenue)) : 1;

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Reports"
        rightAction={
          <Pressable onPress={() => router.push('/sales-history')} style={styles.historyBtn}>
            <MaterialCommunityIcons name="history" size={18} color={Colors.light.primary} />
            <Text style={styles.historyText}>History</Text>
          </Pressable>
        }
      />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Date picker */}
        <Animated.View entering={FadeIn.duration(300)} style={styles.dateRow}>
          <Pressable onPress={() => changeDate(-1)} style={styles.dateBtn}>
            <MaterialCommunityIcons name="chevron-left" size={22} color="#64748B" />
          </Pressable>
          <View style={styles.dateCenter}>
            <Text style={styles.dateText}>
              {new Date(date).toLocaleDateString('en-KE', {
                weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
              })}
            </Text>
            {isToday && <View style={styles.todayDot} />}
          </View>
          <Pressable
            onPress={() => changeDate(1)}
            style={[styles.dateBtn, isToday && { opacity: 0.3 }]}
            disabled={isToday}
          >
            <MaterialCommunityIcons name="chevron-right" size={22} color="#64748B" />
          </Pressable>
        </Animated.View>

        {/* Summary stats */}
        <View style={styles.statsGrid}>
          <StatCard
            label="Total Sales" value={summary?.totalSales?.toString() || '0'}
            icon="receipt" color={Colors.light.primary} bgColor={Colors.light.primaryLight}
            delay={100}
          />
          <StatCard
            label="Revenue" value={formatKES(summary?.revenue || 0)}
            icon="cash-multiple" color={Colors.light.secondary} bgColor={Colors.light.secondaryLight}
            delay={150}
          />
          <StatCard
            label="Avg Basket" value={formatKES(summary?.averageBasket || 0)}
            icon="cart-outline" color="#8B5CF6" bgColor="#EDE9FE"
            delay={200}
          />
          <StatCard
            label="Top Method" value={summary?.topPaymentMethod || '--'}
            icon="credit-card-outline" color={Colors.light.accent} bgColor={Colors.light.accentLight}
            delay={250}
          />
        </View>

        {/* Top products */}
        <Animated.View entering={FadeInUp.delay(300).springify()} style={styles.section}>
          <Text style={styles.sectionTitle}>Top Products</Text>
          {topProducts.length === 0 ? (
            <Text style={styles.noData}>No data for this date</Text>
          ) : (
            topProducts.map((p, i) => (
              <View key={i} style={styles.productRow}>
                <View style={styles.productInfo}>
                  <Text style={styles.productRank}>{i + 1}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.productName}>{p.productName}</Text>
                    <Text style={styles.productQty}>{p.quantity} sold</Text>
                  </View>
                  <Text style={styles.productRev}>{formatKES(p.revenue)}</Text>
                </View>
                <ProgressBar
                  progress={p.revenue / maxRevenue}
                  color={Colors.light.primary}
                  style={styles.progressBar}
                />
              </View>
            ))
          )}
        </Animated.View>

        {/* Payments */}
        <Animated.View entering={FadeInUp.delay(400).springify()} style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Breakdown</Text>
          {payments && payments.total > 0 ? (
            <View style={styles.paymentsCard}>
              <View style={styles.paymentRow}>
                <View style={[styles.paymentDot, { backgroundColor: Colors.light.secondary }]} />
                <Text style={styles.paymentLabel}>Cash</Text>
                <Text style={styles.paymentValue}>{formatKES(payments.cash)}</Text>
              </View>
              <ProgressBar
                progress={payments.cash / payments.total}
                color={Colors.light.secondary}
                style={styles.progressBar}
              />
              <View style={[styles.paymentRow, { marginTop: 14 }]}>
                <View style={[styles.paymentDot, { backgroundColor: Colors.light.accent }]} />
                <Text style={styles.paymentLabel}>M-Pesa</Text>
                <Text style={styles.paymentValue}>{formatKES(payments.mpesa)}</Text>
              </View>
              <ProgressBar
                progress={payments.mpesa / payments.total}
                color={Colors.light.accent}
                style={styles.progressBar}
              />
            </View>
          ) : (
            <Text style={styles.noData}>No payments for this date</Text>
          )}
        </Animated.View>

        {/* Expenses */}
        {expenseSummary && expenseSummary.count > 0 && (
          <Animated.View entering={FadeInUp.delay(500).springify()} style={styles.section}>
            <Text style={styles.sectionTitle}>Expenses</Text>
            <View style={styles.expenseCard}>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Total</Text>
                <Text style={[styles.paymentValue, { color: Colors.light.danger }]}>
                  {formatKES(expenseSummary.totalAmount)}
                </Text>
              </View>
              <Text style={styles.expenseCount}>
                {expenseSummary.count} transaction{expenseSummary.count !== 1 ? 's' : ''}
              </Text>
              <View style={styles.expenseTags}>
                {expenseSummary.byCategory.map((cat) => (
                  <View key={cat.category} style={styles.expenseTag}>
                    <Text style={styles.expenseTagText}>
                      {cat.category}: {formatKES(cat.total)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  historyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.light.primaryLight,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
  },
  historyText: { fontSize: 13, fontWeight: '600', color: Colors.light.primary },
  dateRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 16, paddingVertical: 16,
  },
  dateBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  dateCenter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dateText: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  todayDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.light.primary },
  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 12,
    paddingHorizontal: 16,
  },
  section: { paddingHorizontal: 16, paddingTop: 24 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1E293B', marginBottom: 14 },
  noData: { color: '#94A3B8', fontSize: 14 },
  productRow: { marginBottom: 16 },
  productInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  productRank: {
    width: 24, height: 24, borderRadius: 8,
    backgroundColor: Colors.light.primaryLight, textAlign: 'center',
    lineHeight: 24, fontSize: 12, fontWeight: '800', color: Colors.light.primary,
    overflow: 'hidden',
  },
  productName: { fontSize: 14, fontWeight: '600', color: '#334155' },
  productQty: { fontSize: 12, color: '#94A3B8' },
  productRev: { fontSize: 14, fontWeight: '800', color: Colors.light.primary },
  progressBar: { height: 6, borderRadius: 3, backgroundColor: '#F1F5F9' },
  paymentsCard: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  paymentRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  paymentDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  paymentLabel: { flex: 1, fontSize: 14, color: '#64748B' },
  paymentValue: { fontSize: 14, fontWeight: '800', color: '#1E293B' },
  expenseCard: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  expenseCount: { fontSize: 12, color: '#94A3B8', marginBottom: 10 },
  expenseTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  expenseTag: {
    backgroundColor: Colors.light.accentLight, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  expenseTagText: { fontSize: 12, fontWeight: '600', color: '#D97706' },
});
