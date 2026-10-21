"use client";

import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Grid from "@mui/material/Grid2";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import dayjs from "dayjs";
import { useAuthStore } from "@/stores/auth-store";
import api, { reportsApi } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { DPageHeader, DStatCard, DFeatureUpgradeHint } from "@/components";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import { downloadBlob, downloadCsv } from "@/lib/utils";

interface TopProduct { productName: string; quantitySold: number; revenue: number; }

export default function DailyReportPage() {
  const auth = useAuthStore();
  const [date, setDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [summary, setSummary] = useState<{ totalSales: number; totalRevenue: number; averageBasket: number; cashTotal: number; mpesaTotal: number } | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [topProductsAllowed, setTopProductsAllowed] = useState(true);

  useEffect(() => {
    api.get('/api/subscriptions/current').then((response) => {
      const features = response.data?.features as string[] | undefined;
      if (features?.length) setTopProductsAllowed(features.includes('top_products_reports'));
    }).catch(() => {});
  }, []);

  const load = () => {
    if (!auth.user?.branchId) return;
    reportsApi.dailySummary(auth.user.branchId, date).then((r) => setSummary(r.data)).catch(() => {});
    if (topProductsAllowed) reportsApi.topProducts(auth.user.branchId, date, date, 10).then((r) => setTopProducts(r.data)).catch(() => {});
  };

  useEffect(() => { load(); }, [auth.user?.branchId, date, topProductsAllowed]);

  const cashPct = summary && summary.totalRevenue > 0 ? (summary.cashTotal / summary.totalRevenue) * 100 : 0;
  const mpesaPct = summary && summary.totalRevenue > 0 ? (summary.mpesaTotal / summary.totalRevenue) * 100 : 0;
  const exportCsv = () => downloadCsv(`daily-report-${date}.csv`, [["Metric", "Value"], ["Sales", summary?.totalSales ?? 0], ["Revenue (KES)", summary?.totalRevenue ?? 0], ["Cash (KES)", summary?.cashTotal ?? 0], ["M-Pesa (KES)", summary?.mpesaTotal ?? 0], ["Average basket (KES)", summary?.averageBasket ?? 0], [], ["Top product", "Quantity sold", "Revenue (KES)"], ...topProducts.map((item) => [item.productName, item.quantitySold, item.revenue])]);
  const exportPdf = async () => {
    if (!auth.user?.branchId) return;
    try { const response = await reportsApi.exportPdf("daily", auth.user.branchId, undefined, undefined, date); downloadBlob(`daily-report-${date}.pdf`, response.data); }
    catch { /* API errors are handled by the shared request layer */ }
  };

  return (
    <Box>
      <DPageHeader
        title="Daily Report"
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Reports" }, { label: "Daily" }]}
        action={<Stack direction="row" spacing={1} alignItems="center"><TextField type="date" value={date} onChange={(e) => setDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} /><Button variant="outlined" onClick={exportCsv} disabled={!summary}>CSV</Button><Button variant="contained" onClick={exportPdf} disabled={!summary}>PDF</Button></Stack>}
      />

      {summary && (
        <Grid container spacing={2} mb={3}>
          <Grid size={{ xs: 12, sm: 4 }}><DStatCard label="Total Sales" value={summary.totalSales} color="#1565C0" /></Grid>
          <Grid size={{ xs: 12, sm: 4 }}><DStatCard label="Revenue" value={formatCurrency(summary.totalRevenue)} color="#059669" /></Grid>
          <Grid size={{ xs: 12, sm: 4 }}><DStatCard label="Avg Basket" value={formatCurrency(summary.averageBasket)} color="#7C3AED" /></Grid>
        </Grid>
      )}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Payment Breakdown</Typography>
            {summary ? (
              <Box>
                <Box mb={2}>
                  <Box display="flex" justifyContent="space-between" mb={0.5}>
                    <Typography variant="body2">Cash</Typography>
                    <Typography variant="body2" fontWeight={700}>{formatCurrency(summary.cashTotal)}</Typography>
                  </Box>
                  <Box sx={{ height: 8, borderRadius: 4, bgcolor: "action.hover", overflow: "hidden" }}>
                    <Box sx={{ height: "100%", width: `${cashPct}%`, bgcolor: "primary.main", borderRadius: 4 }} />
                  </Box>
                </Box>
                <Box>
                  <Box display="flex" justifyContent="space-between" mb={0.5}>
                    <Typography variant="body2">M-Pesa</Typography>
                    <Typography variant="body2" fontWeight={700}>{formatCurrency(summary.mpesaTotal)}</Typography>
                  </Box>
                  <Box sx={{ height: 8, borderRadius: 4, bgcolor: "action.hover", overflow: "hidden" }}>
                    <Box sx={{ height: "100%", width: `${mpesaPct}%`, bgcolor: "secondary.main", borderRadius: 4 }} />
                  </Box>
                </Box>
              </Box>
            ) : <Typography color="text.secondary">Loading...</Typography>}
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Top Products</Typography>
            {!topProductsAllowed ? <DFeatureUpgradeHint feature="top_products_reports" label="Top products report" /> : <>
            <Table size="small">
              <TableHead><TableRow><TableCell>Product</TableCell><TableCell align="right">Qty</TableCell><TableCell align="right">Revenue</TableCell></TableRow></TableHead>
              <TableBody>
                {topProducts?.map((p, i) => (
                  <TableRow key={i}><TableCell>{p.productName}</TableCell><TableCell align="right">{p.quantitySold}</TableCell><TableCell align="right">{formatCurrency(p.revenue)}</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
            </>}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
