import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Text, TextInput, Button, useTheme } from 'react-native-paper';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '../stores';
import { authApi } from '../lib/api';

export default function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const theme = useTheme();
  const auth = useAuthStore();
  const [tenantSlug, setTenantSlug] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!tenantSlug || !email || !password) {
      Alert.alert('Missing fields', 'Fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.login(email, password, tenantSlug);
      const { token, user, tenantId } = res.data;

      await SecureStore.setItemAsync('token', token);
      await SecureStore.setItemAsync('tenantId', tenantId);

      auth.login(token, user, tenantId);
      onLogin();
    } catch (err: any) {
      Alert.alert('Login failed', err.response?.data?.message || 'Check your credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <Text variant="displaySmall" style={{ fontWeight: '800', color: theme.colors.primary, marginBottom: 4 }}>
          DukaPoS
        </Text>
        <Text variant="bodyLarge" style={{ color: theme.colors.outline, marginBottom: 32 }}>
          Sign in to your terminal
        </Text>

        <TextInput
          label="Store ID"
          mode="outlined"
          placeholder="e.g. kilimani-duka"
          value={tenantSlug}
          onChangeText={setTenantSlug}
          autoCapitalize="none"
          left={<TextInput.Icon icon="store" />}
          style={styles.input}
        />

        <TextInput
          label="Email"
          mode="outlined"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          left={<TextInput.Icon icon="email-outline" />}
          style={styles.input}
        />

        <TextInput
          label="Password"
          mode="outlined"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          left={<TextInput.Icon icon="lock-outline" />}
          right={
            <TextInput.Icon
              icon={showPassword ? 'eye-off' : 'eye'}
              onPress={() => setShowPassword(!showPassword)}
            />
          }
          style={styles.input}
        />

        <Button
          mode="contained"
          onPress={handleLogin}
          loading={loading}
          disabled={loading}
          style={{ marginTop: 8, borderRadius: 12 }}
          contentStyle={{ paddingVertical: 8 }}
          labelStyle={{ fontSize: 16, fontWeight: '700' }}
        >
          Sign in
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center' },
  inner: { paddingHorizontal: 28 },
  input: { marginBottom: 14 },
});
