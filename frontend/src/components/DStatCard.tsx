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
        borderColor: "#E6EAF0",
        borderRadius: 3,
        boxShadow: "0 2px 8px rgba(15, 23, 42, 0.035)",
        transition: "box-shadow 0.2s ease, transform 0.2s ease",
        "&:hover": {
          boxShadow: "0 8px 20px rgba(15, 23, 42, 0.07)",
          transform: "translateY(-2px)",
        },
      }}
    >
      <Box sx={{ p: { xs: 2, sm: 2.25 }, display: "flex", alignItems: "flex-start", gap: 1.75 }}>
        {icon && (
          <Box
            sx={{
              width: 42,
              height: 42,
              borderRadius: 2,
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
              fontSize: "0.7rem",
              fontWeight: 650,
              color: "text.secondary",
              letterSpacing: "0.015em",
              mb: 0.5,
            }}
          >
            {label}
          </Typography>
          <Typography sx={{ fontSize: { xs: "1.28rem", sm: "1.42rem" }, fontWeight: 750, lineHeight: 1.2, letterSpacing: "-0.035em", fontVariantNumeric: 'tabular-nums' }}>
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

    </Paper>
  );
}
