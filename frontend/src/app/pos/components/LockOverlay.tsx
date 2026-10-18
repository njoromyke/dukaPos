'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import BackspaceIcon from '@mui/icons-material/BackspaceOutlined';
import { useAuthStore } from '@/stores/auth-store';
import { usePosStore } from '@/stores/pos-store';
import { terminalApi } from '@/lib/api';

export default function LockOverlay() {
  const auth = useAuthStore();
  const pos = usePosStore();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDigit = async (d: string) => {
    if (pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    setError('');
    if (next.length === 4) {
      setLoading(true);
      try {
        await terminalApi.unlockWithPin('current', next);
        pos.setLocked(false);
      } catch {
        setError('Invalid PIN');
        setPin('');
      } finally { setLoading(false); }
    }
  };

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back'];

  return (
    <Box sx={{
      position: 'fixed', inset: 0, zIndex: 9999, bgcolor: 'background.default',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
    }}>
      <Avatar sx={{ width: 72, height: 72, mb: 2, bgcolor: 'primary.main', fontSize: 28 }}>
        {auth.user?.fullName?.[0] || '?'}
      </Avatar>
      <Typography variant="h6" gutterBottom>{auth.user?.fullName || 'Locked'}</Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>Enter PIN to unlock</Typography>

      <Box display="flex" gap={2} mb={2}>
        {[0, 1, 2, 3].map((i) => (
          <Box key={i} sx={{
            width: 16, height: 16, borderRadius: '50%',
            bgcolor: i < pin.length ? 'primary.main' : 'action.disabledBackground',
            transition: 'transform 0.15s', transform: i < pin.length ? 'scale(1.3)' : 'scale(1)',
          }} />
        ))}
      </Box>

      {error && <Typography variant="body2" color="error" mb={1}>{error}</Typography>}

      <Box display="grid" gridTemplateColumns="repeat(3, 1fr)" gap={1} sx={{ maxWidth: 280 }}>
        {digits.map((d, i) => {
          if (d === '') return <Box key={i} />;
          if (d === 'back') return (
            <IconButton key={i} onClick={() => { setPin(pin.slice(0, -1)); setError(''); }}
              sx={{ width: 72, height: 72, mx: 'auto' }}>
              <BackspaceIcon />
            </IconButton>
          );
          return (
            <Button key={i} variant="outlined" onClick={() => handleDigit(d)} disabled={loading}
              sx={{ width: 72, height: 72, mx: 'auto', fontSize: 24, fontWeight: 700, borderRadius: 3 }}>
              {d}
            </Button>
          );
        })}
      </Box>
    </Box>
  );
}
