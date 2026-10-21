"use client";

import { useEffect, useState, useCallback } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Grid from "@mui/material/Grid2";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import dayjs from "dayjs";
import { useAuthStore } from "@/stores/auth-store";
import { salesApi } from "@/lib/api";
import { useSnackbar } from "notistack";
import { formatCurrency } from "@/lib/utils";
import { DPageHeader } from "@/components";

interface Tab {
  id: string; saleId: string; customerName?: string; customerPhone?: string;
  notes?: string; saleTotal: number; itemCount: number; parkedByName: string; parkedAt: string;
}

export default function TabsPage() {
  const auth = useAuthStore();
  const { enqueueSnackbar } = useSnackbar();
  const [tabs, setTabs] = useState<Tab[]>([]);

  const load = useCallback(async () => {
    if (!auth.user?.branchId) return;
    try { const r = await salesApi.getTabs(auth.user.branchId); setTabs(r.data); }
    catch { /* */ }
  }, [auth.user?.branchId]);

  useEffect(() => { load(); }, [load]);

  const handleRecall = async (tabId: string) => {
    if (!auth.user) return;
    try {
      await salesApi.recallTab(tabId, auth.user.id);
      enqueueSnackbar("Tab recalled — go to POS to continue", { variant: "success" });
      load();
    } catch { enqueueSnackbar("Recall failed", { variant: "error" }); }
  };

  return (
    <Box>
      <DPageHeader
        title={`Open Tabs (${tabs.length})`}
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Sales" }, { label: "Tabs" }]}
        action={<Button variant="outlined" onClick={load}>Refresh</Button>}
      />
      {tabs.length === 0 ? (
        <Paper sx={{ p: 5, textAlign: "center" }}>
          <Typography color="text.secondary">No open tabs</Typography>
          <Typography variant="body2" color="text.secondary" mt={1}>Park a sale from the POS to create a tab</Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {tabs.map((t) => (
            <Grid key={t.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card variant="outlined">
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="start" mb={1}>
                    <Typography variant="subtitle1" fontWeight={700}>{t.customerName || `Tab by ${t.parkedByName}`}</Typography>
                    <Chip label={formatCurrency(t.saleTotal)} size="small" color="primary" variant="outlined" />
                  </Box>
                  <Typography variant="body2" color="text.secondary">{t.itemCount} items</Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Parked {dayjs(t.parkedAt).format("DD/MM HH:mm")} by {t.parkedByName}
                  </Typography>
                  {t.notes && <Typography variant="caption" color="warning.main" mt={0.5} display="block">{t.notes}</Typography>}
                  <Button variant="contained" size="small" sx={{ mt: 2 }} onClick={() => handleRecall(t.id)}>Recall</Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}
