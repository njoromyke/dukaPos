'use client';

import { useState, useEffect, useCallback } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Alert from '@mui/material/Alert';
import IconButton from '@mui/material/IconButton';
import LockIcon from '@mui/icons-material/Lock';
import BackspaceIcon from '@mui/icons-material/Backspace';
import { useAuthStore } from '@/stores/auth-store';
import { usePosStore } from '@/stores/pos-store';
import { authApi } from '@/lib/api';

const SESSION_KEY = 'dukapos_locked';
const IDLE_KEY = 'dukapos_last_activity';

interface Props {
  idleTimeoutMinutes?: number;
}

export default function LockScreen({ idleTimeoutMinutes = 5 }: Props) {
  const auth = useAuthStore();
  const posLocked = usePosStore((state) => state.isLocked);
  const setPosLocked = usePosStore((state) => state.setLocked);
  const [locked, setLocked] = useState(false);
  const [pin, setPin] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'pin' | 'password'>('pin');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(SESSION_KEY) === 'true') {
        setLocked(true);
        setPosLocked(true);
      }
    } catch {}
  }, [setPosLocked]);

  const lock = useCallback(() => {
    try { sessionStorage.setItem(SESSION_KEY, 'true'); } catch {}
    setLocked(true);
    setPosLocked(true);
    setPin('');
    setPassword('');
    setError('');
  }, [setPosLocked]);

  const unlock = useCallback(() => {
    try { sessionStorage.removeItem(SESSION_KEY); } catch {}
    setLocked(false);
    setPosLocked(false);
    setPin('');
    setPassword('');
    setError('');
  }, [setPosLocked]);

  useEffect(() => {
    if (!auth.isAuthenticated || idleTimeoutMinutes <= 0) return;

    const updateActivity = () => {
      try { sessionStorage.setItem(IDLE_KEY, Date.now().toString()); } catch {}
    };
    updateActivity();

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach((e) => window.addEventListener(e, updateActivity, { passive: true }));

    const interval = setInterval(() => {
      try {
        const last = parseInt(sessionStorage.getItem(IDLE_KEY) || '0', 10);
        if (Date.now() - last > idleTimeoutMinutes * 60 * 1000) {
          lock();
        }
      } catch {}
    }, 30_000);

    return () => {
      events.forEach((e) => window.removeEventListener(e, updateActivity));
      clearInterval(interval);
    };
  }, [auth.isAuthenticated, idleTimeoutMinutes, lock]);

  const handlePinDigit = (digit: string) => {
    if (pin.length >= 6) return;
    setPin((p) => p + digit);
    setError('');
  };

  const handlePinBackspace = () => {
    setPin((p) => p.slice(0, -1));
    setError('');
  };

  const handleUnlock = async () => {
    if (mode === 'pin' && pin.length < 4) {
      setError('Enter your PIN');
      return;
    }
    if (mode === 'password' && !password) {
      setError('Enter your password');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const tenantSlug = localStorage.getItem('tenantSlug') || '';
      const email = auth.user?.email || '';
      const credential = mode === 'pin' ? pin : password;
      await authApi.verifyCredential(email, credential, tenantSlug, mode);
      unlock();
    } catch {
      setError(mode === 'pin' ? 'Incorrect PIN' : 'Incorrect password');
      if (mode === 'pin') setPin('');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mode === 'pin' && pin.length === 4) {
      handleUnlock();
    }
  }, [pin]);

  if ((!locked && !posLocked) || !auth.isAuthenticated) return null;

  const initials = (auth.user?.fullName || 'U').split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(24px)',
      }}
    >
      <Paper
        elevation={0}
        sx={{
          p: 4,
          width: '100%',
          maxWidth: 360,
          textAlign: 'center',
          borderRadius: 4,
          bgcolor: '#fff',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)',
        }}
      >
        <Avatar
          sx={{
            width: 64,
            height: 64,
            fontSize: '1.5rem',
            fontWeight: 700,
            mx: 'auto',
            mb: 2,
            background: 'linear-gradient(135deg, #1565C0, #0D47A1)',
          }}
        >
          {initials}
        </Avatar>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
          {auth.user?.fullName}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Session locked
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

        {mode === 'pin' ? (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1.5, mb: 3 }}>
              {[0, 1, 2, 3].map((i) => (
                <Box
                  key={i}
                  sx={{
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    border: '2px solid',
                    borderColor: i < pin.length ? '#1565C0' : '#CBD5E1',
                    bgcolor: i < pin.length ? '#1565C0' : 'transparent',
                    transition: 'all 0.15s',
                  }}
                />
              ))}
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, maxWidth: 240, mx: 'auto', mb: 2 }}>
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((key) => {
                if (key === '') return <Box key="empty" />;
                if (key === 'del') {
                  return (
                    <IconButton
                      key="del"
                      onClick={handlePinBackspace}
                      sx={{ width: 56, height: 56, mx: 'auto' }}
                    >
                      <BackspaceIcon fontSize="small" />
                    </IconButton>
                  );
                }
                return (
                  <Button
                    key={key}
                    variant="outlined"
                    onClick={() => handlePinDigit(key)}
                    disabled={loading}
                    sx={{
                      width: 56,
                      height: 56,
                      minWidth: 0,
                      mx: 'auto',
                      borderRadius: '50%',
                      fontSize: '1.25rem',
                      fontWeight: 600,
                      borderColor: '#E2E8F0',
                      color: '#334155',
                      '&:hover': { bgcolor: '#F1F5F9', borderColor: '#CBD5E1' },
                    }}
                  >
                    {key}
                  </Button>
                );
              })}
            </Box>

            <Button
              size="small"
              onClick={() => { setMode('password'); setPin(''); setError(''); }}
              sx={{ color: '#64748B', textTransform: 'none', fontSize: '0.8rem' }}
            >
              Use password instead
            </Button>
          </>
        ) : (
          <>
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              fullWidth
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleUnlock(); }}
              sx={{ mb: 2 }}
            />
            <Button
              variant="contained"
              fullWidth
              onClick={handleUnlock}
              disabled={loading || !password}
              startIcon={<LockIcon />}
              sx={{
                py: 1.25,
                mb: 1.5,
                background: 'linear-gradient(135deg, #1565C0 0%, #0D47A1 100%)',
                '&:hover': { background: 'linear-gradient(135deg, #1976D2 0%, #1565C0 100%)' },
              }}
            >
              {loading ? 'Verifying...' : 'Unlock'}
            </Button>
            <Button
              size="small"
              onClick={() => { setMode('pin'); setPassword(''); setError(''); }}
              sx={{ color: '#64748B', textTransform: 'none', fontSize: '0.8rem' }}
            >
              Use PIN instead
            </Button>
          </>
        )}
      </Paper>
    </Box>
  );
}
