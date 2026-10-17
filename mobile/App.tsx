import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { PaperProvider } from 'react-native-paper';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';

import { lightTheme } from './theme';
import { useAuthStore, usePosStore } from './stores';

import LoginScreen from './screens/LoginScreen';
import LockScreen from './screens/LockScreen';
import PosScreen from './screens/PosScreen';
import BarcodeScanner from './screens/BarcodeScanner';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const queryClient = new QueryClient();

// ── Bottom tab navigator for the main app ──
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { height: 60, paddingBottom: 8 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="POS"
        component={PosScreen}
        options={{ tabBarIcon: ({ color }) => <TabIcon name="cart" color={color} /> }}
      />
      <Tab.Screen
        name="Inventory"
        component={PlaceholderScreen('Inventory')}
        options={{ tabBarIcon: ({ color }) => <TabIcon name="package-variant" color={color} /> }}
      />
      <Tab.Screen
        name="Reports"
        component={PlaceholderScreen('Reports')}
        options={{ tabBarIcon: ({ color }) => <TabIcon name="chart-bar" color={color} /> }}
      />
      <Tab.Screen
        name="Settings"
        component={PlaceholderScreen('Settings')}
        options={{ tabBarIcon: ({ color }) => <TabIcon name="cog-outline" color={color} /> }}
      />
    </Tab.Navigator>
  );
}

// Placeholder for screens not yet built
function PlaceholderScreen(name: string) {
  return function Screen() {
    const { Text, useTheme } = require('react-native-paper');
    const { View } = require('react-native');
    const theme = useTheme();
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background }}>
        <Text variant="headlineSmall" style={{ fontWeight: '700' }}>{name}</Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.outline, marginTop: 4 }}>
          Coming in Phase 4
        </Text>
      </View>
    );
  };
}

function TabIcon({ name, color }: { name: string; color: string }) {
  const { Icon } = require('react-native-paper');
  return <Icon source={name} size={24} color={color} />;
}

export default function App() {
  const auth = useAuthStore();
  const pos = usePosStore();
  const [initializing, setInitializing] = useState(true);

  // Restore auth on app start
  useEffect(() => {
    (async () => {
      const token = await SecureStore.getItemAsync('token');
      const tenantId = await SecureStore.getItemAsync('tenantId');
      if (token && tenantId) {
        // In production, validate the token with the API
        auth.login(token, null as any, tenantId);
      }
      setInitializing(false);
    })();
  }, []);

  if (initializing) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider theme={lightTheme}>
        <StatusBar style="dark" />
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            {!auth.isAuthenticated ? (
              <Stack.Screen name="Login">
                {() => <LoginScreen onLogin={() => {}} />}
              </Stack.Screen>
            ) : pos.isLocked ? (
              <Stack.Screen name="Lock">
                {() => <LockScreen onUnlock={() => pos.setLocked(false)} />}
              </Stack.Screen>
            ) : (
              <>
                <Stack.Screen name="Main" component={MainTabs} />
                <Stack.Screen name="Scanner" options={{ presentation: 'fullScreenModal' }}>
                  {({ navigation }) => (
                    <BarcodeScanner
                      onProductFound={(p) => {
                        navigation.goBack();
                        // Product is added to cart via PosScreen
                      }}
                      onClose={() => navigation.goBack()}
                    />
                  )}
                </Stack.Screen>
              </>
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </PaperProvider>
    </QueryClientProvider>
  );
}
