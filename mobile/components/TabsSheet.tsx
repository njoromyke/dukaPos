import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import DBottomSheet from '@/components/ui/DBottomSheet';
import DIconButton from '@/components/ui/DIconButton';
import DDivider from '@/components/ui/DDivider';
import DButton from '@/components/ui/DButton';
import DCard from '@/components/ui/DCard';
import { useAppTheme } from '@/lib/theme';
import type { Tab } from '@/stores';

interface Props {
  visible: boolean;
  onDismiss: () => void;
  tabs: Tab[];
  onRecall: (tabId: string) => void;
  formatKES: (n: number) => string;
}

export default function TabsSheet({ visible, onDismiss, tabs, onRecall, formatKES }: Props) {
  const { colors } = useAppTheme();

  const renderTab = ({ item }: { item: Tab }) => {
    const parkedTime = new Date(item.parkedAt);
    const timeStr = parkedTime.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });

    return (
      <DCard style={{ marginBottom: 8 }}>
        <View style={styles.tabCard}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.tabTitle, { color: colors.text }]}>
              {item.customerName || `Tab by ${item.parkedByName}`}
            </Text>
            <Text style={[styles.tabMeta, { color: colors.textSecondary }]}>
              {item.itemCount} items · {formatKES(item.saleTotal)}
            </Text>
            <Text style={[styles.tabTime, { color: colors.textSecondary }]}>
              Parked at {timeStr}
            </Text>
            {item.notes && (
              <Text style={[styles.tabNotes, { color: colors.accent }]}>
                {item.notes}
              </Text>
            )}
          </View>
          <DButton mode="contained-tonal" icon="play" compact onPress={() => onRecall(item.id)}>
            Recall
          </DButton>
        </View>
      </DCard>
    );
  };

  return (
    <DBottomSheet visible={visible} onDismiss={onDismiss} maxHeight="75%">
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Open tabs ({tabs.length})</Text>
        <View style={{ flex: 1 }} />
        <DIconButton icon="close" size={20} onPress={onDismiss} />
      </View>

      <DDivider />

      {tabs.length === 0 ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>No open tabs</Text>
          <Text style={[styles.emptyHint, { color: colors.textSecondary }]}>Park a sale to create a tab</Text>
        </View>
      ) : (
        <FlatList
          data={tabs}
          keyExtractor={(t) => t.id}
          renderItem={renderTab}
          contentContainerStyle={{ padding: 16 }}
          style={{ maxHeight: 400 }}
        />
      )}
    </DBottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 8,
  },
  headerTitle: { fontSize: 15, fontWeight: '700' },
  tabCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tabTitle: { fontSize: 14, fontWeight: '700' },
  tabMeta: { fontSize: 12, marginTop: 2 },
  tabTime: { fontSize: 11, marginTop: 2 },
  tabNotes: { fontSize: 11, marginTop: 2 },
  empty: { alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 16 },
  emptyHint: { fontSize: 12, marginTop: 4 },
});
