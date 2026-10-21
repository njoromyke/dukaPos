'use client';

import Tooltip from '@mui/material/Tooltip';
import Button from '@mui/material/Button';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

export default function DFeatureUpgradeHint({ feature, label }: { feature: string; label: string }) {
  return (
    <Tooltip title={`${label} is available on Intermediate and Business plans. Contact the seller for an upgrade: 0729842998.`} arrow>
      <Button size="small" color="primary" startIcon={<InfoOutlinedIcon />} aria-label={`${label} plan information`}>
        {label} · Upgrade
      </Button>
    </Tooltip>
  );
}
