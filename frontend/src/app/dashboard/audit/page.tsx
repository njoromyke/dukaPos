"use client";

import { useEffect, useState, useCallback } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import ArchiveIcon from "@mui/icons-material/ArchiveOutlined";
import { auditApi } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import { DPageHeader, DSearchFilter, DTable, DDateRange } from "@/components";
import type { DColumn, FilterConfig } from "@/components";

interface AuditEntry {
  id: string;
  userId: string;
  userName: string;
  action: string;
  entityType: string;
  entityId: string;
  details?: string;
  ipAddress?: string;
  requestPath?: string;
  httpMethod?: string;
  createdAt: string;
}

const actionTypes = [
  "All", "Query", "Create", "Update", "Delete", "AdjustStock", "RecordCashPayment", "InitiateMpesaPayment",
  "Login", "Logout", "FailedLogin", "PasswordChange",
  "ProductCreated", "ProductUpdated", "StockAdjusted",
  "SaleCompleted", "SaleVoided", "PaymentReceived",
  "ExpenseCreated", "ExpenseApproved", "ExpenseRejected",
  "UserCreated", "UserUpdated", "UserLocked", "UserUnlocked",
];

export default function AuditLogsPage() {
  const [tab, setTab] = useState(0);
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [archivedLogs, setArchivedLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [actionFilter, setActionFilter] = useState("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [archivedPage, setArchivedPage] = useState(0);
  const [archivedPageSize, setArchivedPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [archivedTotalCount, setArchivedTotalCount] = useState(0);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [archiveDays, setArchiveDays] = useState("90");
  const [archiving, setArchiving] = useState(false);
  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  const applyDatePreset = (from: string, to: string) => {
    setDateFrom(from);
    setDateTo(to);
    setPage(0);
    setArchivedPage(0);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: { action?: string; from?: string; to?: string } = {};
      if (actionFilter !== "All") params.action = actionFilter;
      if (dateFrom) params.from = dateFrom;
      if (dateTo) params.to = dateTo;
      const r = await auditApi.list({ ...params, page: page + 1, pageSize });
      setLogs(r.data.items || []);
      setTotalCount(r.data.totalCount || 0);
    } catch { /* */ }
    finally { setLoading(false); }
  }, [actionFilter, dateFrom, dateTo, page, pageSize]);

  const loadArchived = useCallback(async () => {
    setArchiveLoading(true);
    try {
      const params: { action?: string; from?: string; to?: string } = {};
      if (actionFilter !== "All") params.action = actionFilter;
      if (dateFrom) params.from = dateFrom;
      if (dateTo) params.to = dateTo;
      const r = await auditApi.listArchived({ ...params, page: archivedPage + 1, pageSize: archivedPageSize });
      setArchivedLogs(r.data.items || []);
      setArchivedTotalCount(r.data.totalCount || 0);
    } catch { /* */ }
    finally { setArchiveLoading(false); }
  }, [actionFilter, dateFrom, dateTo, archivedPage, archivedPageSize]);

  const applyActionFilter = (value: string) => {
    setActionFilter(value);
    setPage(0);
    setArchivedPage(0);
  };
  const applyDateFrom = (value: string) => {
    setDateFrom(value);
    setPage(0);
    setArchivedPage(0);
  };
  const applyDateTo = (value: string) => {
    setDateTo(value);
    setPage(0);
    setArchivedPage(0);
  };

  useEffect(() => {
    if (tab === 0) load();
    else loadArchived();
  }, [tab, load, loadArchived]);

  const handleArchive = async () => {
    const days = parseInt(archiveDays);
    if (isNaN(days) || days < 1) return;
    setArchiving(true);
    try {
      const olderThan = new Date();
      olderThan.setDate(olderThan.getDate() - days);
      const r = await auditApi.archive(olderThan.toISOString());
      setSnack({ open: true, message: `Archived ${r.data.archivedCount} log entries (batch: ${r.data.batchId})`, severity: 'success' });
      setArchiveDialogOpen(false);
      load();
    } catch {
      setSnack({ open: true, message: 'Failed to archive logs', severity: 'error' });
    }
    setArchiving(false);
  };

  const columns: DColumn<AuditEntry>[] = [
    { field: "createdAt", header: "Time", render: (l) => <Typography variant="caption">{formatDateTime(l.createdAt)}</Typography> },
    { field: "userName", header: "User", render: (l) => <Typography variant="body2" fontWeight={600}>{l.userName}</Typography> },
    { field: "action", header: "Action", render: (l) => <Chip label={l.action} size="small" variant="outlined" /> },
    { field: "entityType", header: "Table", render: (l) => <Typography variant="caption" color="text.secondary">{l.entityType}</Typography> },
    { field: "ipAddress", header: "IP", render: (l) => <Typography variant="caption" color="text.secondary">{l.ipAddress || "—"}</Typography> },
    { field: "details", header: "Details", render: (l) => <Typography variant="caption" title={l.details || ""} noWrap sx={{ display: "block" }}>{l.details || "—"}</Typography> },
  ];

  const filters: FilterConfig[] = [
    {
      label: "Action", value: actionFilter,
      options: actionTypes.map((a) => ({ label: a, value: a })),
      onChange: applyActionFilter,
    },
  ];

  return (
    <Box>
      <DPageHeader
        title="Audit Logs"
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Audit Logs" }]}
        action={
          <Button variant="outlined" startIcon={<ArchiveIcon />} onClick={() => setArchiveDialogOpen(true)}>
            Archive Old Logs
          </Button>
        }
      />

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Active Logs" />
        <Tab label="Archived Logs" />
      </Tabs>

      <Box display="flex" gap={2} flexWrap="wrap" alignItems="center" mb={2}>
        <DDateRange from={dateFrom} to={dateTo} onFromChange={applyDateFrom} onToChange={applyDateTo} onRangeChange={applyDatePreset} />
      </Box>
      <DSearchFilter filters={filters} onRefresh={tab === 0 ? load : loadArchived} />
      <DTable
        columns={columns}
        rows={tab === 0 ? logs : archivedLogs}
        rowKey={(l) => l.id}
        loading={tab === 0 ? loading : archiveLoading}
        totalCount={tab === 0 ? totalCount : archivedTotalCount}
        page={tab === 0 ? page : archivedPage}
        pageSize={tab === 0 ? pageSize : archivedPageSize}
        pageSizeOptions={[10, 20, 50]}
        onPageChange={tab === 0 ? setPage : setArchivedPage}
        onPageSizeChange={(size) => {
          if (tab === 0) { setPageSize(size); setPage(0); }
          else { setArchivedPageSize(size); setArchivedPage(0); }
        }}
        emptyMessage={tab === 0 ? "No audit logs found" : "No archived logs found"}
      />

      <Dialog open={archiveDialogOpen} onClose={() => setArchiveDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Archive Audit Logs</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Move audit log entries older than the specified number of days to the archive database. Archived logs can still be viewed in the "Archived Logs" tab.
          </Typography>
          <TextField
            fullWidth
            type="number"
            label="Archive logs older than (days)"
            value={archiveDays}
            onChange={(e) => setArchiveDays(e.target.value)}
            inputProps={{ min: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setArchiveDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleArchive} disabled={archiving}>
            {archiving ? 'Archiving...' : 'Archive'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack({ ...snack, open: false })}>
        <Alert severity={snack.severity} onClose={() => setSnack({ ...snack, open: false })}>{snack.message}</Alert>
      </Snackbar>
    </Box>
  );
}
