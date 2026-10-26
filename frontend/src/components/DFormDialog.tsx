"use client";

import type { ReactNode } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import Box from "@mui/material/Box";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  onSave: () => void;
  saving?: boolean;
  saveLabel?: string;
  maxWidth?: "xs" | "sm" | "md" | "lg";
  disabled?: boolean;
}

export default function DFormDialog({
  open,
  onClose,
  title,
  children,
  onSave,
  saving,
  saveLabel = "Save",
  maxWidth = "sm",
  disabled,
}: Props) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth={maxWidth} fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 3, pt: 2.5, pb: 1.5, color: '#172334' }}>
        <Box>
          <Box component="span" sx={{ display: 'block', fontWeight: 750, letterSpacing: '-.02em' }}>{title}</Box>
          <Box component="span" sx={{ display: 'block', color: '#8390A1', fontSize: '.78rem', fontWeight: 400, mt: .35 }}>Enter the details below, then save your changes.</Box>
        </Box>
        <IconButton onClick={onClose} size="small" edge="end">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ px: 3, py: 2 }}>
        <Box display="flex" flexDirection="column" gap={2} mt={0}>
          {children}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #EEF1F4', bgcolor: '#FBFCFD' }}>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={onSave}
          disabled={saving || disabled}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {saveLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
