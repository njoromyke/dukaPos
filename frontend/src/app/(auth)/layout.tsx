'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 40%, #1565C0 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            radial-gradient(circle at 20% 50%, rgba(21, 101, 192, 0.15) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(124, 58, 237, 0.1) 0%, transparent 40%),
            radial-gradient(circle at 60% 80%, rgba(5, 150, 105, 0.08) 0%, transparent 40%)
          `,
          pointerEvents: 'none',
        }}
      />

      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          flex: 1,
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          px: 8,
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Box sx={{ maxWidth: 440 }}>
          <Typography variant="h3" sx={{ color: '#fff', fontWeight: 800, mb: 2, letterSpacing: '-0.02em' }}>
            DukaPoS
          </Typography>
          <Typography variant="h5" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 400, mb: 4, lineHeight: 1.5 }}>
            Multi-tenant point of sale &amp; inventory management
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {[
              { title: 'Real-time inventory', desc: 'Track stock across all branches instantly' },
              { title: 'M-Pesa integration', desc: 'Accept mobile money payments seamlessly' },
              { title: 'Multi-branch control', desc: 'Manage every store from one dashboard' },
            ].map((f) => (
              <Box key={f.title} sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                <Box sx={{
                  width: 8, height: 8, borderRadius: '50%', mt: 1,
                  background: 'linear-gradient(135deg, #42A5F5, #7C3AED)', flexShrink: 0,
                }} />
                <Box>
                  <Typography sx={{ color: '#fff', fontWeight: 600, fontSize: '0.95rem' }}>{f.title}</Typography>
                  <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>{f.desc}</Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flex: { xs: 1, md: 'none' },
          width: { md: 520 },
          bgcolor: { md: 'rgba(255,255,255,0.03)' },
          backdropFilter: { md: 'blur(40px)' },
          borderLeft: { md: '1px solid rgba(255,255,255,0.06)' },
          p: { xs: 3, md: 6 },
          position: 'relative',
          zIndex: 1,
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
