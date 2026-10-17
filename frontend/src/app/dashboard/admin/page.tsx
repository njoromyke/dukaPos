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
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Stack from '@mui/material/Stack';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import AddIcon from '@mui/icons-material/Add';
import { useAuthStore } from '@/stores/auth-store';
import { adminApi } from '@/lib/api';
import { useSnackbar } from 'notistack';

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

const emptyTenant = { name: '', slug: '', kraPin: '', phone: '', email: '' };
const emptyBranch = { name: '', address: '', phone: '' };

function TenantRow({ tenant, onBranchCreated }: { tenant: Tenant; onBranchCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [branches, setBranches] = useState<Branch[]>(tenant.branches || []);
  const [loaded, setLoaded] = useState(false);
  const [branchDialog, setBranchDialog] = useState(false);
  const [branchForm, setBranchForm] = useState(emptyBranch);
  const [saving, setSaving] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  const handleExpand = async () => {
    if (!open && !loaded) {
      try {
        const res = await adminApi.getTenantBranches(tenant.id);
        setBranches(res.data || []);
        setLoaded(true);
      } catch { /* */ }
    }
    setOpen(!open);
  };

  const handleCreateBranch = async () => {
    if (!branchForm.name || !branchForm.address) return;
    setSaving(true);
    try {
      const res = await adminApi.createBranch(tenant.id, branchForm);
      setBranches((prev) => [...prev, res.data]);
      setBranchDialog(false);
      setBranchForm(emptyBranch);
      enqueueSnackbar('Branch created', { variant: 'success' });
      onBranchCreated();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to create branch', { variant: 'error' });
    } finally {
      setSaving(false);
    }
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
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Branches ({branches.length})
                </Typography>
                <Button size="small" startIcon={<AddIcon />} onClick={() => setBranchDialog(true)}>
                  Add Branch
                </Button>
              </Box>
              {branches.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No branches yet</Typography>
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

      <Dialog open={branchDialog} onClose={() => setBranchDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Branch to {tenant.name}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Branch Name" fullWidth required
              value={branchForm.name}
              onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })} />
            <TextField label="Address" fullWidth required
              value={branchForm.address}
              onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })} />
            <TextField label="Phone" fullWidth
              value={branchForm.phone}
              onChange={(e) => setBranchForm({ ...branchForm, phone: e.target.value })} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBranchDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateBranch} disabled={saving || !branchForm.name || !branchForm.address}>
            {saving ? 'Creating...' : 'Create Branch'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default function AdminPage() {
  const auth = useAuthStore();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [tenantDialog, setTenantDialog] = useState(false);
  const [tenantForm, setTenantForm] = useState(emptyTenant);
  const [saving, setSaving] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => { auth.hydrate(); }, []);

  const loadTenants = async () => {
    try {
      const res = await adminApi.getTenants();
      setTenants(res.data || []);
    } catch { /* */ } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTenants(); }, []);

  const handleCreateTenant = async () => {
    if (!tenantForm.name || !tenantForm.slug || !tenantForm.email) return;
    setSaving(true);
    try {
      await adminApi.createTenant(tenantForm);
      setTenantDialog(false);
      setTenantForm(emptyTenant);
      enqueueSnackbar('Tenant created successfully', { variant: 'success' });
      loadTenants();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to create tenant', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleSlugify = (name: string) => {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    setTenantForm((prev) => ({ ...prev, name, slug }));
  };

  if (auth.user?.role !== 'SuperAdmin') {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">Access denied. SuperAdmin role required.</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h5" gutterBottom>Tenant Management</Typography>
          <Typography variant="body2" color="text.secondary">
            Create and manage stores across the platform
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setTenantDialog(true)}>
          New Tenant
        </Button>
      </Box>

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
                  <Typography color="text.secondary">No tenants yet. Click &quot;New Tenant&quot; to create one.</Typography>
                </TableCell>
              </TableRow>
            ) : (
              tenants.map((tenant) => (
                <TenantRow key={tenant.id} tenant={tenant} onBranchCreated={loadTenants} />
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={tenantDialog} onClose={() => setTenantDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Tenant</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Business Name" fullWidth required
              value={tenantForm.name}
              onChange={(e) => handleSlugify(e.target.value)} />
            <TextField label="Slug" fullWidth required
              helperText="Used as the store identifier for login"
              value={tenantForm.slug}
              onChange={(e) => setTenantForm({ ...tenantForm, slug: e.target.value })} />
            <TextField label="Email" fullWidth required type="email"
              value={tenantForm.email}
              onChange={(e) => setTenantForm({ ...tenantForm, email: e.target.value })} />
            <TextField label="Phone" fullWidth
              value={tenantForm.phone}
              onChange={(e) => setTenantForm({ ...tenantForm, phone: e.target.value })} />
            <TextField label="KRA PIN" fullWidth
              value={tenantForm.kraPin}
              onChange={(e) => setTenantForm({ ...tenantForm, kraPin: e.target.value })} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTenantDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateTenant}
            disabled={saving || !tenantForm.name || !tenantForm.slug || !tenantForm.email}>
            {saving ? 'Creating...' : 'Create Tenant'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
