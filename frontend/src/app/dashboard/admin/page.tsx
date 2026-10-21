'use client';

import { useEffect, useState, type SyntheticEvent } from 'react';
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
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import Checkbox from '@mui/material/Checkbox';
import ListItemText from '@mui/material/ListItemText';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import EditLocationAltIcon from '@mui/icons-material/EditLocationAlt';
import { useAuthStore } from '@/stores/auth-store';
import { adminApi } from '@/lib/api';
import { useSnackbar } from 'notistack';
import { DPageHeader, DStatCard, DFormDialog, DStatusChip } from '@/components';

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
type TenantUser = { id: string; fullName: string; email: string; role: string; branchId: string; branchIds?: string[]; isActive: boolean };
type TenantPackage = { id: string; name: string; monthlyPrice: number; lifetimePrice: number | null; isActive: boolean };
type TenantSubscription = { id: string; packageName: string; billingCycle: number; status: number; pricePerCycle: number; expiresAt: string | null };

const billingCycles = [
  { value: 1, label: 'Monthly' },
  { value: 2, label: 'Every 2 months' },
  { value: 3, label: 'Quarterly' },
  { value: 6, label: 'Every 6 months' },
  { value: 12, label: 'Annual' },
  { value: 0, label: 'Lifetime' },
];

