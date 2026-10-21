import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert, Keyboard, ScrollView } from 'react-native';
import DBottomSheet from '@/components/ui/DBottomSheet';
import DIconButton from '@/components/ui/DIconButton';
import DDivider from '@/components/ui/DDivider';
import DButton from '@/components/ui/DButton';
import DTextInput from '@/components/ui/DTextInput';
import DChip from '@/components/ui/DChip';
import DSegmentedButtons from '@/components/ui/DSegmentedButtons';
import { useAppTheme } from '@/lib/theme';
import { paymentsApi, salesApi } from '@/lib/api';
import type { SaleState } from '@/stores';
import FeatureUpgradeHint from '@/components/FeatureUpgradeHint';
import { useAuthStore } from '@/stores';

interface Props {
  visible: boolean;
  onDismiss: () => void;
  sale: SaleState | null;
  onComplete: () => void;
  onPaymentUpdate?: (sale: SaleState) => void;
  formatKES: (n: number) => string;
}

export default function PaymentSheet({ visible, onDismiss, sale, onComplete, onPaymentUpdate, formatKES }: Props) {
  const { colors } = useAppTheme();
  const features = useAuthStore((state) => state.features);
  const [method, setMethod] = useState('cash');
  const [cashAmount, setCashAmount] = useState('');
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [mpesaAmount, setMpesaAmount] = useState('');
  const [serverRemaining, setServerRemaining] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setServerRemaining(null);
    setCashAmount('');
    setMpesaAmount('');
  }, [sale?.id]);

  if (!sale) return null;

  const quickAmounts = [100, 200, 500, 1000, 2000, 5000];
  const alreadyPaid = (sale as any).paidAmount ?? 0;
  const remaining = Math.max(0, serverRemaining ?? sale.grandTotal - alreadyPaid);
  const cashTendered = parseFloat(cashAmount) || 0;
  const amountToApply = Math.min(cashTendered, remaining);
  const change = Math.max(0, cashTendered - remaining);

  const handleCash = async () => {
    const amount = parseFloat(cashAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      Alert.alert('Invalid amount', 'Enter an amount greater than zero');
      return;
    }
    setLoading(true);
    try {
      const res = await paymentsApi.recordCash(sale.id!, amount);
      if (res.data.saleCompleted) {
        Alert.alert('Sale paid', `Change: ${formatKES(res.data.change || 0)}`);
        setCashAmount('');
        onComplete();
      } else {
        const remainingBalance = Number(res.data.remainingBalance ?? Math.max(0, remaining - amountToApply));
        setServerRemaining(remainingBalance);
        Alert.alert('Payment recorded', `${formatKES(res.data.amountApplied || amountToApply)} received. ${formatKES(remainingBalance)} remains due.`);
        setCashAmount('');
        const updated = await salesApi.getSale(sale.id!);
        onPaymentUpdate?.({
          ...updated.data,
          id: updated.data.id ?? sale.id,
          saleNumber: updated.data.saleNumber ?? sale.saleNumber,
          grandTotal: Number(updated.data.grandTotal ?? sale.grandTotal),
          paidAmount: Math.max(0, Number(updated.data.grandTotal ?? sale.grandTotal) - remainingBalance),
        });
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  const handleMpesa = async () => {
    const amount = Number(mpesaAmount) || remaining;
    if (!mpesaPhone || mpesaPhone.length < 10 || amount <= 0 || amount > remaining) {
      Alert.alert('Invalid', 'Enter a valid phone number');
      return;
    }
    setLoading(true);
    try {
      await paymentsApi.initiateMpesa(sale.id!, mpesaPhone, amount);
      Alert.alert('STK Push sent', 'Customer should check their phone to approve payment');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'M-Pesa request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DBottomSheet visible={visible} onDismiss={onDismiss} maxHeight="80%">
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Payment</Text>
        <View style={{ flex: 1 }} />
        <Text style={[styles.headerTotal, { color: colors.primary }]}>{formatKES(sale.grandTotal)}</Text>
        <DIconButton icon="close" size={20} onPress={onDismiss} />
      </View>

      <DDivider />

      <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" style={{ padding: 16 }}>
        <Text style={[styles.remainingText, { color: colors.textSecondary }]}>Remaining balance: {formatKES(remaining)}</Text>
        <DSegmentedButtons
          value={method}
          onValueChange={setMethod}
          buttons={[
            { value: 'cash', label: 'Cash', icon: 'cash' },
            ...(!features.length || features.includes('mpesa_stk_push')
              ? [{ value: 'mpesa', label: 'M-Pesa', icon: 'cellphone' }]
              : []),
          ]}
          style={{ marginBottom: 20 }}
        />

        {features.length > 0 && !features.includes('mpesa_stk_push') ? (
          <FeatureUpgradeHint feature="mpesa_stk_push" label="M-Pesa STK prompt" />
        ) : method === 'cash' && (
          <>
            <DTextInput
              label="Amount tendered (KES)"
              keyboardType="numeric"
              value={cashAmount}
              onChangeText={setCashAmount}
              containerStyle={{ marginBottom: 12 }}
              autoFocus
            />

            <View style={styles.quickRow}>
              {quickAmounts.map((amt) => (
                <DChip key={amt} compact label={String(amt)} onPress={() => { setCashAmount(String(amt)); Keyboard.dismiss(); }} />
              ))}
              <DChip compact label="Exact" onPress={() => { setCashAmount(String(remaining)); Keyboard.dismiss(); }} />
            </View>

            {change >= 0 && cashAmount !== '' && (
              <View style={[styles.changeBox, { backgroundColor: colors.secondaryLight }]}>
                <Text style={[styles.changeLabel, { color: colors.secondary }]}>Change</Text>
                <Text style={[styles.changeValue, { color: colors.secondary }]}>{formatKES(change)}</Text>
              </View>
            )}

            <DButton mode="contained" onPress={handleCash} loading={loading}
              disabled={loading || !cashAmount || cashTendered <= 0}
              style={{ marginTop: 16 }}>
              Record cash payment
            </DButton>
          </>
        )}

        {method === 'mpesa' && (
          <>
            <DTextInput
              label={`Amount to collect (KES), max ${remaining.toFixed(2)}`}
              keyboardType="numeric"
              value={mpesaAmount}
              placeholder={String(remaining)}
              onChangeText={setMpesaAmount}
              containerStyle={{ marginBottom: 12 }}
            />
            <DTextInput
              label="M-Pesa phone number"
              keyboardType="phone-pad"
              placeholder="0712345678"
              value={mpesaPhone}
              onChangeText={setMpesaPhone}
              containerStyle={{ marginBottom: 12 }}
              autoFocus
              left={{ icon: 'phone' }}
            />

            <Text style={[styles.mpesaHint, { color: colors.textSecondary }]}>
              An STK push will be sent to this number. The customer approves the payment on their phone.
            </Text>

            <DButton mode="contained" onPress={handleMpesa} loading={loading}
              disabled={loading || !mpesaPhone || mpesaPhone.length < 10}
              buttonColor={colors.secondary}
              icon="cellphone">
              Send STK Push - {formatKES(Number(mpesaAmount) || remaining)}
            </DButton>
          </>
        )}
      </ScrollView>
    </DBottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 8,
  },
  headerTitle: { fontSize: 15, fontWeight: '700' },
  headerTotal: { fontSize: 15, fontWeight: '800' },
  remainingText: { fontSize: 14, marginBottom: 14 },
  quickRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16,
  },
  changeBox: {
    borderRadius: 12, padding: 16, alignItems: 'center', gap: 4,
  },
  changeLabel: { fontSize: 14, fontWeight: '600' },
  changeValue: { fontSize: 18, fontWeight: '800' },
  mpesaHint: { fontSize: 12, marginBottom: 16 },
});
