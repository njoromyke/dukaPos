"use client";

import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import { useAuthStore } from "@/stores/auth-store";
import { usersApi } from "@/lib/api";
import { DPageHeader, DTable } from "@/components";
import type { DColumn } from "@/components";
import { useSnackbar } from "notistack";

type User = { id: string; fullName: string; email: string; role: string; permissions?: string[] };
const actions = [["stock.adjust", "Adjust stock"], ["inventory.manage", "Manage products and categories"], ["sales.void", "Void sales"], ["users.manage", "Manage users"], ["reports.export", "Export reports"], ["admin.portal.view", "View admin portal"]];

export default function PermissionsPage() {
  const auth = useAuthStore();
  const { enqueueSnackbar } = useSnackbar();
  const [users, setUsers] = useState<User[]>([]);
  const [pending, setPending] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    usersApi.list(auth.user?.branchId).then((response) => setUsers(Array.isArray(response.data) ? response.data : []))
      .catch(() => enqueueSnackbar("Could not load users", { variant: "error" }))
      .finally(() => setLoading(false));
  }, [auth.user?.branchId, enqueueSnackbar]);

  const setPermission = (user: User, permission: string, enabled: boolean) => {
    const current = pending[user.id] ?? user.permissions ?? [];
    setPending((state) => ({ ...state, [user.id]: enabled ? [...current, permission] : current.filter((item) => item !== permission) }));
  };
  const save = async (user: User) => {
    const permissions = pending[user.id] ?? user.permissions ?? [];
    try {
      await usersApi.updatePermissions(user.id, permissions);
      setUsers((current) => current.map((item) => item.id === user.id ? { ...item, permissions } : item));
      setPending((state) => { const next = { ...state }; delete next[user.id]; return next; });
      enqueueSnackbar("Permissions saved", { variant: "success" });
    } catch (error: any) { enqueueSnackbar(error.response?.data?.message || "Unable to save permissions", { variant: "error" }); }
  };

  const columns: DColumn<User>[] = [
    { field: "fullName", header: "User", render: (user) => <><Typography fontWeight={600}>{user.fullName}</Typography><Typography variant="caption" color="text.secondary">{user.email} · {user.role}</Typography></> },
    ...actions.map(([permission, label]) => ({
      field: permission, header: label, align: "center" as const, sortable: false,
      render: (user: User) => <Checkbox aria-label={`${label} for ${user.fullName}`} checked={(user.role === "Admin" && permission === "admin.portal.view") || (pending[user.id] ?? user.permissions ?? []).includes(permission)} disabled={user.role === "Admin"} onChange={(event) => setPermission(user, permission, event.target.checked)} />,
    })),
    { field: "save", header: "", sortable: false, render: (user) => <Button size="small" disabled={pending[user.id] === undefined || user.role === "Admin"} onClick={() => save(user)}>Save</Button> },
  ];

  return <Box>
    <DPageHeader title="Permissions" subtitle="Control which actions staff can perform." breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Settings" }, { label: "Permissions" }]} />
    <DTable columns={columns} rows={users} rowKey={(user) => user.id} loading={loading} emptyMessage="No users in this branch" />
  </Box>;
}
