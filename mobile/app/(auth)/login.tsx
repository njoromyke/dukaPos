import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, KeyboardAvoidingView, Platform,
  Alert, Pressable, Keyboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import Animated, {
  FadeInDown, FadeInUp, useSharedValue,
  useAnimatedStyle, withSpring, withSequence,
} from 'react-native-reanimated';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores';
import { authApi } from '@/lib/api';

import { registerForPushNotifications } from '@/lib/notifications';
import { notification, NotificationFeedbackType } from '@/lib/haptics';
import DTextInput from '@/components/ui/DTextInput';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function LoginScreen() {
  const auth = useAuthStore();
  const [tenantSlug, setTenantSlug] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberedIdentity, setRememberedIdentity] = useState(false);
  const [identityLoaded, setIdentityLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      SecureStore.getItemAsync('tenantSlug'),
      SecureStore.getItemAsync('loginEmail'),
    ]).then(([savedSlug, savedEmail]) => {
      if (!mounted) return;
      if (savedSlug && savedEmail) {
        setTenantSlug(savedSlug);
        setEmail(savedEmail);
        setRememberedIdentity(true);
      }
    }).finally(() => {
      if (mounted) setIdentityLoaded(true);
    });
    return () => { mounted = false; };
  }, []);

  const buttonScale = useSharedValue(1);
  const shakeX = useSharedValue(0);

  const buttonAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const formAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  const handleLogin = async () => {
    Keyboard.dismiss();
    if ((!rememberedIdentity && (!tenantSlug || !email)) || !password) {
      notification(NotificationFeedbackType.Warning);
      shakeX.value = withSequence(
        withSpring(10, { damping: 2, stiffness: 800 }),
        withSpring(-10, { damping: 2, stiffness: 800 }),
        withSpring(6, { damping: 2, stiffness: 800 }),
        withSpring(-6, { damping: 2, stiffness: 800 }),
        withSpring(0, { damping: 10, stiffness: 400 }),
      );
      Alert.alert('Missing fields', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    buttonScale.value = withSpring(0.95);

    try {
      const res = await authApi.login(email, password, tenantSlug);
      const { token, user, tenantId, subscription } = res.data;

      await SecureStore.setItemAsync('token', token);
      await SecureStore.setItemAsync('tenantId', tenantId);
      await SecureStore.setItemAsync('tenantSlug', tenantSlug.trim().toLowerCase());
      await SecureStore.setItemAsync('loginEmail', email.trim());
      await SecureStore.setItemAsync('user', JSON.stringify(user));
      await SecureStore.setItemAsync('subscriptionFeatures', JSON.stringify(subscription?.features ?? []));

      notification(NotificationFeedbackType.Success);
      auth.login(token, user, tenantId, subscription?.features ?? []);
      void registerForPushNotifications();
      router.replace('/(tabs)');
    } catch (err: any) {
      notification(NotificationFeedbackType.Error);
      shakeX.value = withSequence(
        withSpring(12, { damping: 2, stiffness: 800 }),
        withSpring(-12, { damping: 2, stiffness: 800 }),
        withSpring(0, { damping: 10, stiffness: 400 }),
      );
      const message = err.response?.data?.message
        || (err.response?.status === 403
          ? `Access was denied by ${err.response.config?.baseURL || 'the configured API'} (HTTP 403). The login endpoint is public; confirm the app is pointed at the intended DukaPoS API.`
          : err.response
          ? `The server at ${err.response.config?.baseURL || 'the configured API'} returned HTTP ${err.response.status}. Verify the API address and try again.`
          : 'Cannot reach the DukaPoS server. Check your network and EXPO_PUBLIC_API_URL, then try again.');
      Alert.alert('Login failed', message);
    } finally {
      setLoading(false);
      buttonScale.value = withSpring(1);
    }
  };

  return (
    <LinearGradient colors={['#0F172A', '#1E293B']} style={styles.gradient}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.inner}>
          <Animated.View entering={FadeInDown.duration(600).springify()} style={styles.logoContainer}>
            <View style={styles.logoIcon}>
              <Text style={styles.logoEmoji}>D</Text>
            </View>
            <Text style={styles.brand}>DukaPoS</Text>
            <Text style={styles.subtitle}>Point of Sale Terminal</Text>
          </Animated.View>

          <Animated.View
            entering={FadeInUp.delay(200).duration(500).springify()}
            style={[styles.formCard, formAnimStyle]}
          >
            {!identityLoaded ? null : !rememberedIdentity && (
              <DTextInput
                label="Store ID"
                placeholder="e.g. kilimani-duka"
                value={tenantSlug}
                onChangeText={setTenantSlug}
                autoCapitalize="none"
                left={{ icon: 'store' }}
                containerStyle={styles.input}
              />
            )}

            {!identityLoaded ? null : !rememberedIdentity && (
              <DTextInput
                label="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                left={{ icon: 'email-outline' }}
                containerStyle={styles.input}
              />
            )}
            {identityLoaded && rememberedIdentity && (
              <Text style={styles.subtitle}>{email} · {tenantSlug}</Text>
            )}

            <DTextInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              left={{ icon: 'lock-outline' }}
              visibilityToggle
              containerStyle={styles.input}
            />

            <AnimatedPressable
              onPress={handleLogin}
              disabled={loading}
              style={[buttonAnimStyle]}
            >
              <LinearGradient
                colors={['#006D32', '#00D166']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.button}
              >
                <Text style={styles.buttonText}>
                  {loading ? 'Signing in...' : 'Sign in'}
                </Text>
              </LinearGradient>
            </AnimatedPressable>
          </Animated.View>

          <Animated.Text
            entering={FadeInUp.delay(400).duration(500)}
            style={styles.version}
          >
            v1.0.0
          </Animated.Text>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1, justifyContent: 'center' },
  inner: { paddingHorizontal: 24 },
  logoContainer: { alignItems: 'center', marginBottom: 40 },
  logoIcon: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: '#0EA5E9', alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#0EA5E9', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4, shadowRadius: 16, elevation: 12,
  },
  logoEmoji: { fontSize: 32, fontWeight: '900', color: '#FFFFFF' },
  brand: { fontSize: 32, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: '#94A3B8', marginTop: 4 },
  formCard: {
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 5,
  },
  input: { marginBottom: 14 },
  button: {
    height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#0EA5E9', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  buttonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  version: { textAlign: 'center', color: '#64748B', marginTop: 24, fontSize: 13 },
});
