"use client";

import { useEffect, useState, useCallback } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import Checkbox from "@mui/material/Checkbox";
import ListItemText from "@mui/material/ListItemText";
import IconButton from "@mui/material/IconButton";
import AddIcon from "@mui/icons-material/Add";
import LockIcon from "@mui/icons-material/Lock";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import EditLocationAltIcon from "@mui/icons-material/EditLocationAltOutlined";
import { usersApi } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { useSnackbar } from "notistack";
import { DPageHeader, DTable, DFormDialog, DStatusChip } from "@/components";
import type { DColumn } from "@/components";

interface User {
  id: string;
  fullName: string;
  email: string;
  role: string;
  isActive: boolean;
  isLocked?: boolean;
  branchId?: string;
  branchIds?: string[];
}

interface BranchOption { id: string; name: string }

const roles = ["Cashier", "Supervisor", "Manager", "Admin"];

export default function UsersPage() {
  const auth = useAuthStore();
  const { enqueueSnackbar } = useSnackbar();
  const [users, setUsers] = useState<User[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [branchesDialogOpen, setBranchesDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingBranchIds, setEditingBranchIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ fullName: "", email: "", password: "", role: "Cashier", pin: "", branchId: "", branchIds: [] as string[] });

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await usersApi.list(auth.user?.branchId); setUsers(Array.isArray(r.data) ? r.data : []); }
    catch { /* */ } finally { setLoading(false); }
  }, [auth.user?.branchId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    usersApi.listBranches()
      .then((response) => setBranches(Array.isArray(response.data) ? response.data : []))
      .catch(() => setBranches([]));
  }, []);

  const handleCreate = async () => {
    setSaving(true);
    try {
      const branchIds = form.branchIds.length ? form.branchIds : [auth.user?.branchId || ""].filter(Boolean);
      await usersApi.create({ ...form, branchId: branchIds[0], branchIds });
      enqueueSnackbar("User created", { variant: "success" });
      setDialogOpen(false); load();
    } catch { enqueueSnackbar("Failed to create user", { variant: "error" }); }
    finally { setSaving(false); }
  };

  const handleLock = async (userId: string) => {
    try { await usersApi.lock(userId, auth.user?.id || ""); enqueueSnackbar("User locked", { variant: "success" }); load(); }
    catch { enqueueSnackbar("Failed to lock user", { variant: "error" }); }
  };

  const handleUnlock = async (userId: string) => {
    try { await usersApi.unlock(userId, auth.user?.id || ""); enqueueSnackbar("User unlocked", { variant: "success" }); load(); }
    catch { enqueueSnackbar("Failed to unlock user", { variant: "error" }); }
  };

  const openBranchesDialog = (user: User) => {
    const assignedIds = user.branchIds?.length
      ? user.branchIds
      : ["Admin", "Manager"].includes(user.role)
        ? branches.map((branch) => branch.id)
        : [user.branchId || ""].filter(Boolean);
    setEditingUser(user);
    setEditingBranchIds(assignedIds);
    setBranchesDialogOpen(true);
  };

  const saveBranches = async () => {
    if (!editingUser || editingBranchIds.length === 0) return;
    setSaving(true);
    try {
      const response = await usersApi.updateBranches(editingUser.id, editingBranchIds, editingBranchIds[0]);
      setUsers((current) => current.map((user) => user.id === editingUser.id ? response.data : user));
      setBranchesDialogOpen(false);
      enqueueSnackbar("Branch access updated", { variant: "success" });
    } catch (error: any) {
      enqueueSnackbar(error.response?.data?.message || "Could not update branch access", { variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const columns: DColumn<User>[] = [
    { field: "fullName", header: "Name", render: (u) => <Typography variant="body2" fontWeight={600}>{u.fullName}</Typography> },
    { field: "email", header: "Email" },
    { field: "role", header: "Role", render: (u) => <Chip label={u.role} size="small" /> },
    {
      field: "isActive", header: "Status",
      render: (u) => (
        <Box display="flex" gap={0.5}>
          <DStatusChip status={u.isActive ? "Active" : "Inactive"} />
          {u.isLocked && <DStatusChip status="Locked" />}
        </Box>
      ),
    },
    {
      field: "_actions", header: "Actions", width: 120, sortable: false,
      render: (u) => u.id !== auth.user?.id ? (
        <Box display="flex" gap={0.5}>
          <IconButton size="small" onClick={() => openBranchesDialog(u)} title="Edit branch access" color="primary"><EditLocationAltIcon fontSize="small" /></IconButton>
          {u.isLocked ? (
            <IconButton size="small" onClick={() => handleUnlock(u.id)} title="Unlock user" color="success"><LockOpenIcon fontSize="small" /></IconButton>
          ) : (
            <IconButton size="small" onClick={() => handleLock(u.id)} title="Lock user" color="warning"><LockIcon fontSize="small" /></IconButton>
          )}
        </Box>
      ) : null,
    },
  ];

  return (
    <Box>
      <DPageHeader
        title="Users"
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Settings" }, { label: "Users" }]}
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => { const current = auth.user?.branchId || ""; setForm({ fullName: "", email: "", password: "", role: "Cashier", pin: "", branchId: current, branchIds: current ? [current] : [] }); setDialogOpen(true); }}>
            Add user
          </Button>
        }
      />
      <DTable columns={columns} rows={users} rowKey={(u) => u.id} loading={loading} emptyMessage="No users found" />

      <DFormDialog open={dialogOpen} onClose={() => setDialogOpen(false)} title="New User" onSave={handleCreate} saving={saving} maxWidth="xs">
        <TextField label="Full Name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
        <TextField label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        <TextField label="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        <TextField label="PIN (4 digits)" value={form.pin} onChange={(e) => setForm({ ...form, pin: e.target.value })} inputProps={{ maxLength: 4 }} />
        <FormControl>
          <InputLabel id="user-branches-label">Authorized branches</InputLabel>
          <Select
            labelId="user-branches-label"
            multiple
            value={form.branchIds}
            label="Authorized branches"
            onChange={(event) => {
              const branchIds = event.target.value as string[];
              setForm({ ...form, branchIds, branchId: branchIds[0] || "" });
            }}
            renderValue={(selected) => branches.filter((branch) => selected.includes(branch.id)).map((branch) => branch.name).join(", ")}
          >
            {branches.map((branch) => <MenuItem key={branch.id} value={branch.id}><Checkbox checked={form.branchIds.includes(branch.id)} /><ListItemText primary={branch.name} /></MenuItem>)}
          </Select>
        </FormControl>
        <TextField select label="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
          {roles.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
        </TextField>
      </DFormDialog>

      <DFormDialog
        open={branchesDialogOpen}
        onClose={() => setBranchesDialogOpen(false)}
        title={`Branch access · ${editingUser?.fullName || "User"}`}
        onSave={saveBranches}
        saving={saving}
        disabled={editingBranchIds.length === 0}
        maxWidth="sm"
      >
        <Typography variant="body2" color="text.secondary">
          Select every branch this user is allowed to access. The first selected branch becomes their default.
        </Typography>
        <FormControl>
          <InputLabel id="edit-user-branches-label">Authorized branches</InputLabel>
          <Select
            labelId="edit-user-branches-label"
            multiple
            value={editingBranchIds}
            label="Authorized branches"
            onChange={(event) => setEditingBranchIds(event.target.value as string[])}
            renderValue={(selected) => branches.filter((branch) => selected.includes(branch.id)).map((branch) => branch.name).join(", ")}
          >
            {branches.map((branch) => <MenuItem key={branch.id} value={branch.id}><Checkbox checked={editingBranchIds.includes(branch.id)} /><ListItemText primary={branch.name} /></MenuItem>)}
          </Select>
        </FormControl>
      </DFormDialog>
    </Box>
  );
}