function TenantRow({ tenant, onBranchCreated, onToggleLock }: { tenant: Tenant; onBranchCreated: () => void; onToggleLock: (tenantId: string, lock: boolean) => void }) {
  const [open, setOpen] = useState(false);
  const [branches, setBranches] = useState<Branch[]>(tenant.branches || []);
  const [loaded, setLoaded] = useState(false);
  const [branchDialog, setBranchDialog] = useState(false);
  const [branchForm, setBranchForm] = useState(emptyBranch);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState(0);
  const [tenantUsers, setTenantUsers] = useState<TenantUser[]>([]);
  const [userDialog, setUserDialog] = useState(false);
  const [branchAssignmentUser, setBranchAssignmentUser] = useState<TenantUser | null>(null);
  const [assignedBranchIds, setAssignedBranchIds] = useState<string[]>([]);
  const [primaryBranchId, setPrimaryBranchId] = useState('');
  const [userForm, setUserForm] = useState({ fullName: '', email: '', password: '', role: 'Cashier', branchId: '', branchIds: [] as string[] });
  const [subscription, setSubscription] = useState<TenantSubscription | null>(null);
  const [packages, setPackages] = useState<TenantPackage[]>([]);
  const [subscriptionLoaded, setSubscriptionLoaded] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [billingCycle, setBillingCycle] = useState(1);
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  });
  const { enqueueSnackbar } = useSnackbar();

  const loadSubscription = async () => {
    if (subscriptionLoaded) return;
    try {
      const [subscriptionResult, packageResult] = await Promise.all([
        adminApi.getTenantSubscription(tenant.id).catch((error) => {
          if (error.response?.status === 404) return { data: null };
          throw error;
        }),
        adminApi.getPackages(),
      ]);
      setSubscription(subscriptionResult.data);
      const activePackages = (Array.isArray(packageResult.data) ? packageResult.data : [])
        .filter((item: TenantPackage) => item.isActive);
      setPackages(activePackages);
      setSelectedPackageId((current) => current || activePackages[0]?.id || '');
      setSubscriptionLoaded(true);
    } catch (error: any) {
      enqueueSnackbar(error.response?.data?.message || 'Could not load subscription details', { variant: 'error' });
    }
  };

  const handleTabChange = (_: SyntheticEvent, value: number) => {
    setTab(value);
    if (value === 2) void loadSubscription();
  };

  const handleEnroll = async () => {
    if (!selectedPackageId) return;
    setSaving(true);
    try {
      const result = await adminApi.enrollTenant(tenant.id, selectedPackageId, billingCycle, startDate);
      setSubscription(result.data);
      enqueueSnackbar(`${tenant.name} enrolled in ${result.data.packageName}`, { variant: 'success' });
    } catch (error: any) {
      enqueueSnackbar(error.response?.data?.message || 'Could not enroll tenant', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleExpand = async () => {
    if (!open && !loaded) {
      try {
        const res = await adminApi.getTenantBranches(tenant.id);
        setBranches(res.data || []);
        const usersResult = await adminApi.getTenantUsers(tenant.id);
        setTenantUsers(usersResult.data || []);
        setLoaded(true);
      } catch { /* */ }
    }
    setOpen(!open);
  };

  const handleCreateUser = async () => {
    if (!userForm.fullName || !userForm.email || userForm.password.length < 8 || !userForm.branchIds.length) return;
    setSaving(true);
    try {
      const result = await adminApi.createTenantUser(tenant.id, userForm);
      setTenantUsers((current) => [...current, result.data]);
      setUserDialog(false);
      setUserForm({ fullName: '', email: '', password: '', role: 'Cashier', branchId: '', branchIds: [] });
      enqueueSnackbar('User added to tenant', { variant: 'success' });
    } catch (error: any) { enqueueSnackbar(error.response?.data?.message || 'Could not add user', { variant: 'error' }); }
    finally { setSaving(false); }
  };

  const handleSaveBranchAssignments = async () => {
    if (!branchAssignmentUser || !assignedBranchIds.length || !assignedBranchIds.includes(primaryBranchId)) return;
    setSaving(true);
    try {
      const result = await adminApi.updateTenantUserBranches(tenant.id, branchAssignmentUser.id, assignedBranchIds, primaryBranchId);
      setTenantUsers((current) => current.map((user) => user.id === branchAssignmentUser.id ? result.data : user));
      setBranchAssignmentUser(null);
      enqueueSnackbar('User branch access updated', { variant: 'success' });
    } catch (error: any) {
      const response = error.response?.data;
      const detail = response?.message || response?.detail || response?.title || (typeof response === 'string' ? response : null);
      enqueueSnackbar(detail || `Could not update user branches${error.response?.status ? ` (HTTP ${error.response.status})` : `: ${error.message}`}`, { variant: 'error' });
    } finally {
      setSaving(false);
    }
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
        <TableCell sx={{ py: 2 }}>
          <IconButton
            size="small"
            onClick={() => onToggleLock(tenant.id, tenant.isActive)}
            title={tenant.isActive ? 'Lock tenant' : 'Unlock tenant'}
            sx={{ color: tenant.isActive ? '#F59E0B' : '#059669' }}
          >
            {tenant.isActive ? <LockIcon fontSize="small" /> : <LockOpenIcon fontSize="small" />}
          </IconButton>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={8} sx={{ py: 0, borderBottom: open ? undefined : 'none' }}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ py: 2.5, px: 4, bgcolor: '#F8FAFC', borderRadius: 2, my: 1 }}>
              <Tabs value={tab} onChange={handleTabChange} sx={{ mb: 2 }}>
                <Tab label={`Branches (${branches.length})`} />
                <Tab label={`Users (${tenantUsers.length})`} />
                <Tab label="Subscription" />
              </Tabs>
              {tab === 0 && <>
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
              </>}
              {tab === 1 && <>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="subtitle2" fontWeight={700}>Tenant users</Typography>
                  <Button size="small" startIcon={<AddIcon />} onClick={() => { const firstBranchId = branches[0]?.id || ''; setUserForm({ fullName: '', email: '', password: '', role: 'Cashier', branchId: firstBranchId, branchIds: firstBranchId ? [firstBranchId] : [] }); setUserDialog(true); }} disabled={!branches.length}>Add user</Button>
                </Box>
                {!tenantUsers.length ? <Typography variant="body2" color="text.secondary">No users in this tenant yet.</Typography> :
                  <Table size="small"><TableHead><TableRow><TableCell>Name</TableCell><TableCell>Email</TableCell><TableCell>Role</TableCell><TableCell>Branch</TableCell><TableCell align="right">Actions</TableCell></TableRow></TableHead><TableBody>
                    {tenantUsers.map((user) => {
                      const assignedIds = user.branchIds?.length ? user.branchIds : [user.branchId];
                      const assignedNames = assignedIds.map((id) => branches.find((branch) => branch.id === id)?.name).filter(Boolean);
                      return <TableRow key={user.id}><TableCell>{user.fullName}</TableCell><TableCell>{user.email}</TableCell><TableCell>{user.role}</TableCell><TableCell>{assignedNames.join(', ') || '—'}</TableCell><TableCell align="right"><IconButton size="small" aria-label={`Edit branches for ${user.fullName}`} title="Edit branch access" onClick={() => {
                        const effectiveIds = user.branchIds?.length
                          ? user.branchIds
                          : ['Admin', 'Manager'].includes(user.role)
                            ? branches.filter((branch) => branch.isActive).map((branch) => branch.id)
                            : [user.branchId].filter(Boolean);
                        setBranchAssignmentUser(user);
                        setAssignedBranchIds(effectiveIds);
                        setPrimaryBranchId(effectiveIds.includes(user.branchId) ? user.branchId : effectiveIds[0] || '');
                      }}><EditLocationAltIcon fontSize="small" /></IconButton></TableCell></TableRow>;
                    })}
                  </TableBody></Table>}
                <DFormDialog
                  open={Boolean(branchAssignmentUser)}
                  onClose={() => setBranchAssignmentUser(null)}
                  title={`Branch access${branchAssignmentUser ? ` · ${branchAssignmentUser.fullName}` : ''}`}
                  onSave={handleSaveBranchAssignments}
                  saving={saving}
                  disabled={!assignedBranchIds.length || !primaryBranchId || !assignedBranchIds.includes(primaryBranchId)}
                  saveLabel="Save access"
                >
                  <FormControl fullWidth>
                    <InputLabel id={`edit-user-branches-${tenant.id}`}>Authorized branches</InputLabel>
                    <Select
                      labelId={`edit-user-branches-${tenant.id}`}
                      multiple
                      value={assignedBranchIds}
                      label="Authorized branches"
                      onChange={(event) => {
                        const nextIds = event.target.value as string[];
                        setAssignedBranchIds(nextIds);
                        if (!nextIds.includes(primaryBranchId)) setPrimaryBranchId(nextIds[0] || '');
                      }}
                      renderValue={(selected) => branches.filter((branch) => selected.includes(branch.id)).map((branch) => branch.name).join(', ')}
                    >
                      {branches.filter((branch) => branch.isActive).map((branch) => <MenuItem key={branch.id} value={branch.id}><Checkbox checked={assignedBranchIds.includes(branch.id)} /><ListItemText primary={branch.name} /></MenuItem>)}
                    </Select>
                  </FormControl>
                  <TextField
                    select
                    fullWidth
                    label="Default branch"
                    value={primaryBranchId}
                    onChange={(event) => setPrimaryBranchId(event.target.value)}
                    helperText="This branch is selected by default when the user signs in."
                    disabled={!assignedBranchIds.length}
                  >
                    {branches.filter((branch) => branch.isActive && assignedBranchIds.includes(branch.id)).map((branch) => <MenuItem key={branch.id} value={branch.id}>{branch.name}</MenuItem>)}
                  </TextField>
                </DFormDialog>
                <Dialog open={userDialog} onClose={() => setUserDialog(false)} maxWidth="sm" fullWidth>
                  <DialogTitle>Add user to {tenant.name}</DialogTitle>
                  <DialogContent><Stack spacing={2} sx={{ mt: 1 }}>
                    <TextField label="Full name" value={userForm.fullName} onChange={(e) => setUserForm({ ...userForm, fullName: e.target.value })} />
                    <TextField label="Email" type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} />
                    <TextField label="Temporary password" type="password" helperText="At least 8 characters; the user will be asked to change it." value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} />
                    <TextField select label="Role" value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}>{['Cashier', 'Supervisor', 'Manager', 'Admin'].map((role) => <MenuItem key={role} value={role}>{role}</MenuItem>)}</TextField>
                    <FormControl>
                      <InputLabel id={`tenant-user-branches-${tenant.id}`}>Authorized branches</InputLabel>
                      <Select
                        labelId={`tenant-user-branches-${tenant.id}`}
                        multiple
                        value={userForm.branchIds}
                        label="Authorized branches"
                        onChange={(event) => {
                          const branchIds = event.target.value as string[];
                          setUserForm({ ...userForm, branchIds, branchId: branchIds[0] || '' });
                        }}
                        renderValue={(selected) => branches.filter((branch) => selected.includes(branch.id)).map((branch) => branch.name).join(', ')}
                      >
                        {branches.filter((branch) => branch.isActive).map((branch) => <MenuItem key={branch.id} value={branch.id}><Checkbox checked={userForm.branchIds.includes(branch.id)} /><ListItemText primary={branch.name} /></MenuItem>)}
                      </Select>
                    </FormControl>
                  </Stack></DialogContent>
                  <DialogActions><Button onClick={() => setUserDialog(false)}>Cancel</Button><Button variant="contained" onClick={handleCreateUser} disabled={saving || !userForm.fullName || !userForm.email || userForm.password.length < 8 || !userForm.branchIds.length}>Create user</Button></DialogActions>
                </Dialog>
              </>}
              {tab === 2 && <Box sx={{ maxWidth: 680 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>Subscription plan</Typography>
                {subscription && ![3, 4].includes(subscription.status) ? (
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                      <Box>
                        <Typography fontWeight={700}>{subscription.packageName}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {billingCycles.find((cycle) => cycle.value === subscription.billingCycle)?.label || 'Custom cycle'}
                          {' · '}KES {subscription.pricePerCycle.toLocaleString()} per cycle
                        </Typography>
                      </Box>
                      <Chip label={['Trial', 'Active', 'Past due', 'Expired', 'Cancelled', 'Lifetime'][subscription.status] || 'Unknown'} size="small" color={subscription.status === 1 || subscription.status === 5 ? 'success' : subscription.status === 2 ? 'warning' : 'default'} />
                    </Box>
                    {subscription.expiresAt && <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>Expires {new Date(subscription.expiresAt).toLocaleDateString('en-KE')}</Typography>}
                  </Paper>
                ) : <>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {subscription ? 'This plan is expired or cancelled. Choose a package to enroll this tenant again.' : 'Choose a package and billing cycle to activate a subscription for this tenant.'}
                  </Typography>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                    <TextField select label="Package" size="small" value={selectedPackageId} onChange={(event) => setSelectedPackageId(event.target.value)} sx={{ flex: 1 }}>
                      {packages.map((item) => <MenuItem key={item.id} value={item.id}>{item.name} · KES {(billingCycle === 0 ? item.lifetimePrice ?? item.monthlyPrice : item.monthlyPrice * billingCycle).toLocaleString()}</MenuItem>)}
                    </TextField>
                    <TextField select label="Billing cycle" size="small" value={billingCycle} onChange={(event) => setBillingCycle(Number(event.target.value))} sx={{ minWidth: 180 }}>
                      {billingCycles.map((cycle) => <MenuItem key={cycle.value} value={cycle.value}>{cycle.label}</MenuItem>)}
                    </TextField>
                    <TextField label="Start date" type="date" size="small" value={startDate} onChange={(event) => setStartDate(event.target.value)} InputLabelProps={{ shrink: true }} />
                    <Button variant="contained" onClick={handleEnroll} disabled={saving || !selectedPackageId || !startDate}>
                      {saving ? 'Enrolling…' : 'Enroll tenant'}
                    </Button>
                  </Stack>
                  {packages.length === 0 && <Typography variant="caption" color="error" display="block" sx={{ mt: 1 }}>Create an active package before enrolling tenants.</Typography>}
                </>}
              </Box>}
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
      const res = await adminApi.createTenant(tenantForm);
      setTenantDialog(false);
      setTenantForm(emptyTenant);
      const { adminEmail, tempPassword } = res.data;
      if (adminEmail && tempPassword) {
        enqueueSnackbar(`Tenant created! Admin: ${adminEmail} / Password: ${tempPassword}`, { variant: 'success', autoHideDuration: 15000 });
      } else {
        enqueueSnackbar('Tenant created successfully', { variant: 'success' });
      }
      loadTenants();
    } catch (err: any) {
      enqueueSnackbar(err.response?.data?.message || 'Failed to create tenant', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleLock = async (tenantId: string, isCurrentlyActive: boolean) => {
    try {
      if (isCurrentlyActive) {
        await adminApi.lockTenant(tenantId);
        enqueueSnackbar('Tenant locked', { variant: 'warning' });
      } else {
        await adminApi.unlockTenant(tenantId);
        enqueueSnackbar('Tenant unlocked', { variant: 'success' });
      }
      loadTenants();
    } catch { enqueueSnackbar('Failed to update tenant', { variant: 'error' }); }
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
      <DPageHeader
        title="Tenant Management"
        subtitle="Create and manage stores across the platform"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Admin' }]}
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setTenantDialog(true)}>
            New Tenant
          </Button>
        }
      />

      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <DStatCard label="Total Tenants" value={tenants.length} icon={<StorefrontIcon />} color="#1565C0" />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <DStatCard label="Total Branches" value={totalBranches} icon={<AccountTreeIcon />} color="#7C3AED" />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <DStatCard label="Active Tenants" value={activeTenants} icon={<CheckCircleIcon />} color="#059669" />
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
              <TableCell width={60}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                  <Typography color="text.secondary">Loading tenants...</Typography>
                </TableCell>
              </TableRow>
            ) : tenants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 8 }}>
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
                <TenantRow key={tenant.id} tenant={tenant} onBranchCreated={loadTenants} onToggleLock={handleToggleLock} />
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
