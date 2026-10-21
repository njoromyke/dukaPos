"use client";

import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import { alpha, useTheme } from "@mui/material/styles";

interface Props {
  label: string;
  value: string | number;
  icon?: ReactNode;
  color?: string;
  trend?: { value: number; label?: string };
}

export default function DStatCard({ label, value, icon, color, trend }: Props) {
  const theme = useTheme();
  const c = color ?? theme.palette.primary.main;

  return (
    <Paper
      sx={{
        p: 0,
        flex: 1,
        minWidth: 180,
        position: "relative",
        overflow: "hidden",
        border: "1px solid",
        borderColor: "divider",
        boxShadow: "0 1px 3px 0 rgba(15, 23, 42, 0.04)",
        transition: "box-shadow 0.2s ease, transform 0.2s ease",
        "&:hover": {
          boxShadow: "0 4px 12px 0 rgba(15, 23, 42, 0.08)",
          transform: "translateY(-1px)",
        },
      }}
    >
      <Box sx={{ p: 2.5, display: "flex", alignItems: "flex-start", gap: 2 }}>
        {icon && (
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2.5,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: alpha(c, 0.1),
              color: c,
              flexShrink: 0,
            }}
          >
            {icon}
          </Box>
        )}
        <Box sx={{ minWidth: 0 }}>
          <Typography
            sx={{
              fontSize: "0.75rem",
              fontWeight: 600,
              color: "text.secondary",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              mb: 0.5,
            }}
          >
            {label}
          </Typography>
          <Typography sx={{ fontSize: "1.5rem", fontWeight: 800, lineHeight: 1.2, letterSpacing: "-0.02em" }}>
            {value}
          </Typography>
          {trend && (
            <Typography
              sx={{
                fontSize: "0.75rem",
                fontWeight: 600,
                color: trend.value >= 0 ? "success.main" : "error.main",
                mt: 0.5,
              }}
            >
              {trend.value >= 0 ? "+" : ""}
              {trend.value}%{trend.label ? ` ${trend.label}` : ""}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Bottom accent bar */}
      <Box
        sx={{
          height: 3,
          background: `linear-gradient(90deg, ${c}, ${alpha(c, 0.3)})`,
        }}
      />
    </Paper>
  );
}
