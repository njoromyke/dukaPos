'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import Alert from '@mui/material/Alert';
import StorefrontIcon from '@mui/icons-material/Storefront';
import EmailIcon from '@mui/icons-material/EmailOutlined';
import LockIcon from '@mui/icons-material/LockOutlined';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useAuthStore } from '@/stores/auth-store';
import { authApi } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const auth = useAuthStore();
  const [tenantSlug, setTenantSlug] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantSlug || !email || !password) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await authApi.login(email, password, tenantSlug);
      const { token, user, tenantId } = res.data;
      auth.login(token, user, tenantId);
      const dest = user.role === 'SuperAdmin' ? '/dashboard/admin' : '/pos';
      router.push(dest);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 4, sm: 5 },
        width: '100%',
        maxWidth: 420,
        bgcolor: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(20px)',
        borderRadius: 4,
        border: '1px solid rgba(255,255,255,0.2)',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
      }}
    >
      <Box textAlign="center" mb={4}>
        <Box sx={{
          width: 56, height: 56, borderRadius: 3, mx: 'auto', mb: 2,
          background: 'linear-gradient(135deg, #1565C0 0%, #0D47A1 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 14px rgba(21, 101, 192, 0.4)',
        }}>
          <StorefrontIcon sx={{ color: '#fff', fontSize: 28 }} />
        </Box>
        <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A', mb: 0.5 }}>
          Welcome back
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Sign in to your DukaPoS terminal
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2, '& .MuiAlert-icon': { alignItems: 'center' } }}>
          {error}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit} display="flex" flexDirection="column" gap={2.5}>
        <TextField
          label="Store ID"
          placeholder="e.g. kilimani-duka or system"
          value={tenantSlug}
          onChange={(e) => setTenantSlug(e.target.value)}
          autoComplete="organization"
          fullWidth
          slotProps={{
            input: {
              startAdornment: <InputAdornment position="start"><StorefrontIcon fontSize="small" sx={{ color: '#64748B' }} /></InputAdornment>,
            },
          }}
        />
        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          fullWidth
          slotProps={{
            input: {
              startAdornment: <InputAdornment position="start"><EmailIcon fontSize="small" sx={{ color: '#64748B' }} /></InputAdornment>,
            },
          }}
        />
        <TextField
          label="Password"
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          fullWidth
          slotProps={{
            input: {
              startAdornment: <InputAdornment position="start"><LockIcon fontSize="small" sx={{ color: '#64748B' }} /></InputAdornment>,
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setShowPassword(!showPassword)} edge="end">
                    {showPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
        />
        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={loading}
          endIcon={!loading && <ArrowForwardIcon />}
          sx={{
            mt: 1,
            py: 1.5,
            fontSize: '1rem',
            background: 'linear-gradient(135deg, #1565C0 0%, #0D47A1 100%)',
            boxShadow: '0 4px 14px rgba(21, 101, 192, 0.35)',
            '&:hover': {
              background: 'linear-gradient(135deg, #1976D2 0%, #1565C0 100%)',
              boxShadow: '0 6px 20px rgba(21, 101, 192, 0.45)',
            },
          }}
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </Button>
      </Box>

      <Typography variant="caption" display="block" textAlign="center" mt={3} color="text.secondary">
        Use &quot;system&quot; as Store ID for Super Admin access
      </Typography>
    </Paper>
  );
}
