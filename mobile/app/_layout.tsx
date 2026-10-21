import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import * as SecureStore from 'expo-secure-store';
import { useFonts, SpaceGrotesk_500Medium, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { useAuthStore, usePosStore, useThemeStore, useHapticsStore } from '@/stores';
import { ThemeProvider } from '@/lib/theme';
import { Colors } from '@/constants/Colors';
import { registerForPushNotifications } from '@/lib/notifications';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 2, staleTime: 30_000 } },
});

export default function RootLayout() {
  const auth = useAuthStore();
  const themeMode = useThemeStore((state) => state.mode);
  const isDark = themeMode === 'dark';
  const palette = isDark ? Colors.dark : Colors.light;

  const [fontsLoaded] = useFonts({
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    (async () => {
      try {
        const token = await SecureStore.getItemAsync('token');
        const tenantId = await SecureStore.getItemAsync('tenantId');
        const savedUser = await SecureStore.getItemAsync('user');
        const savedFeatures = await SecureStore.getItemAsync('subscriptionFeatures');
        const savedTheme = await SecureStore.getItemAsync('themeMode');
        const terminalLocked = await SecureStore.getItemAsync('terminalLocked');
        const hapticsEnabled = await SecureStore.getItemAsync('hapticsEnabled');
        if (savedTheme === 'dark' || savedTheme === 'light') {
          useThemeStore.getState().setMode(savedTheme);
        }
        if (hapticsEnabled !== null) {
          useHapticsStore.getState().setEnabled(hapticsEnabled !== 'false');
        }
        if (token && tenantId && savedUser) {
          auth.login(token, JSON.parse(savedUser), tenantId, savedFeatures ? JSON.parse(savedFeatures) : []);
          usePosStore.getState().setLocked(terminalLocked === 'true');
          registerForPushNotifications();
        } else {
          await SecureStore.deleteItemAsync('token');
          await SecureStore.deleteItemAsync('tenantId');
          await SecureStore.deleteItemAsync('user');
        }
      } finally {
        if (fontsLoaded) await SplashScreen.hideAsync();
      }
    })();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <Stack
            screenOptions={{
              headerShown: false,
              animation: 'fade',
              contentStyle: { backgroundColor: palette.background },
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="scanner"
              options={{
                presentation: 'fullScreenModal',
                animation: 'slide_from_bottom',
              }}
            />
            <Stack.Screen
              name="sales-history"
              options={{ animation: 'slide_from_right' }}
            />
          </Stack>
        </ThemeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
