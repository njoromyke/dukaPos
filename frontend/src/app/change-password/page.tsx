'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import LockResetIcon from '@mui/icons-material/LockReset';
import { useAuthStore } from '@/stores/auth-store';
import { usersApi } from '@/lib/api';

export default function ChangePasswordPage() {
  const router = useRouter();
  const auth = useAuthStore();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await usersApi.changePassword(auth.user?.id || '', currentPassword, newPassword);
      const dest = auth.user?.role === 'SuperAdmin' ? '/dashboard/admin' : '/pos';
      router.push(dest);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(ellipse at 50% 15%, rgba(5,150,105,.2), transparent 42%), linear-gradient(135deg, #0B1627 0%, #1E293B 55%, #0F172A 100%)',
      p: 2,
    }}>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 4, sm: 5 },
          width: '100%',
          maxWidth: 420,
          bgcolor: '#fff',
          borderRadius: 3,
          border: '1px solid #E2E8F0',
          boxShadow: '0 30px 80px -28px rgba(0,0,0,.55)',
        }}
      >
        <Box textAlign="center" mb={4}>
          <Box sx={{
            width: 56, height: 56, borderRadius: 3, mx: 'auto', mb: 2,
            background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <LockResetIcon sx={{ color: '#fff', fontSize: 28 }} />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A', mb: 0.5 }}>
            Change Password
          </Typography>
          <Typography variant="body2" color="text.secondary">
            You must change your password before continuing
          </Typography>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

        <Box component="form" onSubmit={handleSubmit} display="flex" flexDirection="column" gap={2.5}>
          <TextField label="Current Password" type="password" value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)} fullWidth required />
          <TextField label="New Password" type="password" value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)} fullWidth required
            helperText="At least 8 characters" />
          <TextField label="Confirm New Password" type="password" value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)} fullWidth required />
          <Button type="submit" variant="contained" size="large" disabled={loading}
            sx={{
              mt: 1, py: 1.5,
              bgcolor: '#059669',
              '&:hover': { bgcolor: '#047857' },
            }}>
            {loading ? 'Changing...' : 'Change Password'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
