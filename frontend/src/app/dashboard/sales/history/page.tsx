"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import IconButton from "@mui/material/IconButton";
import ReceiptIcon from "@mui/icons-material/ReceiptLong";
import dayjs from "dayjs";
import { useAuthStore } from "@/stores/auth-store";
import { salesApi, receiptApi } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { DPageHeader, DTable, DDateRange, DStatusChip } from "@/components";
import type { DColumn } from "@/components";

interface SaleRecord {
  id: string; saleNumber: string; status: string; cashierName: string;
  grandTotal: number; lineItems: { productName: string; quantity: number; unitPrice: number; lineTotal: number }[];
  completedAt?: string; startedAt: string;
}

export default function SalesHistoryPage() {
  const auth = useAuthStore();
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [detail, setDetail] = useState<SaleRecord | null>(null);
  const requestSequence = useRef(0);

  const load = useCallback(async () => {
    if (!auth.user?.branchId) return;
    const requestId = ++requestSequence.current;
    setLoading(true);
    try {
      const res = await salesApi.getHistory(auth.user.branchId, from || undefined, to || undefined, page + 1, pageSize);
      const data = res.data;
      const rows = data?.sales ?? data?.Sales ?? (Array.isArray(data) ? data : []);
      if (requestId !== requestSequence.current) return;
      setSales(rows);
      setTotal(Number(data?.totalCount ?? data?.TotalCount ?? rows.length));
    } catch { /* */ }
    finally { if (requestId === requestSequence.current) setLoading(false); }
  }, [auth.user?.branchId, from, to, page, pageSize]);

  useEffect(() => { load(); }, [load]);

  const handleReceipt = async (e: React.MouseEvent, s: SaleRecord) => {
    e.stopPropagation();
    try {
      const res = await receiptApi.getBySale(s.id);
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url; a.download = `receipt-${s.saleNumber}.bin`; a.click();
      URL.revokeObjectURL(url);
    } catch { /* */ }
  };

  const openSaleDetails = async (sale: SaleRecord) => {
    try {
      const response = await salesApi.getSale(sale.id);
      const data = response.data;
      setDetail({
        ...sale,
        lineItems: data?.lineItems ?? data?.LineItems ?? [],
      });
    } catch {
      setDetail({ ...sale, lineItems: [] });
    }
  };

  const columns: DColumn<SaleRecord>[] = [
    { field: "saleNumber", header: "Sale #", render: (s) => <Typography variant="body2" fontWeight={600}>{s.saleNumber}</Typography> },
    { field: "cashierName", header: "Cashier" },
    { field: "status", header: "Status", render: (s) => <DStatusChip status={s.status} /> },
    { field: "grandTotal", header: "Total", align: "right", render: (s) => formatCurrency(s.grandTotal) },
    { field: "completedAt", header: "Date", render: (s) => dayjs(s.completedAt || s.startedAt).format("DD/MM/YYYY HH:mm") },
    {
      field: "_receipt", header: "", width: 50, sortable: false,
      render: (s) => s.status === "Completed" ? (
        <IconButton size="small" title="Download receipt" onClick={(e) => handleReceipt(e, s)}><ReceiptIcon fontSize="small" /></IconButton>
      ) : null,
    },
  ];

  return (
    <Box>
      <DPageHeader
        title="Sales History"
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Sales" }, { label: "History" }]}
      />
      <Box mb={2}>
        <DDateRange from={from} to={to} onFromChange={(v) => { setFrom(v); setPage(0); }} onToChange={(v) => { setTo(v); setPage(0); }} />
      </Box>
      <DTable
        columns={columns} rows={sales} rowKey={(s) => s.id}
        loading={loading} totalCount={total} page={page} pageSize={pageSize}
        pageSizeOptions={[10, 20, 50]} onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(0); }} onRowClick={openSaleDetails}
        emptyMessage="No sales found"
      />

      <Dialog open={!!detail} onClose={() => setDetail(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Sale {detail?.saleNumber}</DialogTitle>
        <DialogContent>
          {detail && (
            <Box>
              <Typography variant="body2" color="text.secondary" mb={2}>
                {detail.cashierName} &middot; {dayjs(detail.completedAt || detail.startedAt).format("DD/MM/YYYY HH:mm")} &middot; {detail.status}
              </Typography>
              <Table size="small">
                <TableHead><TableRow><TableCell>Item</TableCell><TableCell align="right">Qty</TableCell><TableCell align="right">Price</TableCell><TableCell align="right">Total</TableCell></TableRow></TableHead>
                <TableBody>
                  {detail.lineItems.map((li, i) => (
                    <TableRow key={i}><TableCell>{li.productName}</TableCell><TableCell align="right">{li.quantity}</TableCell><TableCell align="right">{formatCurrency(li.unitPrice)}</TableCell><TableCell align="right">{formatCurrency(li.lineTotal)}</TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
              <Typography variant="h6" fontWeight={800} textAlign="right" mt={2}>{formatCurrency(detail.grandTotal)}</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setDetail(null)}>Close</Button></DialogActions>
      </Dialog>
    </Box>
  );
}
