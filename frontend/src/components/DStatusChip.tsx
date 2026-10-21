"use client";

import Chip from "@mui/material/Chip";

const statusColors: Record<string, "success" | "error" | "warning" | "info" | "default"> = {
  active: "success",
  completed: "success",
  paid: "success",
  approved: "success",
  open: "info",
  pending: "warning",
  processing: "warning",
  draft: "warning",
  inactive: "default",
  cancelled: "error",
  voided: "error",
  failed: "error",
  rejected: "error",
  locked: "error",
};

interface Props {
  status: string;
  variant?: "filled" | "outlined";
}

export default function DStatusChip({ status, variant = "outlined" }: Props) {
  const color = statusColors[status.toLowerCase()] ?? "default";
  const label = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();

  return <Chip label={label} color={color} variant={variant} size="small" />;
}
