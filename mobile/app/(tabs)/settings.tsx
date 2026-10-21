import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { useAuthStore, usePosStore, useProductStore, useThemeStore, useHapticsStore } from '@/stores';
import { branchesApi, userApi } from '@/lib/api';
import ScreenHeader from '@/components/ui/ScreenHeader';
import DButton from '@/components/ui/DButton';
import DTextInput from '@/components/ui/DTextInput';
import DDialog from '@/components/ui/DDialog';
import PlanUpgradeHint from '@/components/PlanUpgradeHint';
import { useAppTheme } from '@/lib/theme';
import { impact, notification, ImpactFeedbackStyle, NotificationFeedbackType } from '@/lib/haptics';

export default function SettingsScreen() {
  const auth = useAuthStore();
  const pos = usePosStore();
  const themeMode = useThemeStore((state) => state.mode);
  const setThemeMode = useThemeStore((state) => state.setMode);
  const hapticsEnabled = useHapticsStore((state) => state.enabled);
  const setHapticsEnabled = useHapticsStore((state) => state.setEnabled);
  const { colors } = useAppTheme();

  const [pinDialogVisible, setPinDialogVisible] = useState(false);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [changingPin, setChangingPin] = useState(false);
  const [branchDialogVisible, setBranchDialogVisible] = useState(false);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [switchingBranch, setSwitchingBranch] = useState(false);

  const loadBranches = async () => {
    try {
      const response = await branchesApi.list();
      const available = response.data || [];
      setBranches(available);
      const current = available.find((branch: { id: string; name: string }) => branch.id === auth.user?.branchId);
      if (current && current.name !== auth.user?.branchName && auth.token && auth.tenantId && auth.user) {
        const updatedUser = { ...auth.user, branchName: current.name };
        auth.login(auth.token, updatedUser, auth.tenantId);
        await SecureStore.setItemAsync('user', JSON.stringify(updatedUser));
      }
    } catch {
      setBranches([]);
    }
  };

  const selectBranch = async (branchId: string) => {
    if (branchId === auth.user?.branchId) {
      setBranchDialogVisible(false);
      return;
    }
    setSwitchingBranch(true);
    try {
      const response = await branchesApi.select(branchId);
      const { token, user, tenantId } = response.data;
      await SecureStore.setItemAsync('token', token);
      await SecureStore.setItemAsync('user', JSON.stringify(user));
      auth.login(token, user, tenantId);
      pos.setCurrentSale(null);
      pos.setOpenTabs([]);
      useProductStore.getState().setProducts([]);
      useProductStore.getState().setCategories([]);
      setBranchDialogVisible(false);
      Alert.alert('Store switched', `You're now viewing ${user.branchName}.`);
    } catch (error: any) {
      Alert.alert('Could not switch store', error.response?.data?.message || 'Your account cannot access that store.');
    } finally {
      setSwitchingBranch(false);
    }
  };

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
      notification(NotificationFeedbackType.Success);
      Alert.alert('PIN Changed', 'Your PIN has been updated');
      setPinDialogVisible(false);
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
    } catch (err: any) {
      notification(NotificationFeedbackType.Error);
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
          await SecureStore.deleteItemAsync('tenantSlug');
          await SecureStore.deleteItemAsync('loginEmail');
          await SecureStore.deleteItemAsync('user');
          auth.logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader title="Settings" />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={[styles.profileCard, { backgroundColor: colors.surface }]}>
          <View style={[styles.avatar, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.avatarText, { color: colors.primary }]}>
              {(auth.user?.name || 'U').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.profileName, { color: colors.text }]}>{auth.user?.name || 'Unknown'}</Text>
            <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>{auth.user?.email || '--'}</Text>
          </View>
          <View style={[styles.roleBadge, { backgroundColor: colors.secondaryLight }]}>
            <Text style={[styles.roleText, { color: colors.secondary }]}>{auth.user?.role || '--'}</Text>
          </View>
        </View>

        <View>
          <SettingItem
            icon="store-outline"
            title="Current store"
            subtitle={auth.user?.branchName || 'Assigned store'}
            onPress={() => { setBranchDialogVisible(true); loadBranches(); }}
            showArrow
          />
          <SettingItem
            icon="lock-outline"
            title="Lock Terminal"
            subtitle="Lock the POS terminal now"
            onPress={() => {
              impact(ImpactFeedbackStyle.Medium);
              SecureStore.setItemAsync('terminalLocked', 'true');
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
        </View>

        <SettingItem
          icon={themeMode === 'dark' ? 'weather-night' : 'white-balance-sunny'}
          title="Dark mode"
          subtitle="Choose a comfortable display theme"
          toggle
          toggleValue={themeMode === 'dark'}
          onToggle={async (enabled) => {
            const mode = enabled ? 'dark' : 'light';
            setThemeMode(mode);
            await SecureStore.setItemAsync('themeMode', mode);
          }}
        />

        <SettingItem
          icon="vibrate"
          title="Haptic feedback"
          subtitle="Vibrations on tap and interactions"
          toggle
          toggleValue={hapticsEnabled}
          onToggle={async (enabled) => {
            setHapticsEnabled(enabled);
            await SecureStore.setItemAsync('hapticsEnabled', enabled ? 'true' : 'false');
          }}
        />

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>About</Text>
          <SettingItem
            icon="information-outline"
            title="DukaPoS"
            subtitle="Version 1.0.0"
          />
        </View>

        <View style={styles.signOutContainer}>
          <Pressable onPress={handleSignOut} style={[styles.signOutBtn, { backgroundColor: colors.dangerLight }]}>
            <MaterialCommunityIcons name="logout" size={20} color={colors.danger} />
            <Text style={[styles.signOutText, { color: colors.danger }]}>Sign out</Text>
          </Pressable>
        </View>

        {/* Branch selection dialog */}
        <DDialog
          visible={branchDialogVisible}
          onDismiss={() => !switchingBranch && setBranchDialogVisible(false)}
          title="Choose a store"
          actions={<DButton onPress={() => setBranchDialogVisible(false)} disabled={switchingBranch}>Close</DButton>}
        >
          <PlanUpgradeHint />
          {branches.map((branch) => (
            <Pressable
              key={branch.id}
              onPress={() => selectBranch(branch.id)}
              style={({ pressed }) => [
                styles.branchItem,
                { backgroundColor: branch.id === auth.user?.branchId ? colors.primaryLight : 'transparent' },
                pressed && { opacity: 0.7 },
              ]}
            >
              <MaterialCommunityIcons
                name={branch.id === auth.user?.branchId ? 'check-circle' : 'store-outline'}
                size={22}
                color={branch.id === auth.user?.branchId ? colors.primary : colors.textSecondary}
              />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>{branch.name}</Text>
                {branch.id === auth.user?.branchId && (
                  <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>Current store</Text>
                )}
              </View>
            </Pressable>
          ))}
          {branches.length === 0 && <Text style={{ color: colors.textSecondary }}>No stores are available for this account.</Text>}
        </DDialog>

        {/* PIN change dialog */}
        <DDialog
          visible={pinDialogVisible}
          onDismiss={() => setPinDialogVisible(false)}
          title="Change PIN"
          actions={
            <>
              <DButton onPress={() => setPinDialogVisible(false)} textColor={colors.textSecondary}>Cancel</DButton>
              <DButton mode="contained" onPress={handleChangePin} loading={changingPin} disabled={changingPin}>Change PIN</DButton>
            </>
          }
        >
          <DTextInput
            label="Current PIN"
            keyboardType="numeric"
            secureTextEntry
            value={currentPin}
            onChangeText={setCurrentPin}
            maxLength={6}
            containerStyle={{ marginBottom: 12 }}
          />
          <DTextInput
            label="New PIN"
            keyboardType="numeric"
            secureTextEntry
            value={newPin}
            onChangeText={setNewPin}
            maxLength={6}
            containerStyle={{ marginBottom: 12 }}
          />
          <DTextInput
            label="Confirm New PIN"
            keyboardType="numeric"
            secureTextEntry
            value={confirmPin}
            onChangeText={setConfirmPin}
            maxLength={6}
          />
        </DDialog>
      </ScrollView>
    </View>
  );
}

