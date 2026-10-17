import { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, Pressable } from 'react-native';
import {
  Text, List, Divider, Switch, Button, Dialog, Portal, TextInput,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';
import { router } from 'expo-router';
import { useAuthStore, usePosStore } from '@/stores';
import { userApi } from '@/lib/api';
import ScreenHeader from '@/components/ui/ScreenHeader';
import { Colors } from '@/constants/Colors';

export default function SettingsScreen() {
  const auth = useAuthStore();
  const pos = usePosStore();

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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('PIN Changed', 'Your PIN has been updated');
      setPinDialogVisible(false);
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Settings" />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Profile card */}
        <Animated.View entering={FadeInUp.delay(100).springify()} style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(auth.user?.name || 'U').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>{auth.user?.name || 'Unknown'}</Text>
            <Text style={styles.profileEmail}>{auth.user?.email || '--'}</Text>
          </View>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{auth.user?.role || '--'}</Text>
          </View>
        </Animated.View>

        {/* Menu sections */}
        <Animated.View entering={FadeInUp.delay(200).springify()}>
          <SettingItem
            icon="store-outline"
            title="Branch"
            subtitle={auth.user?.branchId || '--'}
          />
          <SettingItem
            icon="lock-outline"
            title="Lock Terminal"
            subtitle="Lock the POS terminal now"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              pos.setLocked(true);
            }}
            showArrow
          />
          <SettingItem
            icon="dialpad"
            title="Change PIN"
            subtitle="Update your terminal PIN"
            onPress={() => setPinDialogVisible(true)}
            showArrow
          />
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(300).springify()} style={styles.section}>
          <Text style={styles.sectionLabel}>About</Text>
          <SettingItem
            icon="information-outline"
            title="DukaPoS"
            subtitle="Version 1.0.0"
          />
        </Animated.View>

        {/* Sign out */}
        <Animated.View entering={FadeInUp.delay(400).springify()} style={styles.signOutContainer}>
          <Pressable onPress={handleSignOut} style={styles.signOutBtn}>
            <MaterialCommunityIcons name="logout" size={20} color={Colors.light.danger} />
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>
        </Animated.View>

        {/* Change PIN dialog */}
        <Portal>
          <Dialog visible={pinDialogVisible} onDismiss={() => setPinDialogVisible(false)}
            style={styles.dialog}>
            <Dialog.Title style={{ fontWeight: '700' }}>Change PIN</Dialog.Title>
            <Dialog.Content>
              <TextInput
                label="Current PIN" mode="outlined" keyboardType="numeric"
                secureTextEntry value={currentPin} onChangeText={setCurrentPin}
                style={styles.input} maxLength={6}
                outlineStyle={{ borderColor: '#E2E8F0' }}
                theme={{ roundness: 12 }}
              />
              <TextInput
                label="New PIN" mode="outlined" keyboardType="numeric"
                secureTextEntry value={newPin} onChangeText={setNewPin}
                style={styles.input} maxLength={6}
                outlineStyle={{ borderColor: '#E2E8F0' }}
                theme={{ roundness: 12 }}
              />
              <TextInput
                label="Confirm New PIN" mode="outlined" keyboardType="numeric"
                secureTextEntry value={confirmPin} onChangeText={setConfirmPin}
                style={styles.input} maxLength={6}
                outlineStyle={{ borderColor: '#E2E8F0' }}
                theme={{ roundness: 12 }}
              />
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setPinDialogVisible(false)} textColor="#64748B">Cancel</Button>
              <Button
                mode="contained" onPress={handleChangePin}
                loading={changingPin} disabled={changingPin}
                style={{ borderRadius: 10 }}
                buttonColor={Colors.light.primary}
              >
                Change PIN
              </Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
      </ScrollView>
    </View>
  );
}

function SettingItem({ icon, title, subtitle, onPress, showArrow }: {
  icon: string; title: string; subtitle?: string;
  onPress?: () => void; showArrow?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.settingItem, pressed && onPress && { opacity: 0.7 }]}
    >
      <View style={styles.settingIcon}>
        <MaterialCommunityIcons name={icon as any} size={20} color={Colors.light.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {showArrow && (
        <MaterialCommunityIcons name="chevron-right" size={20} color="#CBD5E1" />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  profileCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#FFF', margin: 16, padding: 20,
    borderRadius: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  avatar: {
    width: 50, height: 50, borderRadius: 16,
    backgroundColor: Colors.light.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 20, fontWeight: '800', color: Colors.light.primary },
  profileName: { fontSize: 17, fontWeight: '700', color: '#0F172A' },
  profileEmail: { fontSize: 13, color: '#94A3B8', marginTop: 2 },
  roleBadge: {
    backgroundColor: Colors.light.secondaryLight,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
  },
  roleText: { fontSize: 12, fontWeight: '700', color: Colors.light.secondary },
  section: { marginTop: 8 },
  sectionLabel: {
    fontSize: 13, fontWeight: '600', color: '#94A3B8',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  settingItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#FFF', marginHorizontal: 16, marginBottom: 2,
    padding: 16, borderRadius: 14,
  },
  settingIcon: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: Colors.light.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  settingTitle: { fontSize: 15, fontWeight: '600', color: '#1E293B' },
  settingSubtitle: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  signOutContainer: { paddingHorizontal: 16, paddingTop: 24 },
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14,
    borderWidth: 1.5, borderColor: Colors.light.dangerLight,
    borderRadius: 14, backgroundColor: '#FFF',
  },
  signOutText: { fontSize: 15, fontWeight: '600', color: Colors.light.danger },
  dialog: { borderRadius: 20, backgroundColor: '#FFF' },
  input: { marginBottom: 12, backgroundColor: '#FFF' },
});
