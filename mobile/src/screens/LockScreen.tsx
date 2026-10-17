import React, { useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Text, Button, Avatar, useTheme } from 'react-native-paper';
import * as Haptics from 'expo-haptics';
import { useAuthStore, usePosStore } from '../stores';
import { terminalApi } from '../lib/api';

const { width } = Dimensions.get('window');

export default function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const theme = useTheme();
  const auth = useAuthStore();
  const pos = usePosStore();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDigit = async (digit: string) => {
    if (pin.length >= 6) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const newPin = pin + digit;
    setPin(newPin);
    setError('');

    if (newPin.length === 4) {
      await tryUnlock(newPin);
    }
  };

  const handleBackspace = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPin(pin.slice(0, -1));
    setError('');
  };

  const tryUnlock = async (currentPin: string) => {
    setLoading(true);
    try {
      await terminalApi.unlockWithPin('current-session', currentPin);
      pos.setLocked(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onUnlock();
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError('Invalid PIN');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back'];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Avatar.Text
        size={72}
        label={auth.user?.name?.[0] || '?'}
        style={{ backgroundColor: theme.colors.primary, marginBottom: 16 }}
      />

      <Text variant="headlineSmall" style={{ fontWeight: '700', marginBottom: 4 }}>
        {auth.user?.name || 'Terminal locked'}
      </Text>
      <Text variant="bodyMedium" style={{ color: theme.colors.outline, marginBottom: 24 }}>
        Enter your PIN to unlock
      </Text>

      {/* PIN dots */}
      <View style={styles.dotsRow}>
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: i < pin.length ? theme.colors.primary : theme.colors.surfaceVariant,
                transform: [{ scale: i < pin.length ? 1.3 : 1 }],
              },
            ]}
          />
        ))}
      </View>

      {error ? (
        <Text variant="bodySmall" style={{ color: theme.colors.error, marginBottom: 16 }}>{error}</Text>
      ) : (
        <View style={{ height: 28 }} />
      )}

      {/* Numpad */}
      <View style={styles.numpad}>
        {digits.map((d, i) => {
          if (d === '') return <View key={i} style={styles.numKey} />;
          if (d === 'back') {
            return (
              <Button key={i} mode="text" onPress={handleBackspace}
                style={styles.numKey} labelStyle={{ fontSize: 20 }}
                icon="backspace-outline" children="" />
            );
          }
          return (
            <Button key={i} mode="outlined" onPress={() => handleDigit(d)}
              disabled={loading}
              style={[styles.numKey, { borderRadius: 16 }]}
              labelStyle={{ fontSize: 24, fontWeight: '700' }}>
              {d}
            </Button>
          );
        })}
      </View>
    </View>
  );
}

const PAD_W = Math.min(width - 48, 320);

const styles = StyleSheet.create({
  container: {
    flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  dotsRow: {
    flexDirection: 'row', gap: 16, marginBottom: 8,
  },
  dot: {
    width: 16, height: 16, borderRadius: 8,
  },
  numpad: {
    width: PAD_W, flexDirection: 'row', flexWrap: 'wrap', gap: 10,
  },
  numKey: {
    width: (PAD_W - 20) / 3, height: 64, justifyContent: 'center',
  },
});
