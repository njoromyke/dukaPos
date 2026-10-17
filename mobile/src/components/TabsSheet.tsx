import React from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { Modal, Text, IconButton, Button, Card, Divider, useTheme } from 'react-native-paper';
import type { Tab } from '../stores';

interface Props {
  visible: boolean;
  onDismiss: () => void;
  tabs: Tab[];
  onRecall: (tabId: string) => void;
  formatKES: (n: number) => string;
}

export default function TabsSheet({ visible, onDismiss, tabs, onRecall, formatKES }: Props) {
  const theme = useTheme();

  const renderTab = ({ item }: { item: Tab }) => {
    const parkedTime = new Date(item.parkedAt);
    const timeStr = parkedTime.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });

    return (
      <Card mode="outlined" style={{ marginBottom: 8, borderRadius: 12 }}>
        <Card.Content style={styles.tabCard}>
          <View style={{ flex: 1 }}>
            <Text variant="titleSmall" style={{ fontWeight: '700' }}>
              {item.customerName || `Tab by ${item.parkedByName}`}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
              {item.itemCount} items · {formatKES(item.saleTotal)}
            </Text>
            <Text variant="labelSmall" style={{ color: theme.colors.outline }}>
              Parked at {timeStr}
            </Text>
            {item.notes && (
              <Text variant="labelSmall" style={{ color: theme.colors.tertiary, marginTop: 2 }}>
                {item.notes}
              </Text>
            )}
          </View>
          <Button mode="contained-tonal" icon="play" compact
            onPress={() => onRecall(item.id)}>
            Recall
          </Button>
        </Card.Content>
      </Card>
    );
  };

  return (
    <Modal visible={visible} onDismiss={onDismiss}
      contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}>

      <View style={styles.header}>
        <Text variant="titleMedium" style={{ fontWeight: '700' }}>
          Open tabs ({tabs.length})
        </Text>
        <View style={{ flex: 1 }} />
        <IconButton icon="close" size={20} onPress={onDismiss} />
      </View>

      <Divider />

      {tabs.length === 0 ? (
        <View style={styles.empty}>
          <Text variant="bodyLarge" style={{ color: theme.colors.outline }}>No open tabs</Text>
          <Text variant="bodySmall" style={{ color: theme.colors.outline, marginTop: 4 }}>
            Park a sale to create a tab
          </Text>
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
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: {
    marginHorizontal: 16, borderRadius: 16, maxHeight: '75%', overflow: 'hidden',
  },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 8,
  },
  tabCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  empty: { alignItems: 'center', padding: 40 },
});
