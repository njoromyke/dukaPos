import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import {
  Text, List, Divider, Switch, Button, Dialog, Portal, TextInput, useTheme,
} from 'react-native-paper';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore, usePosStore } from '../stores';
import { userApi } from '../lib/api';

export default function SettingsScreen() {
  const theme = useTheme();
  const auth = useAuthStore();
  const pos = usePosStore();

  const [darkMode, setDarkMode] = useState(false);
  const [pinDialogVisible, setPinDialogVisible] = useState(false);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [changingPin, setChangingPin] = useState(false);

  const handleChangePin = async () => {
    if (!currentPin || !newPin || !confirmPin) {
      Alert.alert('Missing fields', 'Fill in all PIN fields');
      return;
    }
    if (newPin !== confirmPin) {
      Alert.alert('Mismatch', 'New PIN and confirmation do not match');
      return;
    }
    if (newPin.length < 4) {
      Alert.alert('Too short', 'PIN must be at least 4 digits');
      return;
    }
    setChangingPin(true);
    try {
      await userApi.changePin(currentPin, newPin);
      Alert.alert('PIN Changed', 'Your PIN has been updated');
      setPinDialogVisible(false);
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to change PIN');
    } finally {
      setChangingPin(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await SecureStore.deleteItemAsync('token');
          await SecureStore.deleteItemAsync('tenantId');
          auth.logout();
        },
      },
    ]);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.headerBar}>
        <Text variant="titleLarge" style={{ fontWeight: '800', color: theme.colors.primary }}>
          Settings
        </Text>
      </View>

      {/* Profile */}
      <List.Section>
        <List.Subheader>Profile</List.Subheader>
        <List.Item
          title={auth.user?.name || 'Unknown'}
          description="Full name"
          left={(props) => <List.Icon {...props} icon="account" />}
        />
        <List.Item
          title={auth.user?.email || '—'}
          description="Email"
          left={(props) => <List.Icon {...props} icon="email-outline" />}
        />
        <List.Item
          title={auth.user?.role || '—'}
          description="Role"
          left={(props) => <List.Icon {...props} icon="shield-account-outline" />}
        />
      </List.Section>

      <Divider />

      {/* Branch */}
      <List.Section>
        <List.Subheader>Branch</List.Subheader>
        <List.Item
          title={auth.user?.branchId || '—'}
          description="Branch ID"
          left={(props) => <List.Icon {...props} icon="store-outline" />}
        />
      </List.Section>

      <Divider />

      {/* Terminal */}
      <List.Section>
        <List.Subheader>Terminal</List.Subheader>
        <List.Item
          title="Lock terminal"
          description="Lock the POS terminal now"
          left={(props) => <List.Icon {...props} icon="lock-outline" />}
          onPress={() => pos.setLocked(true)}
        />
      </List.Section>

      <Divider />

      {/* Security */}
      <List.Section>
        <List.Subheader>Security</List.Subheader>
        <List.Item
          title="Change PIN"
          description="Update your terminal PIN"
          left={(props) => <List.Icon {...props} icon="dialpad" />}
          onPress={() => setPinDialogVisible(true)}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
        />
      </List.Section>

      <Divider />

      {/* Appearance */}
      <List.Section>
        <List.Subheader>Appearance</List.Subheader>
        <List.Item
          title="Dark mode"
          description="Switch to dark theme"
          left={(props) => <List.Icon {...props} icon="theme-light-dark" />}
          right={() => (
            <Switch value={darkMode} onValueChange={setDarkMode} />
          )}
        />
      </List.Section>

      <Divider />

      {/* About */}
      <List.Section>
        <List.Subheader>About</List.Subheader>
        <List.Item
          title="DukaPoS"
          description="Version 1.0.0"
          left={(props) => <List.Icon {...props} icon="information-outline" />}
        />
      </List.Section>

      {/* Sign out */}
      <View style={styles.signOut}>
        <Button mode="outlined" icon="logout" onPress={handleSignOut}
          textColor={theme.colors.error} style={{ borderColor: theme.colors.error, borderRadius: 12 }}
          contentStyle={{ paddingVertical: 6 }}>
          Sign out
        </Button>
      </View>

      {/* Change PIN dialog */}
      <Portal>
        <Dialog visible={pinDialogVisible} onDismiss={() => setPinDialogVisible(false)}>
          <Dialog.Title>Change PIN</Dialog.Title>
          <Dialog.Content>
            <TextInput label="Current PIN" mode="outlined" keyboardType="numeric"
              secureTextEntry value={currentPin} onChangeText={setCurrentPin}
              style={styles.input} maxLength={6} />
            <TextInput label="New PIN" mode="outlined" keyboardType="numeric"
              secureTextEntry value={newPin} onChangeText={setNewPin}
              style={styles.input} maxLength={6} />
            <TextInput label="Confirm New PIN" mode="outlined" keyboardType="numeric"
              secureTextEntry value={confirmPin} onChangeText={setConfirmPin}
              style={styles.input} maxLength={6} />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setPinDialogVisible(false)}>Cancel</Button>
            <Button mode="contained" onPress={handleChangePin} loading={changingPin}
              disabled={changingPin}>
              Change PIN
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBar: {
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4,
  },
  input: { marginBottom: 12 },
  signOut: { paddingHorizontal: 16, paddingVertical: 24 },
});
