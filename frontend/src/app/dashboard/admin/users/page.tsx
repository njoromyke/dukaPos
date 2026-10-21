"use client";

import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Avatar from "@mui/material/Avatar";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import FormGroup from "@mui/material/FormGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";
import Stack from "@mui/material/Stack";
import { useAuthStore } from "@/stores/auth-store";
import { adminApi } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { DPageHeader, DSearchFilter, DTable, DStatusChip } from "@/components";
import type { DColumn } from "@/components";
import { useSnackbar } from "notistack";

interface User {
  id: string;
  fullName: string;
  email: string;
  role: string;
  branchId: string;
  isActive: boolean;
  createdAt: string;
  tenantId?: string;
  permissions?: string[];
}

const permissionOptions = [["stock.adjust", "Adjust stock"], ["sales.void", "Void sales"], ["users.manage", "Manage users"], ["reports.export", "Export reports"], ["admin.portal.view", "View admin portal"], ["branch.switch", "Switch assigned branches"]];

const roleColors: Record<string, { bg: string; color: string }> = {
  Admin: { bg: "#EFF6FF", color: "#1565C0" },
  Manager: { bg: "#F5F3FF", color: "#7C3AED" },
  Supervisor: { bg: "#FFF7ED", color: "#D97706" },
  Cashier: { bg: "#F0FDF4", color: "#059669" },
};

export default function AdminUsersPage() {
  const auth = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [dialog, setDialog] = useState<"reset" | "permissions" | null>(null);
  const [password, setPassword] = useState("");
  const [permissions, setPermissions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  const closeDialog = () => { setDialog(null); setSelectedUser(null); };
  const savePassword = async () => {
    if (!selectedUser || password.length < 8) return;
    setSaving(true);
    try {
      if (!selectedUser.tenantId) throw new Error("This user is missing tenant information.");
      await adminApi.resetUserPassword(selectedUser.id, selectedUser.tenantId, password);
      enqueueSnackbar("Password reset. The user must change it at next sign in.", { variant: "success" });
      setPassword(""); closeDialog();
    } catch (error: any) { enqueueSnackbar(error.response?.data?.message || "Password reset failed", { variant: "error" }); }
    finally { setSaving(false); }
  };
  const savePermissions = async () => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      if (!selectedUser.tenantId) throw new Error("This user is missing tenant information.");
      await adminApi.updateUserPermissions(selectedUser.id, selectedUser.tenantId, permissions);
      setUsers((current) => current.map((user) => user.id === selectedUser.id ? { ...user, permissions } : user));
      enqueueSnackbar("Permissions saved", { variant: "success" }); closeDialog();
    } catch (error: any) { enqueueSnackbar(error.response?.data?.message || "Could not save permissions", { variant: "error" }); }
    finally { setSaving(false); }
  };

  useEffect(() => {
    adminApi
      .getAllUsers()
      .then((res) => setUsers(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (auth.user?.role !== "SuperAdmin") {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">Access denied. SuperAdmin role required.</Alert>
      </Box>
    );
  }

  const filtered = users.filter(
    (u) =>
      u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.role.toLowerCase().includes(search.toLowerCase())
  );

  const columns: DColumn<User>[] = [
    {
      field: "fullName",
      header: "User",
      render: (u) => {
        const initials = u.fullName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
        const rc = roleColors[u.role] || { bg: "#F1F5F9", color: "#64748B" };
        return (
          <Box display="flex" alignItems="center" gap={1.5}>
            <Avatar sx={{ width: 36, height: 36, fontSize: "0.8rem", fontWeight: 700, bgcolor: rc.bg, color: rc.color }}>
              {initials}
            </Avatar>
            <Typography variant="body2" fontWeight={600}>{u.fullName}</Typography>
          </Box>
        );
      },
    },
    { field: "email", header: "Email" },
    {
      field: "role",
      header: "Role",
      render: (u) => {
        const rc = roleColors[u.role] || { bg: "#F1F5F9", color: "#64748B" };
        return <Chip label={u.role} size="small" sx={{ bgcolor: rc.bg, color: rc.color, fontWeight: 600 }} />;
      },
    },
    {
      field: "isActive",
      header: "Status",
      render: (u) => <DStatusChip status={u.isActive ? "Active" : "Inactive"} />,
    },
    {
      field: "createdAt",
      header: "Joined",
      render: (u) => formatDate(u.createdAt),
    },
    { field: "actions", header: "Actions", sortable: false, render: (u) => <Stack direction="row" spacing={1}>
      <Button size="small" onClick={() => { setSelectedUser(u); setPassword(""); setDialog("reset"); }}>Reset password</Button>
      <Button size="small" onClick={() => { setSelectedUser(u); setPermissions(u.permissions || []); setDialog("permissions"); }}>Permissions</Button>
    </Stack> },
  ];

  return (
    <Box>
      <DPageHeader
        title="All Users"
        subtitle={`${users.length} user${users.length !== 1 ? "s" : ""} across all tenants`}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Admin", href: "/dashboard/admin" },
          { label: "Users" },
        ]}
      />
      <DSearchFilter
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name, email or role..."
      />
      <DTable columns={columns} rows={filtered} rowKey={(u) => u.id} loading={loading} emptyMessage="No users found" />
      <Dialog open={dialog === "reset"} onClose={closeDialog} maxWidth="xs" fullWidth>
        <DialogTitle>Reset password</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>Set a temporary password for {selectedUser?.fullName}. They will be prompted to change it.</Typography>
          <TextField autoFocus fullWidth label="Temporary password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} helperText="Use at least 8 characters" />
        </DialogContent>
        <DialogActions><Button onClick={closeDialog}>Cancel</Button><Button variant="contained" onClick={savePassword} disabled={saving || password.length < 8}>Reset password</Button></DialogActions>
      </Dialog>
      <Dialog open={dialog === "permissions"} onClose={closeDialog} maxWidth="xs" fullWidth>
        <DialogTitle>Permissions · {selectedUser?.fullName}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={1}>Administrators retain full access. Select actions for this user.</Typography>
          <FormGroup>{permissionOptions.map(([key, label]) => <FormControlLabel key={key} label={label} control={<Checkbox checked={permissions.includes(key)} onChange={(e) => setPermissions((current) => e.target.checked ? [...current, key] : current.filter((p) => p !== key))} />} />)}</FormGroup>
        </DialogContent>
        <DialogActions><Button onClick={closeDialog}>Cancel</Button><Button variant="contained" onClick={savePermissions} disabled={saving}>Save permissions</Button></DialogActions>
      </Dialog>
    </Box>
  );
}
