import { Redirect } from 'expo-router';
import { useAuthStore } from '@/stores';

export default function Index() {
  const { isAuthenticated } = useAuthStore();
  return <Redirect href={isAuthenticated ? '/(tabs)' : '/(auth)/login'} />;
}
