'use client';

import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Collapse from '@mui/material/Collapse';
import Alert from '@mui/material/Alert';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { useAuthStore } from '@/stores/auth-store';
import { adminApi } from '@/lib/api';

interface Branch {
  id: string;
  name: string;
  address: string;
  phone: string;
  isActive: boolean;
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
  kraPin: string;
  phone: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  branches: Branch[];
}

function TenantRow({ tenant }: { tenant: Tenant }) {
  const [open, setOpen] = useState(false);
  const [branches, setBranches] = useState<Branch[]>(tenant.branches || []);
  const [loaded, setLoaded] = useState(false);

  const handleExpand = async () => {
    if (!open && !loaded) {
      try {
        const res = await adminApi.getTenantBranches(tenant.id);
        setBranches(res.data || []);
        setLoaded(true);
      } catch {
        /* */
      }
    }

    setOpen(!open);
  };

  return (
    <>
      <TableRow hover>
        <TableCell>
          <IconButton size="small" onClick={handleExpand}>
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell sx={{ fontWeight: 700 }}>{tenant.name}</TableCell>
        <TableCell>{tenant.slug}</TableCell>
        <TableCell>{tenant.email}</TableCell>
        <TableCell>{tenant.phone}</TableCell>
        <TableCell>{tenant.kraPin}</TableCell>
        <TableCell>
          <Chip
            label={tenant.isActive ? 'Active' : 'Inactive'}
            size="small"
            color={tenant.isActive ? 'success' : 'default'}
          />
        </TableCell>
        <TableCell>
          {new Date(tenant.createdAt).toLocaleDateString('en-KE', {
            day: '2-digit', month: 'short', year: 'numeric',
          })}
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={8} sx={{ py: 0, borderBottom: open ? undefined : 'none' }}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ py: 2, px: 4 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                Branches ({branches.length})
              </Typography>
              {branches.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No branches</Typography>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Address</TableCell>
                      <TableCell>Phone</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {branches.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell>{b.name}</TableCell>
                        <TableCell>{b.address}</TableCell>
                        <TableCell>{b.phone}</TableCell>
                        <TableCell>
                          <Chip
                            label={b.isActive ? 'Active' : 'Inactive'}
                            size="small"
                            color={b.isActive ? 'success' : 'default'}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

export default function AdminPage() {
  const auth = useAuthStore();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { auth.hydrate(); }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await adminApi.getTenants();
        setTenants(res.data || []);
      } catch {
        /* */
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  if (auth.user?.role !== 'SuperAdmin') {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">Access denied. SuperAdmin role required.</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Tenant Management</Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        View and manage all tenants across the platform
      </Typography>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell width={50} />
              <TableCell>Name</TableCell>
              <TableCell>Slug</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell>KRA PIN</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Created</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">Loading...</Typography>
                </TableCell>
              </TableRow>
            ) : tenants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">No tenants found</Typography>
                </TableCell>
              </TableRow>
            ) : (
              tenants.map((tenant) => (
                <TenantRow key={tenant.id} tenant={tenant} />
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
