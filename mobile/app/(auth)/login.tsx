import { useState, useRef } from 'react';
import {
  View, StyleSheet, KeyboardAvoidingView, Platform,
  Alert, Pressable, Keyboard,
} from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeInDown, FadeInUp, useSharedValue,
  useAnimatedStyle, withSpring, withSequence,
} from 'react-native-reanimated';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores';
import { authApi } from '@/lib/api';
import { Colors } from '@/constants/Colors';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function LoginScreen() {
  const auth = useAuthStore();
  const [tenantSlug, setTenantSlug] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
    if (!tenantSlug || !email || !password) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
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
      const { token, user, tenantId } = res.data;

      await SecureStore.setItemAsync('token', token);
      await SecureStore.setItemAsync('tenantId', tenantId);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      auth.login(token, user, tenantId);
      router.replace('/(tabs)');
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      shakeX.value = withSequence(
        withSpring(12, { damping: 2, stiffness: 800 }),
        withSpring(-12, { damping: 2, stiffness: 800 }),
        withSpring(0, { damping: 10, stiffness: 400 }),
      );
      Alert.alert('Login failed', err.response?.data?.message || 'Check your credentials');
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
          {/* Logo */}
          <Animated.View entering={FadeInDown.duration(600).springify()} style={styles.logoContainer}>
            <View style={styles.logoIcon}>
              <Text style={styles.logoEmoji}>D</Text>
            </View>
            <Text style={styles.brand}>DukaPoS</Text>
            <Text style={styles.subtitle}>Point of Sale Terminal</Text>
          </Animated.View>

          {/* Form */}
          <Animated.View
            entering={FadeInUp.delay(200).duration(500).springify()}
            style={[styles.formCard, formAnimStyle]}
          >
            <TextInput
              label="Store ID"
              mode="outlined"
              placeholder="e.g. kilimani-duka"
              value={tenantSlug}
              onChangeText={setTenantSlug}
              autoCapitalize="none"
              left={<TextInput.Icon icon="store" />}
              style={styles.input}
              outlineStyle={styles.inputOutline}
              theme={{ roundness: 12 }}
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
              outlineStyle={styles.inputOutline}
              theme={{ roundness: 12 }}
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
              outlineStyle={styles.inputOutline}
              theme={{ roundness: 12 }}
            />

            <AnimatedPressable
              onPress={handleLogin}
              disabled={loading}
              style={[buttonAnimStyle]}
            >
              <LinearGradient
                colors={Colors.light.gradient as unknown as string[]}
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
  input: { marginBottom: 14, backgroundColor: '#FFFFFF' },
  inputOutline: { borderColor: '#E2E8F0' },
  button: {
    height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#0EA5E9', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  buttonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  version: { textAlign: 'center', color: '#64748B', marginTop: 24, fontSize: 13 },
});
