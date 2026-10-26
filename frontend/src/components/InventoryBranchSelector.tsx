'use client';

import { useEffect, useState } from 'react';
import { Chip, MenuItem, TextField } from '@mui/material';
import { adminApi } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';

interface BranchOption {
  id: string;
  label: string;
}

interface Props {
  value: string;
  onChange: (branchId: string) => void;
}

export default function InventoryBranchSelector({ value, onChange }: Props) {
  const user = useAuthStore((state) => state.user);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [loading, setLoading] = useState(false);
  const isSuperAdmin = user?.role === 'SuperAdmin';

  useEffect(() => {
    if (!isSuperAdmin) return;
    let active = true;
    setLoading(true);
    adminApi.getTenants()
      .then(({ data }) => {
        if (!active) return;
        const options = (Array.isArray(data) ? data : []).flatMap((tenant: any) =>
          (tenant.isActive ? tenant.branches || [] : [])
            .filter((branch: any) => branch.isActive)
            .map((branch: any) => ({ id: branch.id, label: `${tenant.name} · ${branch.name}` }))
        );
        setBranches(options);
      })
      .catch(() => {
        if (active) setBranches([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [isSuperAdmin]);

  useEffect(() => {
    if (isSuperAdmin && !value && branches.length > 0) onChange(branches[0].id);
  }, [isSuperAdmin, value, branches, onChange]);

  if (isSuperAdmin) {
    return (
      <TextField
        select
        size="small"
        label="Tenant · Branch"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={loading || branches.length === 0}
        sx={{ minWidth: { xs: '100%', sm: 260 }, mb: 0 }}
      >
        {branches.length === 0 && <MenuItem value="">No active branches</MenuItem>}
        {branches.map((branch) => <MenuItem key={branch.id} value={branch.id}>{branch.label}</MenuItem>)}
      </TextField>
    );
  }

  return <Chip label={user?.branchName || 'Assigned branch'} size="small" variant="outlined" sx={{ mb: 0, height: 34, bgcolor: '#F8FAFC', color: '#536174', borderColor: '#E2E8F0', fontWeight: 600 }} />;
}
