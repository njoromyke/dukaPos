import { useState, useEffect, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, FlatList, StyleSheet, RefreshControl, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores';
import { salesApi } from '@/lib/api';
import AnimatedCard from '@/components/ui/AnimatedCard';
import { useAppTheme } from '@/lib/theme';

interface SaleHistory {
  id: string;
  saleNumber: string;
  status: string;
  grandTotal: number;
  lineItemCount?: number;
  cashierName: string;
  customerName?: string | null;
  completedAt: string;
  paymentMethod?: string;
}

const STATUS_COLORS: Record<string, string> = {
  Completed: '#006D32',
  Voided: '#BA1A1A',
  Open: '#F59E0B',
};

export default function SalesHistoryScreen() {
  const { colors, dark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const auth = useAuthStore();
  const branchId = auth.user?.branchId || '';

  const [sales, setSales] = useState<SaleHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const formatKES = (n: number) => `KES ${n.toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await salesApi.getHistory(branchId);
      const data = res.data;
      setSales(data.sales || data.items || data.Sales || data.Items || (Array.isArray(data) ? data : []));
    } catch (err: any) {
      const status = err.response?.status;
      setError(status === 403 ? 'You do not have access to this branch.' : err.response?.data?.message || 'Could not load sales history.');
    }
    setLoading(false);
  }, [branchId]);

  useEffect(() => { load(); }, [load]);

  const renderSale = ({ item, index }: { item: SaleHistory; index: number }) => {
    const statusColor = STATUS_COLORS[item.status] || '#64748B';
    const time = new Date(item.completedAt).toLocaleTimeString('en-KE', {
      hour: '2-digit', minute: '2-digit',
    });
    const date = new Date(item.completedAt).toLocaleDateString('en-KE', {
      day: '2-digit', month: 'short',
    });

    return (
      <AnimatedCard delay={Math.min(index * 50, 300)}>
        <View style={styles.saleRow}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.saleNumber, { color: colors.text }]}>{item.saleNumber}</Text>
            <Text style={[styles.saleMeta, { color: colors.textSecondary }]}>
              {item.customerName ? `${item.customerName} · ` : ''}{item.paymentMethod || 'Sale'} - {item.cashierName}
            </Text>
            <Text style={[styles.saleTime, { color: colors.textSecondary }]}>{date} {time}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.saleTotal, { color: colors.text }]}>{formatKES(item.grandTotal)}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>{item.status}</Text>
            </View>
          </View>
        </View>
      </AnimatedCard>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: colors.background }]}>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.border }]}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.text} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Sales History</Text>
        <View style={{ width: 40 }} />
      </View>

      {error ? <Text style={{ color: colors.danger, paddingHorizontal: 16, paddingTop: 12, fontSize: 13 }}>{error}</Text> : null}

      <FlatList
        data={sales}
        keyExtractor={(s) => s.id}
        renderItem={renderSale}
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialCommunityIcons name="receipt" size={48} color={colors.border} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No sales found</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 16,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 18, fontWeight: '700' },
  saleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  saleNumber: { fontSize: 15, fontWeight: '700' },
  saleMeta: { fontSize: 12, marginTop: 2 },
  saleTime: { fontSize: 11, marginTop: 2 },
  saleTotal: { fontSize: 16, fontWeight: '800' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 4 },
  statusText: { fontSize: 11, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 16 },
});
