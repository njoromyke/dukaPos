import React, { useState } from 'react';
import { View, StyleSheet, Alert, Keyboard } from 'react-native';
import {
  Modal, Text, IconButton, Button, TextInput, Chip, Divider, SegmentedButtons,
  useTheme,
} from 'react-native-paper';
import { paymentsApi } from '../lib/api';
import type { SaleState } from '../stores';

interface Props {
  visible: boolean;
  onDismiss: () => void;
  sale: SaleState | null;
  onComplete: () => void;
  formatKES: (n: number) => string;
}

export default function PaymentSheet({ visible, onDismiss, sale, onComplete, formatKES }: Props) {
  const theme = useTheme();
  const [method, setMethod] = useState('cash');
  const [cashAmount, setCashAmount] = useState('');
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [loading, setLoading] = useState(false);

  if (!sale) return null;

  const quickAmounts = [100, 200, 500, 1000, 2000, 5000];
  const change = parseFloat(cashAmount) - sale.grandTotal;

  const handleCash = async () => {
    const amount = parseFloat(cashAmount);
    if (isNaN(amount) || amount < sale.grandTotal) {
      Alert.alert('Insufficient', 'Tendered amount is less than the total');
      return;
    }
    setLoading(true);
    try {
      const res = await paymentsApi.recordCash(sale.id!, amount);
      Alert.alert('Payment complete', `Change: ${formatKES(res.data.change)}`);
      setCashAmount('');
      onComplete();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  const handleMpesa = async () => {
    if (!mpesaPhone || mpesaPhone.length < 10) {
      Alert.alert('Invalid', 'Enter a valid phone number');
      return;
    }
    setLoading(true);
    try {
      await paymentsApi.initiateMpesa(sale.id!, mpesaPhone, sale.grandTotal);
      Alert.alert('STK Push sent', 'Customer should check their phone to approve payment');
      // Actual confirmation arrives via SignalR
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'M-Pesa request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} onDismiss={onDismiss}
      contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}>

      <View style={styles.header}>
        <Text variant="titleMedium" style={{ fontWeight: '700' }}>Payment</Text>
        <View style={{ flex: 1 }} />
        <Text variant="titleMedium" style={{ fontWeight: '800', color: theme.colors.primary }}>
          {formatKES(sale.grandTotal)}
        </Text>
        <IconButton icon="close" size={20} onPress={onDismiss} />
      </View>

      <Divider />

      <View style={{ padding: 16 }}>
        <SegmentedButtons
          value={method}
          onValueChange={setMethod}
          buttons={[
            { value: 'cash', label: 'Cash', icon: 'cash' },
            { value: 'mpesa', label: 'M-Pesa', icon: 'cellphone' },
          ]}
          style={{ marginBottom: 20 }}
        />

        {method === 'cash' && (
          <>
            <TextInput
              label="Amount tendered (KES)"
              mode="outlined"
              keyboardType="numeric"
              value={cashAmount}
              onChangeText={setCashAmount}
              style={{ marginBottom: 12 }}
              autoFocus
            />

            <View style={styles.quickRow}>
              {quickAmounts.map((amt) => (
                <Chip key={amt} compact onPress={() => { setCashAmount(String(amt)); Keyboard.dismiss(); }}
                  textStyle={{ fontSize: 13 }}>
                  {amt}
                </Chip>
              ))}
              <Chip compact mode="flat" onPress={() => { setCashAmount(String(sale.grandTotal)); Keyboard.dismiss(); }}
                textStyle={{ fontSize: 13, fontWeight: '700' }}>
                Exact
              </Chip>
            </View>

            {change >= 0 && cashAmount !== '' && (
              <View style={[styles.changeBox, { backgroundColor: theme.colors.secondaryContainer }]}>
                <Text variant="labelLarge" style={{ color: theme.colors.secondary }}>Change</Text>
                <Text variant="headlineSmall"
                  style={{ fontWeight: '800', color: theme.colors.secondary }}>
                  {formatKES(change)}
                </Text>
              </View>
            )}

            <Button mode="contained" onPress={handleCash} loading={loading}
              disabled={loading || !cashAmount || parseFloat(cashAmount) < sale.grandTotal}
              style={{ marginTop: 16 }} contentStyle={{ paddingVertical: 6 }}>
              Complete cash payment
            </Button>
          </>
        )}

        {method === 'mpesa' && (
          <>
            <TextInput
              label="M-Pesa phone number"
              mode="outlined"
              keyboardType="phone-pad"
              placeholder="0712345678"
              value={mpesaPhone}
              onChangeText={setMpesaPhone}
              style={{ marginBottom: 12 }}
              autoFocus
              left={<TextInput.Icon icon="phone" />}
            />

            <Text variant="bodySmall" style={{ color: theme.colors.outline, marginBottom: 16 }}>
              An STK push will be sent to this number. The customer approves the payment on their phone.
            </Text>

            <Button mode="contained" onPress={handleMpesa} loading={loading}
              disabled={loading || !mpesaPhone || mpesaPhone.length < 10}
              buttonColor={theme.colors.secondary}
              contentStyle={{ paddingVertical: 6 }}
              icon="cellphone">
              Send STK Push — {formatKES(sale.grandTotal)}
            </Button>
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: {
    marginHorizontal: 16, borderRadius: 16, maxHeight: '80%', overflow: 'hidden',
  },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 8,
  },
  quickRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16,
  },
  changeBox: {
    borderRadius: 12, padding: 16, alignItems: 'center', gap: 4,
  },
});
