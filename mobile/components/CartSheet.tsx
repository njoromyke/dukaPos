import React from 'react';
import { View, Text, FlatList, StyleSheet, ScrollView } from 'react-native';
import DBottomSheet from '@/components/ui/DBottomSheet';
import DIconButton from '@/components/ui/DIconButton';
import DDivider from '@/components/ui/DDivider';
import DButton from '@/components/ui/DButton';
import DTextInput from '@/components/ui/DTextInput';
import { useAppTheme } from '@/lib/theme';
import type { SaleState, LineItem } from '@/stores';

interface Props {
  visible: boolean;
  onDismiss: () => void;
  sale: SaleState | null;
  onUpdateQuantity: (lineItemId: string, delta: number) => void;
  onRemoveItem: (lineItemId: string) => void;
  onPark: (customerName?: string) => void;
  onCustomerNameChange: (customerName: string) => void;
  onCustomerNameSave: (customerName: string) => void;
  onPay: () => void;
  formatKES: (n: number) => string;
}

export default function CartSheet({
  visible, onDismiss, sale, onUpdateQuantity, onRemoveItem, onPark, onCustomerNameChange, onCustomerNameSave, onPay, formatKES,
}: Props) {
  const { colors } = useAppTheme();

  if (!sale) return null;

  const renderLineItem = ({ item }: { item: LineItem }) => (
    <View style={styles.lineItem}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.itemName, { color: colors.text }]}>{item.productName}</Text>
        <Text style={[styles.itemMeta, { color: colors.textSecondary }]}>
          {formatKES(item.unitPrice)} x {item.quantity}
        </Text>
      </View>
      <View style={styles.qtyRow}>
        <DIconButton icon="minus" size={18} outlined onPress={() => onUpdateQuantity(item.id, -1)} />
        <Text style={[styles.qtyText, { color: colors.text }]}>{item.quantity}</Text>
        <DIconButton icon="plus" size={18} outlined onPress={() => onUpdateQuantity(item.id, 1)} />
        <DIconButton icon="delete-outline" size={18} color={colors.danger} onPress={() => onRemoveItem(item.id)} />
      </View>
      <Text style={[styles.lineTotal, { color: colors.text }]}>
        {formatKES(item.lineTotal)}
      </Text>
    </View>
  );

  return (
    <DBottomSheet visible={visible} onDismiss={onDismiss}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Cart</Text>
        <Text style={[styles.saleNum, { color: colors.textSecondary }]}>{sale.saleNumber}</Text>
        <View style={{ flex: 1 }} />
        <DIconButton icon="close" size={20} onPress={onDismiss} />
      </View>

      <DDivider />

      <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
        <FlatList
          data={sale.lineItems}
          keyExtractor={(li) => li.id}
          renderItem={renderLineItem}
          ItemSeparatorComponent={DDivider}
          scrollEnabled={false}
        />

        <DTextInput
          label="Customer name (optional)"
          value={sale.customerName || ''}
          onChangeText={onCustomerNameChange}
          onEndEditing={(event) => onCustomerNameSave(event.nativeEvent.text)}
          dense
          containerStyle={{ marginHorizontal: 16, marginTop: 8 }}
        />

        <DDivider style={{ marginTop: 8 }} />

        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Subtotal</Text>
            <Text style={[styles.totalValue, { color: colors.text }]}>{formatKES(sale.subtotal)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>VAT included</Text>
            <Text style={[styles.totalValue, { color: colors.text }]}>{formatKES(sale.vatTotal)}</Text>
          </View>
          {sale.discountTotal > 0 && (
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Discount</Text>
              <Text style={[styles.totalValue, { color: colors.text }]}>-{formatKES(sale.discountTotal)}</Text>
            </View>
          )}
          <DDivider style={{ marginVertical: 6 }} />
          <View style={styles.totalRow}>
            <Text style={[styles.grandLabel, { color: colors.text }]}>TOTAL</Text>
            <Text style={[styles.grandValue, { color: colors.primary }]}>{formatKES(sale.grandTotal)}</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <DButton mode="outlined" icon="bookmark-outline" onPress={() => onPark()} style={{ flex: 1 }}>
            Park tab
          </DButton>
          <DButton mode="contained" icon="cash-register" onPress={onPay} style={{ flex: 2 }}>
            Pay {formatKES(sale.grandTotal)}
          </DButton>
        </View>
      </ScrollView>
    </DBottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, gap: 8,
  },
  headerTitle: { fontSize: 15, fontWeight: '700' },
  saleNum: { fontSize: 11, fontWeight: '600' },
  lineItem: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8,
  },
  itemName: { fontSize: 14, fontWeight: '600' },
  itemMeta: { fontSize: 11 },
  qtyRow: { flexDirection: 'row', alignItems: 'center' },
  qtyText: { fontWeight: '800', fontSize: 14, minWidth: 28, textAlign: 'center' },
  lineTotal: { fontWeight: '700', fontSize: 14, minWidth: 80, textAlign: 'right' },
  totals: { paddingHorizontal: 16, paddingVertical: 12 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  totalLabel: { fontSize: 12 },
  totalValue: { fontSize: 12 },
  grandLabel: { fontSize: 15, fontWeight: '800' },
  grandValue: { fontSize: 15, fontWeight: '800' },
  actions: { flexDirection: 'row', gap: 10, padding: 16 },
});
