"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterConfig {
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
  minWidth?: number;
}

interface Props {
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filters?: FilterConfig[];
  onRefresh?: () => void;
  debounceMs?: number;
  extra?: ReactNode;
}

export default function DSearchFilter({
  search: controlledSearch,
  onSearchChange,
  searchPlaceholder = "Search...",
  filters,
  onRefresh,
  debounceMs = 300,
  extra,
}: Props) {
  const [local, setLocal] = useState(controlledSearch ?? "");

  useEffect(() => {
    if (controlledSearch !== undefined) setLocal(controlledSearch);
  }, [controlledSearch]);

  const emit = useCallback(
    (val: string) => {
      onSearchChange?.(val);
    },
    [onSearchChange]
  );

  useEffect(() => {
    if (!onSearchChange) return;
    const t = setTimeout(() => emit(local), debounceMs);
    return () => clearTimeout(t);
  }, [local, debounceMs, emit, onSearchChange]);

  return (
    <Box display="flex" gap={2} flexWrap="wrap" alignItems="center" justifyContent="flex-end" mb={2}>
      {onSearchChange && (
        <TextField
          placeholder={searchPlaceholder}
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
          size="small"
          sx={{
            width: { xs: "100%", sm: 320, md: 420 },
            "& .MuiOutlinedInput-root": { borderRadius: 3, minHeight: 48, fontSize: 16 },
          }}
        />
      )}
      {filters?.map((f) => (
        <TextField
          key={f.label}
          select
          size="small"
          label={f.label}
          value={f.value}
          onChange={(e) => f.onChange(e.target.value)}
          sx={{
            minWidth: f.minWidth ?? 220,
            "& .MuiOutlinedInput-root": { borderRadius: 3, minHeight: 48, fontSize: 16 },
          }}
        >
          {f.options.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </TextField>
      ))}
      {extra}
      {onRefresh && (
        <IconButton
          onClick={onRefresh}
          title="Refresh"
          sx={{ width: 52, height: 52, bgcolor: "action.hover", "&:hover": { bgcolor: "action.selected" } }}
        >
          <RefreshIcon />
        </IconButton>
      )}
    </Box>
  );
}
