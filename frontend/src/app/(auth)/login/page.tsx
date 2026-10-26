'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
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
import PointOfSaleIcon from '@mui/icons-material/PointOfSaleOutlined';
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
  const [rememberedIdentity, setRememberedIdentity] = useState(false);

  useEffect(() => {
    const savedSlug = localStorage.getItem('tenantSlug') || '';
    const savedEmail = localStorage.getItem('loginEmail') || '';
    if (savedSlug && savedEmail) {
      setTenantSlug(savedSlug);
      setEmail(savedEmail);
      setRememberedIdentity(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!rememberedIdentity && (!tenantSlug || !email)) || !password) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await authApi.login(email, password, tenantSlug);
      const { token, user, tenantId, mustChangePassword } = res.data;
      const userInfo = { ...user, fullName: user.fullName || user.name };
      auth.login(token, userInfo, tenantId);
      localStorage.setItem('tenantSlug', tenantSlug.trim().toLowerCase());
      localStorage.setItem('loginEmail', email.trim());
      if (mustChangePassword) {
        router.push('/change-password');
      } else {
        const dest = user.role === 'SuperAdmin' ? '/dashboard/admin' : '/pos';
        router.push(dest);
      }
    } catch (err: unknown) {
      const failure = err as { message?: string; response?: { status?: number; config?: { baseURL?: string }; data?: { message?: string } } };
      const msg = failure.response?.data?.message;
      setError(msg || (failure.response?.status === 403
        ? `Access was denied by ${failure.response.config?.baseURL || 'the configured API'} (HTTP 403). Confirm this is the intended DukaPoS API.`
        : failure.response?.status
        ? `The server at ${failure.response.config?.baseURL || 'the configured API'} returned HTTP ${failure.response.status}. Verify the API address and try again.`
        : `Cannot reach the DukaPoS server. ${failure.message || 'Check your network connection and try again.'}`));
    } finally {
      setLoading(false);
    }
  };

  const darkInput = {
    '& .MuiOutlinedInput-root': {
      backgroundColor: 'rgba(15, 23, 42, 0.6) !important',
      borderRadius: '10px',
      color: '#E2E8F0',
      '& .MuiOutlinedInput-notchedOutline': {
        borderColor: 'rgba(51, 65, 85, 0.6) !important',
      },
      '&:hover .MuiOutlinedInput-notchedOutline': {
        borderColor: 'rgba(100, 116, 139, 0.6) !important',
      },
      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
        borderColor: '#059669 !important',
        borderWidth: 2,
      },
      '& .MuiInputAdornment-root .MuiSvgIcon-root': {
        color: '#475569',
      },
      '& input': {
        color: '#E2E8F0',
        '&::placeholder': { color: '#475569', opacity: 1 },
        '&:-webkit-autofill': {
          WebkitBoxShadow: '0 0 0 100px rgba(15, 23, 42, 0.9) inset !important',
          WebkitTextFillColor: '#E2E8F0 !important',
          caretColor: '#E2E8F0',
        },
      },
    },
    '& .MuiInputLabel-root': { color: '#64748B' },
    '& .MuiInputLabel-root.Mui-focused': { color: '#34D399' },
  };

  return (
    <Box sx={{
      width: '100%',
      maxWidth: 420,
      p: { xs: 3, sm: 4 },
      borderRadius: 4,
      bgcolor: 'rgba(15, 23, 42, 0.7)',
      backdropFilter: 'blur(24px)',
      border: '1px solid rgba(51, 65, 85, 0.5)',
      boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(5, 150, 105, 0.06)',
    }}>
      {/* Mobile logo */}
      <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1.5, mb: 3, justifyContent: 'center' }}>
        <Box sx={{
          width: 36, height: 36, borderRadius: 2.5,
          background: 'linear-gradient(135deg, #059669, #10B981)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <PointOfSaleIcon sx={{ color: '#fff', fontSize: 20 }} />
        </Box>
        <Typography sx={{ fontWeight: 800, fontSize: '1.2rem', color: '#fff' }}>
          Duka<span style={{ color: '#34D399' }}>POS</span>
        </Typography>
      </Box>

      <Box textAlign="center" mb={3.5}>
        <Typography sx={{ fontWeight: 800, fontSize: '1.5rem', color: '#F8FAFC', mb: 0.5 }}>
          Welcome back
        </Typography>
        <Typography sx={{ fontSize: '0.875rem', color: '#64748B' }}>
          Sign in to your DukaPoS terminal
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{
          mb: 2.5, borderRadius: 2.5,
          bgcolor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          color: '#FCA5A5',
          '& .MuiAlert-icon': { color: '#F87171', alignItems: 'center' },
        }}>
          {error}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit} display="flex" flexDirection="column" gap={2.5}>
        {!rememberedIdentity && (
          <TextField
            label="Store ID"
            placeholder="e.g. kilimani-duka or system"
            value={tenantSlug}
            onChange={(e) => setTenantSlug(e.target.value)}
            autoComplete="organization"
            fullWidth
            sx={darkInput}
            slotProps={{
              input: {
                startAdornment: <InputAdornment position="start"><StorefrontIcon fontSize="small" sx={{ color: '#475569' }} /></InputAdornment>,
              },
            }}
          />
        )}
        {!rememberedIdentity && (
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            fullWidth
            sx={darkInput}
            slotProps={{
              input: {
                startAdornment: <InputAdornment position="start"><EmailIcon fontSize="small" sx={{ color: '#475569' }} /></InputAdornment>,
              },
            }}
          />
        )}
        {rememberedIdentity && (
          <Box sx={{
            p: 1.5, borderRadius: 2.5,
            bgcolor: 'rgba(5, 150, 105, 0.08)',
            border: '1px solid rgba(5, 150, 105, 0.15)',
            textAlign: 'center',
          }}>
            <Typography sx={{ fontSize: '0.8125rem', color: '#94A3B8' }}>
              <span style={{ color: '#E2E8F0', fontWeight: 600 }}>{email}</span> &middot; {tenantSlug}
            </Typography>
            <Typography
              component="button"
              onClick={() => { setRememberedIdentity(false); setTenantSlug(''); setEmail(''); localStorage.removeItem('tenantSlug'); localStorage.removeItem('loginEmail'); }}
              sx={{
                background: 'none', border: 'none', cursor: 'pointer', p: 0, mt: 0.5,
                fontSize: '0.7rem', color: '#34D399', fontWeight: 600,
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              Use different account
            </Typography>
          </Box>
        )}
        <TextField
          label="Password"
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          fullWidth
          sx={darkInput}
          slotProps={{
            input: {
              startAdornment: <InputAdornment position="start"><LockIcon fontSize="small" sx={{ color: '#475569' }} /></InputAdornment>,
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setShowPassword(!showPassword)} edge="end" sx={{ color: '#64748B' }}>
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
            mt: 0.5, py: 1.5, fontSize: '0.9375rem',
            background: 'linear-gradient(135deg, #059669, #10B981)',
            boxShadow: '0 4px 16px rgba(5, 150, 105, 0.35)',
            borderRadius: 2.5,
            '&:hover': {
              background: 'linear-gradient(135deg, #047857, #059669)',
              boxShadow: '0 6px 24px rgba(5, 150, 105, 0.45)',
            },
            '&.Mui-disabled': {
              bgcolor: 'rgba(5, 150, 105, 0.3)', color: 'rgba(255,255,255,0.5)',
            },
          }}
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </Button>
      </Box>

      <Typography sx={{
        display: 'block', textAlign: 'center', mt: 3,
        fontSize: '0.7rem', color: '#475569',
      }}>
        Use &quot;system&quot; as Store ID for Super Admin access
      </Typography>
    </Box>
  );
}
