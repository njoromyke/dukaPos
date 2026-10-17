import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import {
  Text, TextInput, Button, Switch, SegmentedButtons, Divider,
  Dialog, Portal, useTheme,
} from 'react-native-paper';
import { useAuthStore } from '../stores';
import { inventoryApi } from '../lib/api';

const VAT_OPTIONS = [
  { value: '16', label: '16% VAT' },
  { value: '0', label: 'Exempt' },
  { value: '-1', label: 'Zero-rated' },
];

const STOCK_REASONS = ['Adjustment', 'Damaged', 'Expired'];

export default function ProductDetailScreen({ route, navigation }: any) {
  const theme = useTheme();
  const auth = useAuthStore();
  const existing = route.params?.product;
  const isNew = !existing;

  const [name, setName] = useState(existing?.name || '');
  const [sku, setSku] = useState(existing?.sku || '');
  const [barcode, setBarcode] = useState(existing?.barcode || '');
  const [unit, setUnit] = useState(existing?.unit || 'piece');
  const [sellingPrice, setSellingPrice] = useState(existing?.sellingPrice?.toString() || '');
  const [costPrice, setCostPrice] = useState(existing?.costPrice?.toString() || '');
  const [vatRate, setVatRate] = useState(existing?.vatRate?.toString() || '16');
  const [isWeighed, setIsWeighed] = useState(existing?.isWeighed || false);
  const [saving, setSaving] = useState(false);

  const [stockDialogVisible, setStockDialogVisible] = useState(false);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustReason, setAdjustReason] = useState('Adjustment');
  const [adjustNotes, setAdjustNotes] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  const handleSave = async () => {
    if (!name || !sku || !sellingPrice) {
      Alert.alert('Missing fields', 'Name, SKU, and Selling Price are required');
      return;
    }
    setSaving(true);
    try {
      const data = {
        id: existing?.id,
        name, sku, barcode: barcode || null, unit,
        sellingPrice: parseFloat(sellingPrice),
        costPrice: parseFloat(costPrice) || 0,
        vatRate: parseInt(vatRate),
        isWeighed,
        categoryId: existing?.categoryId || null,
      };
      if (isNew) {
        await inventoryApi.createProduct(data);
        Alert.alert('Created', 'Product created successfully');
      } else {
        await inventoryApi.updateProduct(data);
        Alert.alert('Updated', 'Product updated successfully');
      }
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleStockAdjust = async () => {
    const qty = parseFloat(adjustQty);
    if (isNaN(qty) || qty === 0) {
      Alert.alert('Invalid', 'Enter a non-zero quantity');
      return;
    }
    setAdjusting(true);
    try {
      await inventoryApi.adjustStock({
        productId: existing.id,
        branchId: auth.user?.branchId,
        quantityChange: qty,
        reason: adjustReason,
        notes: adjustNotes || null,
      });
      Alert.alert('Adjusted', `Stock adjusted by ${qty > 0 ? '+' : ''}${qty}`);
      setStockDialogVisible(false);
      setAdjustQty('');
      setAdjustNotes('');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Adjustment failed');
    } finally {
      setAdjusting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Button icon="arrow-left" onPress={() => navigation.goBack()} compact>Back</Button>
        <Text variant="titleMedium" style={{ fontWeight: '700', flex: 1 }}>
          {isNew ? 'New Product' : 'Edit Product'}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.form}>
        <TextInput label="Product Name" mode="outlined" value={name} onChangeText={setName}
          style={styles.input} />
        <TextInput label="SKU" mode="outlined" value={sku} onChangeText={setSku}
          style={styles.input} autoCapitalize="characters" />
        <TextInput label="Barcode" mode="outlined" value={barcode} onChangeText={setBarcode}
          style={styles.input} />
        <TextInput label="Unit" mode="outlined" value={unit} onChangeText={setUnit}
          style={styles.input} placeholder="piece, kg, litre" />

        <View style={styles.row}>
          <TextInput label="Selling Price (KES)" mode="outlined" keyboardType="numeric"
            value={sellingPrice} onChangeText={setSellingPrice}
            style={[styles.input, { flex: 1 }]} />
          <TextInput label="Cost Price (KES)" mode="outlined" keyboardType="numeric"
            value={costPrice} onChangeText={setCostPrice}
            style={[styles.input, { flex: 1 }]} />
        </View>

        <Text variant="labelLarge" style={{ marginBottom: 6, marginTop: 4 }}>VAT Rate</Text>
        <SegmentedButtons
          value={vatRate}
          onValueChange={setVatRate}
          buttons={VAT_OPTIONS}
          style={{ marginBottom: 16 }}
        />

        <View style={[styles.row, { alignItems: 'center', marginBottom: 16 }]}>
          <Text variant="bodyLarge">Weighed item</Text>
          <Switch value={isWeighed} onValueChange={setIsWeighed} />
        </View>

        <Button mode="contained" onPress={handleSave} loading={saving} disabled={saving}
          style={{ borderRadius: 12 }} contentStyle={{ paddingVertical: 6 }}
          labelStyle={{ fontSize: 16, fontWeight: '700' }}>
          {isNew ? 'Create Product' : 'Save Changes'}
        </Button>

        {!isNew && (
          <>
            <Divider style={{ marginVertical: 24 }} />

            <Text variant="titleSmall" style={{ fontWeight: '700', marginBottom: 8 }}>Stock</Text>
            <View style={[styles.stockBox, { backgroundColor: theme.colors.surfaceVariant }]}>
              <View>
                <Text variant="labelMedium" style={{ color: theme.colors.outline }}>Current level</Text>
                <Text variant="headlineSmall" style={{ fontWeight: '800' }}>
                  {existing.stockQuantity} {existing.unit}
                </Text>
              </View>
              <Button mode="contained-tonal" icon="plus-minus-variant"
                onPress={() => setStockDialogVisible(true)}>
                Adjust
              </Button>
            </View>
          </>
        )}
      </ScrollView>

      <Portal>
        <Dialog visible={stockDialogVisible} onDismiss={() => setStockDialogVisible(false)}>
          <Dialog.Title>Adjust Stock</Dialog.Title>
          <Dialog.Content>
            <TextInput label="Quantity change" mode="outlined" keyboardType="numeric"
              value={adjustQty} onChangeText={setAdjustQty}
              placeholder="e.g. +10 or -5" style={{ marginBottom: 12 }} />

            <Text variant="labelLarge" style={{ marginBottom: 6 }}>Reason</Text>
            <SegmentedButtons
              value={adjustReason}
              onValueChange={setAdjustReason}
              buttons={STOCK_REASONS.map((r) => ({ value: r, label: r }))}
              style={{ marginBottom: 12 }}
            />

            <TextInput label="Notes (optional)" mode="outlined" value={adjustNotes}
              onChangeText={setAdjustNotes} multiline numberOfLines={2} />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setStockDialogVisible(false)}>Cancel</Button>
            <Button mode="contained" onPress={handleStockAdjust} loading={adjusting}
              disabled={adjusting}>
              Apply
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 8,
    gap: 4, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#ddd',
  },
  form: { padding: 16, paddingBottom: 40 },
  input: { marginBottom: 12 },
  row: { flexDirection: 'row', gap: 12 },
  stockBox: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderRadius: 12,
  },
});
