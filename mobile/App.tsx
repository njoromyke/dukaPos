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
import InventoryScreen from './screens/InventoryScreen';
import ReportsScreen from './screens/ReportsScreen';
import SettingsScreen from './screens/SettingsScreen';
import ProductDetailScreen from './screens/ProductDetailScreen';
import SalesHistoryScreen from './screens/SalesHistoryScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const queryClient = new QueryClient();

function TabIcon({ name, color }: { name: string; color: string }) {
  const { Icon } = require('react-native-paper');
  return <Icon source={name} size={24} color={color} />;
}

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
        component={InventoryScreen}
        options={{ tabBarIcon: ({ color }) => <TabIcon name="package-variant" color={color} /> }}
      />
      <Tab.Screen
        name="Reports"
        component={ReportsScreen}
        options={{ tabBarIcon: ({ color }) => <TabIcon name="chart-bar" color={color} /> }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ tabBarIcon: ({ color }) => <TabIcon name="cog-outline" color={color} /> }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const auth = useAuthStore();
  const pos = usePosStore();
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    (async () => {
      const token = await SecureStore.getItemAsync('token');
      const tenantId = await SecureStore.getItemAsync('tenantId');
      if (token && tenantId) {
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
                      }}
                      onClose={() => navigation.goBack()}
                    />
                  )}
                </Stack.Screen>
                <Stack.Screen name="ProductDetail" component={ProductDetailScreen}
                  options={{ presentation: 'card' }} />
                <Stack.Screen name="SalesHistory" component={SalesHistoryScreen}
                  options={{ presentation: 'card' }} />
              </>
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </PaperProvider>
    </QueryClientProvider>
  );
}
