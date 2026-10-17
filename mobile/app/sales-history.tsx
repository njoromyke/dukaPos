import { useState, useEffect, useCallback } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores';
import { salesApi } from '@/lib/api';
import AnimatedCard from '@/components/ui/AnimatedCard';
import { Colors } from '@/constants/Colors';

interface SaleHistory {
  id: string;
  saleNumber: string;
  status: string;
  grandTotal: number;
  lineItemCount: number;
  cashierName: string;
  completedAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  Completed: Colors.light.secondary,
  Voided: Colors.light.danger,
  Open: Colors.light.accent,
};

export default function SalesHistoryScreen() {
  const insets = useSafeAreaInsets();
  const auth = useAuthStore();
  const branchId = auth.user?.branchId || '';

  const [sales, setSales] = useState<SaleHistory[]>([]);
  const [loading, setLoading] = useState(false);

  const formatKES = (n: number) => `KES ${n.toLocaleString('en-KE', { minimumFractionDigits: 0 })}`;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await salesApi.getHistory(branchId);
      setSales(res.data.items || res.data || []);
    } catch {}
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
            <Text style={styles.saleNumber}>{item.saleNumber}</Text>
            <Text style={styles.saleMeta}>
              {item.lineItemCount} items - {item.cashierName}
            </Text>
            <Text style={styles.saleTime}>{date} {time}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.saleTotal}>{formatKES(item.grandTotal)}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>{item.status}</Text>
            </View>
          </View>
        </View>
      </AnimatedCard>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={22} color="#1E293B" />
        </Pressable>
        <Text style={styles.title}>Sales History</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={sales}
        keyExtractor={(s) => s.id}
        renderItem={renderSale}
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        ListEmptyComponent={
          <Animated.View entering={FadeIn.delay(200)} style={styles.empty}>
            <MaterialCommunityIcons name="receipt" size={48} color="#CBD5E1" />
            <Text style={styles.emptyText}>No sales found</Text>
          </Animated.View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  saleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  saleNumber: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  saleMeta: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  saleTime: { fontSize: 11, color: '#CBD5E1', marginTop: 2 },
  saleTotal: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 4 },
  statusText: { fontSize: 11, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText: { color: '#94A3B8', fontSize: 16 },
});
