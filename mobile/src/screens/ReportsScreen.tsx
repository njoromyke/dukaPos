import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import {
  Text, Card, Button, Divider, ProgressBar, useTheme,
} from 'react-native-paper';
import { useAuthStore } from '../stores';
import { reportsApi, expensesApi } from '../lib/api';

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

export default function ReportsScreen({ navigation }: any) {
  const theme = useTheme();
  const auth = useAuthStore();
  const branchId = auth.user?.branchId || '';

  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [payments, setPayments] = useState<PaymentBreakdown | null>(null);
  const [expenseSummary, setExpenseSummary] = useState<ExpenseSummary | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const formatKES = (n: number) => `KES ${n.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;

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

  const summaryCards = [
    { label: 'Total Sales', value: summary?.totalSales?.toString() || '0', icon: 'receipt' },
    { label: 'Revenue', value: formatKES(summary?.revenue || 0), icon: 'cash-multiple' },
    { label: 'Avg Basket', value: formatKES(summary?.averageBasket || 0), icon: 'cart-outline' },
    { label: 'Top Method', value: summary?.topPaymentMethod || '—', icon: 'credit-card-outline' },
  ];

  const maxRevenue = topProducts?.length > 0 ? Math.max(...topProducts?.map((p) => p.revenue)) : 1;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={{ paddingBottom: 24 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.headerBar}>
        <Text variant="titleLarge" style={{ fontWeight: '800', color: theme.colors.primary }}>
          Reports
        </Text>
        <View style={{ flex: 1 }} />
        <Button icon="history" compact onPress={() => navigation.navigate('SalesHistory')}>
          Sales history
        </Button>
      </View>

      {/* Date picker row */}
      <View style={styles.dateRow}>
        <Button icon="chevron-left" compact onPress={() => changeDate(-1)}>Prev</Button>
        <Text variant="titleSmall" style={{ fontWeight: '700' }}>
          {new Date(date).toLocaleDateString('en-KE', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
        </Text>
        <Button icon="chevron-right" compact onPress={() => changeDate(1)} disabled={isToday}>
          Next
        </Button>
      </View>

      {/* Summary cards */}
      <View style={styles.cardsGrid}>
        {summaryCards.map((card, i) => (
          <Card key={i} mode="outlined" style={styles.summaryCard}>
            <Card.Content style={{ alignItems: 'center', gap: 4 }}>
              <Text variant="labelSmall" style={{ color: theme.colors.outline }}>{card.label}</Text>
              <Text variant="titleMedium" style={{ fontWeight: '800', color: theme.colors.primary }}
                numberOfLines={1} adjustsFontSizeToFit>
                {card.value}
              </Text>
            </Card.Content>
          </Card>
        ))}
      </View>

      {/* Top products */}
      <View style={styles.section}>
        <Text variant="titleSmall" style={{ fontWeight: '700', marginBottom: 12 }}>
          Top 5 Products by Revenue
        </Text>
        {topProducts?.length === 0 ? (
          <Text variant="bodySmall" style={{ color: theme.colors.outline }}>No data for this date</Text>
        ) : (
          topProducts?.map((p, i) => (
            <View key={i} style={styles.productRow}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text variant="bodyMedium" style={{ fontWeight: '600' }}>{p.productName}</Text>
                  <Text variant="bodySmall" style={{ fontWeight: '700', color: theme.colors.primary }}>
                    {formatKES(p.revenue)}
                  </Text>
                </View>
                <ProgressBar
                  progress={p.revenue / maxRevenue}
                  color={theme.colors.primary}
                  style={{ height: 6, borderRadius: 3 }}
                />
                <Text variant="labelSmall" style={{ color: theme.colors.outline, marginTop: 2 }}>
                  {p.quantity} sold
                </Text>
              </View>
            </View>
          ))
        )}
      </View>

      <Divider style={{ marginHorizontal: 16 }} />

      {/* Payment breakdown */}
      <View style={styles.section}>
        <Text variant="titleSmall" style={{ fontWeight: '700', marginBottom: 12 }}>
          Payment Breakdown
        </Text>
        {payments && payments.total > 0 ? (
          <>
            <View style={styles.paymentRow}>
              <Text variant="bodyMedium">Cash</Text>
              <Text variant="bodyMedium" style={{ fontWeight: '700' }}>
                {formatKES(payments.cash)}
              </Text>
            </View>
            <ProgressBar
              progress={payments.cash / payments.total}
              color={theme.colors.secondary}
              style={{ height: 8, borderRadius: 4, marginBottom: 12 }}
            />
            <View style={styles.paymentRow}>
              <Text variant="bodyMedium">M-Pesa</Text>
              <Text variant="bodyMedium" style={{ fontWeight: '700' }}>
                {formatKES(payments.mpesa)}
              </Text>
            </View>
            <ProgressBar
              progress={payments.mpesa / payments.total}
              color={theme.colors.tertiary}
              style={{ height: 8, borderRadius: 4 }}
            />
          </>
        ) : (
          <Text variant="bodySmall" style={{ color: theme.colors.outline }}>No payments for this date</Text>
        )}
      </View>

      <Divider style={{ marginHorizontal: 16 }} />

      {/* Expenses summary */}
      <View style={styles.section}>
        <Text variant="titleSmall" style={{ fontWeight: '700', marginBottom: 12 }}>
          Expenses
        </Text>
        {expenseSummary && expenseSummary.count > 0 ? (
          <>
            <View style={styles.paymentRow}>
              <Text variant="bodyMedium">Total Expenses</Text>
              <Text variant="bodyMedium" style={{ fontWeight: '700', color: '#E65100' }}>
                {formatKES(expenseSummary.totalAmount)}
              </Text>
            </View>
            <Text variant="labelSmall" style={{ color: theme.colors.outline, marginBottom: 8 }}>
              {expenseSummary.count} transaction{expenseSummary.count !== 1 ? 's' : ''}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {expenseSummary.byCategory.map((cat) => (
                <View key={cat.category} style={styles.expenseChip}>
                  <Text variant="labelSmall" style={{ fontWeight: '600' }}>
                    {cat.category}: {formatKES(cat.total)}
                  </Text>
                </View>
              ))}
            </View>
          </>
        ) : (
          <Text variant="bodySmall" style={{ color: theme.colors.outline }}>No expenses for this date</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBar: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4,
  },
  dateRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 8,
  },
  cardsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 16, paddingVertical: 12,
  },
  summaryCard: { width: '47%' as any, borderRadius: 12, flexGrow: 1 },
  section: { paddingHorizontal: 16, paddingVertical: 16 },
  productRow: { marginBottom: 14 },
  paymentRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  expenseChip: {
    backgroundColor: '#FFF3E0', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4,
  },
});
