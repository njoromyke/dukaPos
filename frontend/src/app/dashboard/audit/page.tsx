'use client';

import { useEffect, useState, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import RefreshIcon from '@mui/icons-material/Refresh';
import { auditApi } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';

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
  'All', 'Login', 'Logout', 'FailedLogin', 'PasswordChange',
  'ProductCreated', 'ProductUpdated', 'StockAdjusted',
  'SaleCompleted', 'SaleVoided', 'PaymentReceived',
  'ExpenseCreated', 'ExpenseApproved', 'ExpenseRejected',
  'UserCreated', 'UserUpdated', 'UserLocked', 'UserUnlocked',
];

export default function AuditLogsPage() {
  const auth = useAuthStore();
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [actionFilter, setActionFilter] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => { auth.hydrate(); }, []);

  const load = useCallback(async () => {
    try {
      const params: Record<string, string> = {};
      if (actionFilter !== 'All') params.action = actionFilter;
      if (dateFrom) params.from = dateFrom;
      if (dateTo) params.to = dateTo;
      const r = await auditApi.list(params);
      setLogs(Array.isArray(r.data) ? r.data : r.data.items || []);
    } catch { /* */ }
  }, [actionFilter, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  const formatDate = (iso: string) => {
    try { return new Date(iso).toLocaleString(); }
    catch { return iso; }
  };

  return (
    <Box>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Typography variant="h5">Audit Logs</Typography>
        <IconButton onClick={load} title="Refresh"><RefreshIcon /></IconButton>
      </Box>

      <Box display="flex" gap={2} mb={3} flexWrap="wrap">
        <TextField
          select label="Action" value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          size="small" sx={{ minWidth: 180 }}
        >
          {actionTypes.map((a) => <MenuItem key={a} value={a}>{a}</MenuItem>)}
        </TextField>
        <TextField label="From" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} size="small" slotProps={{ inputLabel: { shrink: true } }} />
        <TextField label="To" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} size="small" slotProps={{ inputLabel: { shrink: true } }} />
      </Box>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Time</TableCell>
              <TableCell>User</TableCell>
              <TableCell>Action</TableCell>
              <TableCell>Entity</TableCell>
              <TableCell>IP</TableCell>
              <TableCell>Details</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography color="text.secondary" py={4}>No audit logs found</Typography>
                </TableCell>
              </TableRow>
            ) : logs.map((log) => (
              <TableRow key={log.id} hover>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                  <Typography variant="caption">{formatDate(log.createdAt)}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>{log.userName}</Typography>
                </TableCell>
                <TableCell>
                  <Chip label={log.action} size="small" variant="outlined" />
                </TableCell>
                <TableCell>
                  <Typography variant="caption" color="text.secondary">{log.entityType}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="caption" color="text.secondary">{log.ipAddress || '—'}</Typography>
                </TableCell>
                <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <Typography variant="caption" title={log.details || ''}>{log.details || '—'}</Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
