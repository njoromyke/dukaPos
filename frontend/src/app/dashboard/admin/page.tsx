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
import Grid from '@mui/material/Grid2';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import AddIcon from '@mui/icons-material/Add';
import StorefrontIcon from '@mui/icons-material/StorefrontOutlined';
import AccountTreeIcon from '@mui/icons-material/AccountTreeOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircleOutlined';
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

function StatCard({ label, value, icon, gradient }: { label: string; value: number; icon: React.ReactNode; gradient: string }) {
  return (
    <Paper sx={{
      p: 3, display: 'flex', alignItems: 'center', gap: 2.5,
      border: '1px solid #E2E8F0', boxShadow: 'none',
    }}>
      <Box sx={{
        width: 52, height: 52, borderRadius: 3, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        background: gradient, color: '#fff',
        boxShadow: `0 4px 12px ${gradient.includes('#1565') ? 'rgba(21,101,192,0.3)' : gradient.includes('#059') ? 'rgba(5,150,105,0.3)' : 'rgba(124,58,237,0.3)'}`,
      }}>
        {icon}
      </Box>
      <Box>
        <Typography variant="body2" sx={{ color: '#64748B', fontSize: '0.8rem', fontWeight: 500 }}>{label}</Typography>
        <Typography variant="h4" sx={{ fontWeight: 800, color: '#0F172A', fontSize: '1.75rem' }}>{value}</Typography>
      </Box>
    </Paper>
  );
}

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
      <TableRow hover sx={{ '&:hover': { bgcolor: '#F8FAFC' } }}>
        <TableCell sx={{ py: 2 }}>
          <IconButton size="small" onClick={handleExpand} sx={{
            bgcolor: open ? '#EFF6FF' : 'transparent',
            color: open ? '#1565C0' : '#94A3B8',
          }}>
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell sx={{ py: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{
              width: 36, height: 36, borderRadius: 2, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              bgcolor: '#EFF6FF', color: '#1565C0',
            }}>
              <StorefrontIcon fontSize="small" />
            </Box>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 700, color: '#0F172A' }}>{tenant.name}</Typography>
              <Typography variant="caption" sx={{ color: '#94A3B8' }}>{tenant.slug}</Typography>
            </Box>
          </Box>
        </TableCell>
        <TableCell sx={{ py: 2 }}>{tenant.email}</TableCell>
        <TableCell sx={{ py: 2 }}>{tenant.phone}</TableCell>
        <TableCell sx={{ py: 2 }}>
          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#64748B' }}>
            {tenant.kraPin}
          </Typography>
        </TableCell>
        <TableCell sx={{ py: 2 }}>
          <Chip
            label={tenant.isActive ? 'Active' : 'Inactive'}
            size="small"
            sx={{
              bgcolor: tenant.isActive ? '#ECFDF5' : '#F1F5F9',
              color: tenant.isActive ? '#059669' : '#64748B',
              fontWeight: 600,
            }}
          />
        </TableCell>
        <TableCell sx={{ py: 2, color: '#64748B' }}>
          {new Date(tenant.createdAt).toLocaleDateString('en-KE', {
            day: '2-digit', month: 'short', year: 'numeric',
          })}
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={7} sx={{ py: 0, borderBottom: open ? undefined : 'none' }}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ py: 2.5, px: 4, bgcolor: '#F8FAFC', borderRadius: 2, my: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0F172A' }}>
                  Branches ({branches.length})
                </Typography>
                <Button size="small" startIcon={<AddIcon />} onClick={() => setBranchDialog(true)}
                  sx={{ bgcolor: '#EFF6FF', color: '#1565C0', '&:hover': { bgcolor: '#DBEAFE' } }}>
                  Add Branch
                </Button>
              </Box>
              {branches.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No branches yet</Typography>
              ) : (
                <Table size="small" sx={{ '& td, & th': { border: 'none', py: 1.5 } }}>
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
                      <TableRow key={b.id} sx={{ '&:hover': { bgcolor: '#fff' }, borderRadius: 2 }}>
                        <TableCell sx={{ fontWeight: 600 }}>{b.name}</TableCell>
                        <TableCell>{b.address}</TableCell>
                        <TableCell>{b.phone}</TableCell>
                        <TableCell>
                          <Chip
                            label={b.isActive ? 'Active' : 'Inactive'}
                            size="small"
                            sx={{
                              bgcolor: b.isActive ? '#ECFDF5' : '#F1F5F9',
                              color: b.isActive ? '#059669' : '#64748B',
                              fontWeight: 600,
                            }}
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
          <Stack spacing={2.5} sx={{ mt: 1.5 }}>
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
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={() => setBranchDialog(false)} sx={{ color: '#64748B' }}>Cancel</Button>
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

  const totalBranches = tenants.reduce((sum, t) => sum + (t.branches?.length || 0), 0);
  const activeTenants = tenants.filter(t => t.isActive).length;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A' }}>Tenant Management</Typography>
          <Typography variant="body2" sx={{ color: '#64748B', mt: 0.5 }}>
            Create and manage stores across the platform
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setTenantDialog(true)}
          sx={{
            px: 3,
            boxShadow: '0 2px 8px rgba(21,101,192,0.3)',
          }}
        >
          New Tenant
        </Button>
      </Box>

      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard
            label="Total Tenants"
            value={tenants.length}
            icon={<StorefrontIcon />}
            gradient="linear-gradient(135deg, #1565C0, #0D47A1)"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard
            label="Total Branches"
            value={totalBranches}
            icon={<AccountTreeIcon />}
            gradient="linear-gradient(135deg, #7C3AED, #5B21B6)"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <StatCard
            label="Active Tenants"
            value={activeTenants}
            icon={<CheckCircleIcon />}
            gradient="linear-gradient(135deg, #059669, #047857)"
          />
        </Grid>
      </Grid>

      <TableContainer component={Paper} sx={{ border: '1px solid #E2E8F0', boxShadow: 'none' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#F8FAFC' }}>
              <TableCell width={50} />
              <TableCell>Store</TableCell>
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
                <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                  <Typography color="text.secondary">Loading tenants...</Typography>
                </TableCell>
              </TableRow>
            ) : tenants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                  <StorefrontIcon sx={{ fontSize: 48, color: '#CBD5E1', mb: 1 }} />
                  <Typography variant="body1" sx={{ color: '#64748B', fontWeight: 600, mb: 0.5 }}>
                    No tenants yet
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Click &quot;New Tenant&quot; to create your first store
                  </Typography>
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
        <Box sx={{
          px: 3, pt: 3, pb: 1,
          background: 'linear-gradient(135deg, #F8FAFC, #EFF6FF)',
          borderBottom: '1px solid #E2E8F0',
        }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#0F172A' }}>Create New Tenant</Typography>
          <Typography variant="body2" sx={{ color: '#64748B', mb: 2 }}>
            Set up a new store on the platform
          </Typography>
        </Box>
        <DialogContent sx={{ pt: 3 }}>
          <Stack spacing={2.5}>
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
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField label="Phone" fullWidth
                value={tenantForm.phone}
                onChange={(e) => setTenantForm({ ...tenantForm, phone: e.target.value })} />
              <TextField label="KRA PIN" fullWidth
                value={tenantForm.kraPin}
                onChange={(e) => setTenantForm({ ...tenantForm, kraPin: e.target.value })} />
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={() => setTenantDialog(false)} sx={{ color: '#64748B' }}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateTenant}
            disabled={saving || !tenantForm.name || !tenantForm.slug || !tenantForm.email}>
            {saving ? 'Creating...' : 'Create Tenant'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
