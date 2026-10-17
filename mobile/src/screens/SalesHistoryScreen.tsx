import React, { useState, useEffect, useCallback } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import {
  Text, Chip, Card, Modal, Portal, Divider, Button, useTheme,
} from 'react-native-paper';
import { useAuthStore } from '../stores';
import { salesApi } from '../lib/api';

type DateFilter = 'today' | 'week' | 'month';

function getDateRange(filter: DateFilter) {
  const now = new Date();
  const to = now.toISOString().split('T')[0];
  let from = to;
  if (filter === 'week') {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    from = d.toISOString().split('T')[0];
  } else if (filter === 'month') {
    const d = new Date(now);
    d.setMonth(d.getMonth() - 1);
    from = d.toISOString().split('T')[0];
  }
  return { from, to };
}

interface SaleRecord {
  id: string;
  saleNumber: string;
  status: string;
  grandTotal: number;
  cashierName: string;
  completedAt: string;
  paymentMethod: string;
  lineItems: { productName: string; quantity: number; unitPrice: number; lineTotal: number }[];
}

export default function SalesHistoryScreen({ navigation }: any) {
  const theme = useTheme();
  const auth = useAuthStore();
  const branchId = auth.user?.branchId || '';

  const [filter, setFilter] = useState<DateFilter>('today');
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedSale, setSelectedSale] = useState<SaleRecord | null>(null);

  const formatKES = (n: number) => `KES ${n.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;

  const loadSales = useCallback(async (pageNum: number, reset: boolean) => {
    if (loading) return;
    setLoading(true);
    try {
      const { from, to } = getDateRange(filter);
      const res = await salesApi.getHistory(branchId, { from, to, page: pageNum, pageSize: 20 });
      const data = res.data?.items || res.data || [];
      if (reset) {
        setSales(data);
      } else {
        setSales((prev) => [...prev, ...data]);
      }
      setHasMore(data.length === 20);
      setPage(pageNum);
    } catch {}
    setLoading(false);
  }, [filter, branchId, loading]);

  useEffect(() => {
    loadSales(1, true);
  }, [filter]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSales(1, true);
    setRefreshing(false);
  };

  const loadMore = () => {
    if (hasMore && !loading) loadSales(page + 1, false);
  };

  const renderSale = ({ item }: { item: SaleRecord }) => {
    const date = new Date(item.completedAt);
    const timeStr = date.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
    const dateStr = date.toLocaleDateString('en-KE', { day: '2-digit', month: 'short' });
    const isVoided = item.status === 'Voided';

    return (
      <Card mode="outlined" style={styles.saleCard} onPress={() => setSelectedSale(item)}>
        <Card.Content style={styles.saleContent}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text variant="bodyMedium" style={{ fontWeight: '700' }}>{item.saleNumber}</Text>
              <View style={[
                styles.badge,
                { backgroundColor: isVoided ? theme.colors.errorContainer : theme.colors.secondaryContainer },
              ]}>
                <Text variant="labelSmall" style={{
                  color: isVoided ? theme.colors.error : theme.colors.secondary, fontWeight: '700',
                }}>
                  {item.status}
                </Text>
              </View>
            </View>
            <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
              {dateStr} {timeStr} · {item.cashierName}
            </Text>
            <Text variant="labelSmall" style={{ color: theme.colors.outline }}>
              {item.paymentMethod}
            </Text>
          </View>
          <Text variant="titleSmall" style={{ fontWeight: '800', color: theme.colors.primary }}>
            {formatKES(item.grandTotal)}
          </Text>
        </Card.Content>
      </Card>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.headerBar}>
        <Button icon="arrow-left" onPress={() => navigation.goBack()} compact>Back</Button>
        <Text variant="titleMedium" style={{ fontWeight: '700' }}>Sales History</Text>
      </View>

      <View style={styles.filterRow}>
        {(['today', 'week', 'month'] as DateFilter[]).map((f) => (
          <Chip key={f} compact selected={filter === f} onPress={() => setFilter(f)}
            textStyle={{ fontSize: 12 }}>
            {f === 'today' ? 'Today' : f === 'week' ? 'This week' : 'This month'}
          </Chip>
        ))}
      </View>

      <FlatList
        data={sales}
        keyExtractor={(s) => s.id}
        renderItem={renderSale}
        contentContainerStyle={{ padding: 12, paddingBottom: 24 }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text variant="bodyLarge" style={{ color: theme.colors.outline }}>No sales found</Text>
          </View>
        }
      />

      <Portal>
        <Modal visible={!!selectedSale} onDismiss={() => setSelectedSale(null)}
          contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}>
          {selectedSale && (
            <>
              <View style={styles.modalHeader}>
                <Text variant="titleMedium" style={{ fontWeight: '700' }}>
                  {selectedSale.saleNumber}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
                  {selectedSale.cashierName} · {selectedSale.paymentMethod}
                </Text>
              </View>
              <Divider />
              {selectedSale.lineItems?.map((li, i) => (
                <View key={i} style={styles.lineItem}>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyMedium">{li.productName}</Text>
                    <Text variant="labelSmall" style={{ color: theme.colors.outline }}>
                      {formatKES(li.unitPrice)} x {li.quantity}
                    </Text>
                  </View>
                  <Text variant="bodyMedium" style={{ fontWeight: '600' }}>
                    {formatKES(li.lineTotal)}
                  </Text>
                </View>
              ))}
              <Divider style={{ marginTop: 8 }} />
              <View style={styles.modalTotal}>
                <Text variant="titleMedium" style={{ fontWeight: '800' }}>Total</Text>
                <Text variant="titleMedium" style={{ fontWeight: '800', color: theme.colors.primary }}>
                  {formatKES(selectedSale.grandTotal)}
                </Text>
              </View>
              <Button mode="text" onPress={() => setSelectedSale(null)} style={{ marginTop: 8 }}>
                Close
              </Button>
            </>
          )}
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBar: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 8,
    gap: 4, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#ddd',
  },
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingVertical: 10 },
  saleCard: { borderRadius: 10 },
  saleContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  empty: { alignItems: 'center', paddingTop: 80 },
  modal: { marginHorizontal: 16, borderRadius: 16, padding: 16, maxHeight: '80%' },
  modalHeader: { marginBottom: 12 },
  lineItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 8 },
  modalTotal: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12 },
});
