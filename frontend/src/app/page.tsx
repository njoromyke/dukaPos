'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';

export default function Home() {
  const router = useRouter();
  const auth = useAuthStore();

  useEffect(() => {
    auth.hydrate();
  }, []);

  useEffect(() => {
    if (auth.isAuthenticated) {
      const dest = auth.user?.role === 'SuperAdmin' ? '/dashboard/admin' : '/pos';
      router.replace(dest);
    } else if (typeof window !== 'undefined' && !localStorage.getItem('token')) {
      router.replace('/login');
    }
  }, [auth.isAuthenticated, auth.user, router]);

  return (
    <Box display="flex" alignItems="center" justifyContent="center" minHeight="100vh">
      <CircularProgress />
    </Box>
  );
}
