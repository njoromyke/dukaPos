import React from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import {
  Modal, Text, IconButton, Button, Divider, useTheme,
} from 'react-native-paper';
import type { SaleState, LineItem } from '@/stores';

interface Props {
  visible: boolean;
  onDismiss: () => void;
  sale: SaleState | null;
  onUpdateQuantity: (lineItemId: string, delta: number) => void;
  onRemoveItem: (lineItemId: string) => void;
  onPark: (customerName?: string) => void;
  onPay: () => void;
  formatKES: (n: number) => string;
}

export default function CartSheet({
  visible, onDismiss, sale, onUpdateQuantity, onRemoveItem, onPark, onPay, formatKES,
}: Props) {
  const theme = useTheme();

  if (!sale) return null;

  const renderLineItem = ({ item }: { item: LineItem }) => (
    <View style={styles.lineItem}>
      <View style={{ flex: 1 }}>
        <Text variant="bodyMedium" style={{ fontWeight: '600' }}>{item.productName}</Text>
        <Text variant="labelSmall" style={{ color: theme.colors.outline }}>
          {formatKES(item.unitPrice)} x {item.quantity}
        </Text>
      </View>
      <View style={styles.qtyRow}>
        <IconButton icon="minus" size={18} mode="outlined"
          onPress={() => onUpdateQuantity(item.id, -1)} />
        <Text variant="titleSmall" style={{ fontWeight: '800', minWidth: 28, textAlign: 'center' }}>
          {item.quantity}
        </Text>
        <IconButton icon="plus" size={18} mode="outlined"
          onPress={() => onUpdateQuantity(item.id, 1)} />
        <IconButton icon="delete-outline" size={18} iconColor={theme.colors.error}
          onPress={() => onRemoveItem(item.id)} />
      </View>
      <Text variant="bodyMedium" style={{ fontWeight: '700', minWidth: 80, textAlign: 'right' }}>
        {formatKES(item.lineTotal)}
      </Text>
    </View>
  );

  return (
    <Modal visible={visible} onDismiss={onDismiss}
      contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.header}>
        <Text variant="titleMedium" style={{ fontWeight: '700' }}>Cart</Text>
        <Text variant="labelSmall" style={{ color: theme.colors.outline }}>
          {sale.saleNumber}
        </Text>
        <View style={{ flex: 1 }} />
        <IconButton icon="close" size={20} onPress={onDismiss} />
      </View>

      <Divider />

      <FlatList
        data={sale.lineItems}
        keyExtractor={(li) => li.id}
        renderItem={renderLineItem}
        ItemSeparatorComponent={() => <Divider />}
        style={{ maxHeight: 340 }}
      />

      <Divider style={{ marginTop: 8 }} />

      <View style={styles.totals}>
        <View style={styles.totalRow}>
          <Text variant="bodySmall" style={{ color: theme.colors.outline }}>Subtotal</Text>
          <Text variant="bodySmall">{formatKES(sale.subtotal)}</Text>
        </View>
        <View style={styles.totalRow}>
          <Text variant="bodySmall" style={{ color: theme.colors.outline }}>VAT</Text>
          <Text variant="bodySmall">{formatKES(sale.vatTotal)}</Text>
        </View>
        {sale.discountTotal > 0 && (
          <View style={styles.totalRow}>
            <Text variant="bodySmall" style={{ color: theme.colors.outline }}>Discount</Text>
            <Text variant="bodySmall">-{formatKES(sale.discountTotal)}</Text>
          </View>
        )}
        <Divider style={{ marginVertical: 6 }} />
        <View style={styles.totalRow}>
          <Text variant="titleMedium" style={{ fontWeight: '800' }}>TOTAL</Text>
          <Text variant="titleMedium" style={{ fontWeight: '800', color: theme.colors.primary }}>
            {formatKES(sale.grandTotal)}
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Button mode="outlined" icon="bookmark-outline" onPress={() => onPark()}
          style={{ flex: 1 }}>
          Park tab
        </Button>
        <Button mode="contained" icon="cash-register" onPress={onPay}
          style={{ flex: 2 }}>
          Pay {formatKES(sale.grandTotal)}
        </Button>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: {
    marginHorizontal: 16, borderRadius: 16, maxHeight: '85%', overflow: 'hidden',
  },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, gap: 8,
  },
  lineItem: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8,
  },
  qtyRow: { flexDirection: 'row', alignItems: 'center' },
  totals: { paddingHorizontal: 16, paddingVertical: 12 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  actions: { flexDirection: 'row', gap: 10, padding: 16 },
});
