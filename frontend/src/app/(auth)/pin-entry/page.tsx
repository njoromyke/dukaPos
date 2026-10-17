'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import IconButton from '@mui/material/IconButton';
import BackspaceIcon from '@mui/icons-material/BackspaceOutlined';
import { useAuthStore } from '@/stores/auth-store';
import { authApi } from '@/lib/api';

export default function PinEntryPage() {
  const router = useRouter();
  const auth = useAuthStore();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDigit = async (digit: string) => {
    if (pin.length >= 4) return;
    const newPin = pin + digit;
    setPin(newPin);
    setError('');
    if (newPin.length === 4) {
      setLoading(true);
      try {
        const res = await authApi.pinLogin(newPin);
        const u = res.data.user;
        auth.login(res.data.token, { ...u, fullName: u.fullName || u.name }, auth.tenantId || '');
        router.push('/pos');
      } catch {
        setError('Invalid PIN');
        setPin('');
      } finally {
        setLoading(false);
      }
    }
  };

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back'];

  return (
    <Paper elevation={0} sx={{ p: 5, width: '100%', maxWidth: 360, textAlign: 'center', border: '1px solid', borderColor: 'divider' }}>
      <Avatar sx={{ width: 72, height: 72, mx: 'auto', mb: 2, bgcolor: 'primary.main', fontSize: 28 }}>
        {auth.user?.fullName?.[0] || '?'}
      </Avatar>
      <Typography variant="h6" gutterBottom>{auth.user?.fullName || 'Cashier'}</Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>Enter your PIN</Typography>

      <Box display="flex" justifyContent="center" gap={2} mb={2}>
        {[0, 1, 2, 3].map((i) => (
          <Box
            key={i}
            sx={{
              width: 16, height: 16, borderRadius: '50%',
              bgcolor: i < pin.length ? 'primary.main' : 'action.disabledBackground',
              transition: 'all 0.15s',
              transform: i < pin.length ? 'scale(1.3)' : 'scale(1)',
            }}
          />
        ))}
      </Box>

      {error && <Typography variant="body2" color="error" mb={1}>{error}</Typography>}

      <Box display="grid" gridTemplateColumns="repeat(3, 1fr)" gap={1} maxWidth={280} mx="auto" mt={2}>
        {digits.map((d, i) => {
          if (d === '') return <Box key={i} />;
          if (d === 'back') {
            return (
              <IconButton key={i} onClick={() => { setPin(pin.slice(0, -1)); setError(''); }}
                sx={{ width: 64, height: 64, mx: 'auto' }}>
                <BackspaceIcon />
              </IconButton>
            );
          }
          return (
            <Button key={i} variant="outlined" onClick={() => handleDigit(d)} disabled={loading}
              sx={{ width: 64, height: 64, mx: 'auto', fontSize: 22, fontWeight: 700, borderRadius: 3 }}>
              {d}
            </Button>
          );
        })}
      </Box>

      <Button variant="text" onClick={() => router.push('/login')} sx={{ mt: 3 }}>
        Switch account
      </Button>
    </Paper>
  );
}
