'use client';

import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import api from '@/lib/api';

type PackageInfo = {
  id: string;
  name: string;
  monthlyPrice: number;
  lifetimePrice: number | null;
  maxBranches: number;
  features: string[];
};

type SubscriptionInfo = { packageId: string; packageName: string; billingCycle: number; status: number };

export default function DPlanUpgradeHint({ compact = false }: { compact?: boolean }) {
  const [current, setCurrent] = useState<SubscriptionInfo | null>(null);
  const [nextPackage, setNextPackage] = useState<PackageInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([
      api.get('/api/subscriptions/current').catch(() => ({ data: null })),
      api.get('/api/subscriptions/packages').catch(() => ({ data: [] })),
    ]).then(([subscriptionResult, packageResult]) => {
      if (!active) return;
      const subscription = subscriptionResult.data as SubscriptionInfo | null;
      const packages = (Array.isArray(packageResult.data) ? packageResult.data : []) as PackageInfo[];
      const currentPackage = packages.find((item) => item.id === subscription?.packageId);
      const recommendation = currentPackage
        ? packages.filter((item) => item.maxBranches > currentPackage.maxBranches)
          .sort((a, b) => a.maxBranches - b.maxBranches)[0]
        : packages.sort((a, b) => a.maxBranches - b.maxBranches)[0];
      setCurrent(subscription);
      setNextPackage(recommendation || null);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 1 }}><CircularProgress size={18} /></Box>;
  if (!nextPackage) return null;

  return (
    <Box sx={{ p: compact ? 1.5 : 2, borderRadius: 2, bgcolor: 'primary.50', border: '1px solid', borderColor: 'primary.100' }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
        <AutoAwesomeOutlinedIcon color="primary" fontSize="small" sx={{ mt: 0.25 }} />
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
            <Typography variant="body2" fontWeight={700}>Grow to more stores</Typography>
            {current?.packageName && <Chip size="small" label={current.packageName} />}
          </Box>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.35 }}>
            {nextPackage.name} adds more stores and tools, with up to {nextPackage.maxBranches} locations. KES {nextPackage.monthlyPrice.toLocaleString()}/month
            {nextPackage.lifetimePrice ? ` or KES ${nextPackage.lifetimePrice.toLocaleString()} one-time` : ''}.
            {' '}Contact the seller for an upgrade: 0729842998.
          </Typography>
          <Button component="a" href="tel:+254729842998" size="small" sx={{ mt: 0.5, px: 0, minWidth: 0, fontWeight: 700 }}>
            Contact seller
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
