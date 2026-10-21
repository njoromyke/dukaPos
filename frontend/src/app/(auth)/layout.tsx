'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import PointOfSaleIcon from '@mui/icons-material/PointOfSaleOutlined';
import InventoryIcon from '@mui/icons-material/Inventory2Outlined';
import AssessmentIcon from '@mui/icons-material/AssessmentOutlined';
import PeopleIcon from '@mui/icons-material/PeopleOutlined';

const features = [
  { icon: <PointOfSaleIcon />, title: 'Fast Checkout', desc: 'Process sales in seconds' },
  { icon: <InventoryIcon />, title: 'Smart Inventory', desc: 'Real-time stock tracking' },
  { icon: <AssessmentIcon />, title: 'Live Analytics', desc: 'Insights that drive growth' },
  { icon: <PeopleIcon />, title: 'Team Management', desc: 'Roles & permissions' },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#070D19',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Ambient glow orbs */}
      <Box sx={{
        position: 'absolute', top: '-20%', left: '-10%',
        width: '50vw', height: '50vw', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(5, 150, 105, 0.12) 0%, transparent 70%)',
        filter: 'blur(80px)', pointerEvents: 'none',
      }} />
      <Box sx={{
        position: 'absolute', bottom: '-25%', right: '-15%',
        width: '60vw', height: '60vw', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(2, 132, 199, 0.1) 0%, transparent 70%)',
        filter: 'blur(100px)', pointerEvents: 'none',
      }} />
      <Box sx={{
        position: 'absolute', top: '30%', right: '20%',
        width: '25vw', height: '25vw', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, transparent 70%)',
        filter: 'blur(60px)', pointerEvents: 'none',
      }} />

      {/* Grid pattern overlay */}
      <Box sx={{
        position: 'absolute', inset: 0,
        backgroundImage: `
          linear-gradient(rgba(51, 65, 85, 0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(51, 65, 85, 0.03) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
        pointerEvents: 'none',
      }} />

      <Box sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        alignItems: 'center',
        gap: { xs: 4, md: 8 },
        maxWidth: 960,
        width: '100%',
        px: 3,
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Left side - Branding */}
        <Box sx={{ flex: 1, display: { xs: 'none', md: 'block' } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4 }}>
            <Box sx={{
              width: 44, height: 44, borderRadius: 3,
              background: 'linear-gradient(135deg, #059669, #10B981)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(5, 150, 105, 0.3)',
            }}>
              <PointOfSaleIcon sx={{ color: '#fff', fontSize: 24 }} />
            </Box>
            <Typography sx={{ fontWeight: 800, fontSize: '1.5rem', color: '#fff', letterSpacing: '-0.02em' }}>
              Duka<span style={{ color: '#34D399' }}>POS</span>
            </Typography>
          </Box>

          <Typography sx={{
            fontSize: '2.5rem', fontWeight: 800, color: '#F8FAFC',
            lineHeight: 1.15, letterSpacing: '-0.03em', mb: 2,
          }}>
            Your retail<br />
            <span style={{
              background: 'linear-gradient(135deg, #34D399, #0284C7)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              operating system
            </span>
          </Typography>

          <Typography sx={{ color: '#64748B', fontSize: '1rem', lineHeight: 1.7, mb: 4, maxWidth: 380 }}>
            Manage your entire retail operation from a single platform. Fast POS, smart inventory, and real-time analytics.
          </Typography>

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            {features.map((f) => (
              <Box key={f.title} sx={{
                p: 2, borderRadius: 3,
                bgcolor: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(51, 65, 85, 0.4)',
                backdropFilter: 'blur(8px)',
              }}>
                <Box sx={{ color: '#34D399', mb: 1, '& .MuiSvgIcon-root': { fontSize: 22 } }}>{f.icon}</Box>
                <Typography sx={{ fontSize: '0.8125rem', fontWeight: 700, color: '#E2E8F0', mb: 0.25 }}>{f.title}</Typography>
                <Typography sx={{ fontSize: '0.7rem', color: '#64748B' }}>{f.desc}</Typography>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Right side - Auth content */}
        {children}
      </Box>
    </Box>
  );
}
