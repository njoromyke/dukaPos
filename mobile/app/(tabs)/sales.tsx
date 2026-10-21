import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SaleState, useAuthStore } from '@/stores';
import { salesApi } from '@/lib/api';
import ScreenHeader from '@/components/ui/ScreenHeader';
import DCard from '@/components/ui/DCard';
import DButton from '@/components/ui/DButton';
import PaymentSheet from '@/components/PaymentSheet';
import { useAppTheme } from '@/lib/theme';


interface SaleRow {
  id: string;
  saleNumber: string;
  status: string;
  cashierName: string;
  customerName?: string;
  grandTotal: number;
  paidAmount: number;
  paymentMethod: string;
  completedAt: string;
}

export default function SalesScreen() {
  const { colors } = useAppTheme();
  const branchId = useAuthStore((state) => state.user?.branchId || '');
  const [rows, setRows] = useState<SaleRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [paymentSale, setPaymentSale] = useState<SaleState | null>(null);
  const [paymentVisible, setPaymentVisible] = useState(false);

  const load = useCallback(async (nextPage = 1, append = false) => {
    if (!branchId || loading) return;
    setLoading(true);
    try {
      const { data } = await salesApi.getHistory(branchId, { page: nextPage, pageSize: 20 });
      const result = data.sales ?? data.Sales ?? data.items ?? [];
      setRows((current) => append ? [...current, ...result] : result);
      setTotalCount(data.totalCount ?? data.TotalCount ?? result.length);
      setPage(nextPage);
    } catch {
      if (!append) setRows([]);
    } finally {
      setLoading(false);
    }
  }, [branchId, loading]);

  useEffect(() => { load(); }, [branchId]);

  const collectPayment = async (row: SaleRow) => {
    try {
      const { data } = await salesApi.getSale(row.id);
      setPaymentSale({
        id: data.id ?? data.Id ?? row.id,
        saleNumber: data.saleNumber ?? data.SaleNumber ?? row.saleNumber,
        status: data.status ?? data.Status ?? row.status,
        lineItems: data.lineItems ?? data.LineItems ?? [],
        subtotal: Number(data.subtotal ?? data.Subtotal ?? 0),
        vatTotal: Number(data.vatTotal ?? data.VatTotal ?? 0),
        discountTotal: Number(data.discountTotal ?? data.DiscountTotal ?? 0),
        grandTotal: Number(data.grandTotal ?? data.GrandTotal ?? row.grandTotal),
        paidAmount: row.paidAmount,
      });
      setPaymentVisible(true);
    } catch (error: any) {
      Alert.alert('Unable to open payment', error.response?.data?.message || 'Please try again.');
    }
  };

  const updatePaymentSale = (sale: SaleState) => {
    setPaymentSale(sale);
    setRows((current) => current.map((row) => row.id === sale.id
      ? { ...row, paidAmount: sale.paidAmount ?? row.paidAmount, status: sale.status }
      : row));
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Sales" subtitle={`${totalCount} transactions · ${useAuthStore.getState().user?.branchName || 'Current store'}`} />
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        refreshControl={<RefreshControl refreshing={loading && page === 1} onRefresh={() => load(1)} tintColor={colors.primary} />}
        onEndReached={() => rows.length < totalCount && !loading && load(page + 1, true)}
        onEndReachedThreshold={0.45}
        renderItem={({ item }) => {
          const partial = item.status === 'AwaitingPayment';
          const voided = item.status === 'Voided';
          const paid = Number(item.paidAmount || 0);
          const due = Math.max(0, Number(item.grandTotal || 0) - paid);
          const statusColor = voided ? colors.danger : partial ? colors.accent : colors.secondary;
          return (
            <DCard style={styles.saleCard}>
              <View style={styles.row}>
                <View style={[styles.icon, { backgroundColor: partial ? colors.accentLight : colors.primaryLight }]}>
                  <MaterialCommunityIcons name={partial ? 'clock-outline' : 'receipt-text-outline'} size={22} color={partial ? colors.accent : colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: '800', fontSize: 16 }}>{item.saleNumber}</Text>
                  <Text style={{ color: colors.textSecondary, marginTop: 3, fontSize: 13 }}>
                    {item.customerName ? `${item.customerName} · ` : ''}{item.cashierName} · {new Date(item.completedAt).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: colors.text, fontWeight: '800', fontSize: 16 }}>KES {Number(item.grandTotal || 0).toLocaleString('en-KE')}</Text>
                  <Text style={{ color: statusColor, marginTop: 3, fontSize: 12, fontWeight: '600' }}>{voided ? 'Voided' : partial ? 'Partially paid' : 'Paid'}</Text>
                </View>
              </View>
              <View style={styles.paymentInfo}>
                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{item.paymentMethod || 'Payment pending'}</Text>
                <Text style={{ color: partial ? colors.accent : colors.secondary, fontWeight: '700', fontSize: 13 }}>
                  {partial ? `KES ${paid.toLocaleString('en-KE')} paid · ${due.toLocaleString('en-KE')} due` : `KES ${paid.toLocaleString('en-KE')} received`}
                </Text>
              </View>
              {partial && (
                <DButton
                  mode="contained-tonal"
                  icon="cash-plus"
                  onPress={() => collectPayment(item)}
                  style={styles.collectButton}
                >
                  Receive balance · KES {due.toLocaleString('en-KE')}
                </DButton>
              )}
            </DCard>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialCommunityIcons name="receipt-text-outline" size={46} color={colors.border} />
            <Text style={{ color: colors.textSecondary, marginTop: 10, fontSize: 16 }}>
              {loading ? 'Loading sales...' : 'No sales recorded yet'}
            </Text>
          </View>
        }
      />
      <PaymentSheet
        visible={paymentVisible}
        onDismiss={() => setPaymentVisible(false)}
        sale={paymentSale}
        onComplete={() => {
          setPaymentVisible(false);
          setPaymentSale(null);
          load(1);
        }}
        onPaymentUpdate={updatePaymentSale}
        formatKES={(amount) => `KES ${amount.toLocaleString('en-KE', { maximumFractionDigits: 2 })}`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  list: { padding: 16, paddingBottom: 24, flexGrow: 1 },
  saleCard: { padding: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  paymentInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, gap: 8 },
  collectButton: { alignSelf: 'flex-start', marginTop: 12, borderRadius: 12 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 100 },
});