function SettingItem({ icon, title, subtitle, onPress, showArrow, toggle, toggleValue, onToggle }: {
  icon: string; title: string; subtitle?: string;
  onPress?: () => void; showArrow?: boolean;
  toggle?: boolean; toggleValue?: boolean; onToggle?: (value: boolean) => void;
}) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      onPress={toggle ? () => onToggle?.(!toggleValue) : onPress}
      style={({ pressed }) => [styles.settingItem, { backgroundColor: colors.surface }, pressed && (onPress || toggle) && { opacity: 0.7 }]}
    >
      <View style={[styles.settingIcon, { backgroundColor: colors.primaryLight }]}>
        <MaterialCommunityIcons name={icon as any} size={20} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.settingTitle, { color: colors.text }]}>{title}</Text>
        {subtitle && <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>}
      </View>
      {toggle && (
        <View style={[styles.toggleTrack, { backgroundColor: toggleValue ? colors.primary : colors.border }]}>
          <View style={[styles.toggleThumb, toggleValue && styles.toggleThumbActive]} />
        </View>
      )}
      {showArrow && (
        <MaterialCommunityIcons name="chevron-right" size={20} color={colors.border} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  profileCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    margin: 16, padding: 20,
    borderRadius: 20,
  },
  avatar: {
    width: 50, height: 50, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 20, fontWeight: '800' },
  profileName: { fontSize: 17, fontWeight: '700' },
  profileEmail: { fontSize: 13, marginTop: 2 },
  roleBadge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
  },
  roleText: { fontSize: 12, fontWeight: '700' },
  section: { marginTop: 8 },
  sectionLabel: {
    fontSize: 13, fontWeight: '600',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  settingItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    marginHorizontal: 16, marginBottom: 2,
    padding: 16, borderRadius: 14,
  },
  settingIcon: {
    width: 38, height: 38, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  settingTitle: { fontSize: 15, fontWeight: '600' },
  settingSubtitle: { fontSize: 12, marginTop: 2 },
  signOutContainer: { paddingHorizontal: 16, paddingTop: 24 },
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14,
    borderRadius: 14,
  },
  signOutText: { fontSize: 15, fontWeight: '600' },
  toggleTrack: {
    width: 48, height: 28, borderRadius: 14,
    justifyContent: 'center', paddingHorizontal: 3,
  },
  toggleThumb: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#FFF',
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  branchItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 8, borderRadius: 10,
  },
});
