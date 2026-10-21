'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import { useAuthStore } from '@/stores/auth-store';
import LockScreen from '@/components/LockScreen';

export default function PosLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const auth = useAuthStore();

  useEffect(() => { auth.hydrate(); }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('token')) {
      router.replace('/login');
    }
  }, [router]);

  return (
    <Box sx={{ height: '100vh', width: '100vw', overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {children}
      <LockScreen idleTimeoutMinutes={5} />
    </Box>
  );
}
