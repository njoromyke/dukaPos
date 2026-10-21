import { useState } from 'react';
import { Alert, View } from 'react-native';
import DText from '@/components/ui/DText';
import DButton from '@/components/ui/DButton';
import DTextInput from '@/components/ui/DTextInput';
import DSegmentedButtons from '@/components/ui/DSegmentedButtons';
import * as SecureStore from 'expo-secure-store';
import { authApi } from '@/lib/api';
import { usePosStore } from '@/stores';
import { useAppTheme } from '@/lib/theme';

export default function TerminalLockOverlay() {
  const locked = usePosStore((state) => state.isLocked);
  const setLocked = usePosStore((state) => state.setLocked);
  const { colors } = useAppTheme();
  const [credential, setCredential] = useState('');
  const [mode, setMode] = useState<'pin' | 'password'>('pin');
  const [loading, setLoading] = useState(false);
  if (!locked) return null;

  const unlock = async () => {
    if (!credential) return;
    setLoading(true);
    try {
      if (mode === 'pin') await authApi.unlockPin(credential);
      else await authApi.unlockPassword(credential);
      await SecureStore.deleteItemAsync('terminalLocked');
      setLocked(false);
      setCredential('');
    } catch (error: any) {
      Alert.alert('Unable to unlock', error.response?.data?.message || error.message || 'Check the PIN and try again.');
    } finally { setLoading(false); }
  };

  return (
    <View style={{ position: 'absolute', zIndex: 9999, elevation: 20, top: 0, right: 0, bottom: 0, left: 0, backgroundColor: colors.background, justifyContent: 'center', padding: 28 }}>
      <DText variant="headlineMd" weight="800" align="center" style={{ marginBottom: 8 }}>Terminal locked</DText>
      <DText variant="bodyMd" color={colors.textSecondary} align="center" style={{ marginBottom: 20 }}>Verify your identity to continue.</DText>
      <DSegmentedButtons
        value={mode}
        onValueChange={(value) => { setMode(value as 'pin' | 'password'); setCredential(''); }}
        buttons={[{ value: 'pin', label: 'PIN' }, { value: 'password', label: 'Password' }]}
        style={{ marginBottom: 16 }}
      />
      <DTextInput
        label={mode === 'pin' ? 'Cashier PIN' : 'Password'}
        value={credential}
        onChangeText={setCredential}
        keyboardType={mode === 'pin' ? 'number-pad' : 'default'}
        secureTextEntry
        visibilityToggle={mode === 'password'}
        maxLength={mode === 'pin' ? 8 : undefined}
        autoCapitalize="none"
        onSubmitEditing={unlock}
      />
      <DButton mode="contained" style={{ marginTop: 16 }} onPress={unlock} loading={loading} disabled={loading || !credential}>Unlock terminal</DButton>
    </View>
  );
}
