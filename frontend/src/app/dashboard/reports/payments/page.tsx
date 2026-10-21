"use client";

import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import dayjs from "dayjs";
import { useAuthStore } from "@/stores/auth-store";
import { reportsApi } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { DPageHeader, DTable, DDateRange } from "@/components";
import type { DColumn } from "@/components";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import { downloadBlob, downloadCsv } from "@/lib/utils";

interface Breakdown { method: string; count: number; total: number; }

export default function PaymentsReportPage() {
  const auth = useAuthStore();
  const [from, setFrom] = useState(dayjs().startOf("month").format("YYYY-MM-DD"));
  const [to, setTo] = useState(dayjs().format("YYYY-MM-DD"));
  const [data, setData] = useState<Breakdown[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!auth.user?.branchId) return;
    setLoading(true);
    reportsApi.paymentBreakdown(auth.user.branchId, from, to)
      .then((r) => setData(Array.isArray(r.data) ? r.data.map((item: any) => ({ ...item, count: item.count ?? item.transactionCount ?? item.TransactionCount ?? 0 })) : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [auth.user?.branchId, from, to]);

  const grandTotal = data.reduce((s, d) => s + d.total, 0);
  const exportCsv = () => downloadCsv(`payment-report-${from}-${to}.csv`, [["Payment method", "Transactions", "Total (KES)", "Share"], ...data.map((item) => [item.method, item.count, item.total.toFixed(2), grandTotal ? `${((item.total / grandTotal) * 100).toFixed(1)}%` : "0%"])]);
  const exportPdf = async () => {
    if (!auth.user?.branchId) return;
    try { const response = await reportsApi.exportPdf("payments", auth.user.branchId, from, to); downloadBlob(`payment-report-${from}-${to}.pdf`, response.data); }
    catch { /* the API response is surfaced by the shared request interceptor */ }
  };

  const columns: DColumn<Breakdown>[] = [
    { field: "method", header: "Method", render: (d) => <Typography fontWeight={600}>{d.method}</Typography> },
    { field: "count", header: "Transactions", align: "right" },
    { field: "total", header: "Total", align: "right", render: (d) => formatCurrency(d.total) },
    { field: "_share", header: "Share", align: "right", sortable: false, render: (d) => grandTotal > 0 ? `${((d.total / grandTotal) * 100).toFixed(1)}%` : "—" },
  ];

  return (
    <Box>
      <DPageHeader
        title="Payment Report"
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Reports" }, { label: "Payments" }]}
        action={<Stack direction="row" spacing={1}><Button variant="outlined" onClick={exportCsv} disabled={!data.length}>Export CSV</Button><Button variant="contained" onClick={exportPdf} disabled={!data.length}>Export PDF</Button></Stack>}
      />
      <Box mb={2}>
        <DDateRange from={from} to={to} onFromChange={setFrom} onToChange={setTo} />
      </Box>
      <DTable columns={columns} rows={data} rowKey={(d) => d.method} loading={loading} emptyMessage="No payment data" />
      {data.length > 0 && (
        <Box display="flex" justifyContent="flex-end" gap={4} mt={2} px={2}>
          <Typography fontWeight={700}>Total: {data.reduce((s, d) => s + d.count, 0)} txns</Typography>
          <Typography fontWeight={800}>{formatCurrency(grandTotal)}</Typography>
        </Box>
      )}
    </Box>
  );
}
