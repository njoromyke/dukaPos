'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import { useAuthStore } from '@/stores/auth-store';
import { usePosStore } from '@/stores/pos-store';
import LockOverlay from './components/LockOverlay';

export default function PosLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const auth = useAuthStore();
  const pos = usePosStore();

  useEffect(() => { auth.hydrate(); }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('token')) {
      router.replace('/login');
    }
  }, [router]);

  return (
    <Box sx={{ height: '100vh', width: '100vw', overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {children}
      {pos.isLocked && <LockOverlay />}
    </Box>
  );
}
