"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import CircularProgress from "@mui/material/CircularProgress";
import MenuItem from "@mui/material/MenuItem";
import FilterAltIcon from "@mui/icons-material/FilterAltOutlined";
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
  refreshLoading?: boolean;
  filterAction?: boolean;
  debounceMs?: number;
  extra?: ReactNode;
}

export default function DSearchFilter({
  search: controlledSearch,
  onSearchChange,
  searchPlaceholder = "Search...",
  filters,
  onRefresh,
  refreshLoading = false,
  filterAction = false,
  debounceMs = 300,
  extra,
}: Props) {
  const [local, setLocal] = useState(controlledSearch ?? "");
  const [filterOpen, setFilterOpen] = useState(false);
  const onSearchChangeRef = useRef(onSearchChange);

  useEffect(() => {
    onSearchChangeRef.current = onSearchChange;
  }, [onSearchChange]);

  useEffect(() => {
    if (controlledSearch !== undefined) setLocal(controlledSearch);
  }, [controlledSearch]);

  useEffect(() => {
    if (!onSearchChangeRef.current || local === (controlledSearch ?? "")) return;
    const t = setTimeout(() => onSearchChangeRef.current?.(local), debounceMs);
    return () => clearTimeout(t);
  }, [local, controlledSearch, debounceMs]);

  return (
    <Box display="flex" gap={1.25} flexWrap="wrap" alignItems="center" justifyContent="flex-start" mb={2}>
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
            width: { xs: "100%", sm: 280, md: 340 },
            "& .MuiOutlinedInput-root": { borderRadius: 2, minHeight: 42, fontSize: 14 },
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
          slotProps={{
            select: {
              open: filterAction ? filterOpen : undefined,
              onOpen: () => { if (filterAction) setFilterOpen(true); },
              onClose: () => setFilterOpen(false),
            },
          }}
          sx={{
            minWidth: f.minWidth ?? 180,
            "& .MuiOutlinedInput-root": { borderRadius: 2, minHeight: 42, fontSize: 14 },
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
      {filterAction && filters?.length ? (
        <Tooltip title="Filter products">
          <IconButton
            onClick={() => setFilterOpen(true)}
            aria-label="Open product filters"
            sx={{
              width: 42, height: 42, bgcolor: '#087A58', color: '#fff', borderRadius: 2,
              border: '1px solid #087A58', transition: 'all .15s ease',
              '&:hover': { bgcolor: '#066648', borderColor: '#066648', transform: 'translateY(-1px)' },
              '&:active': { transform: 'scale(.97)' },
            }}
          >
            <FilterAltIcon />
          </IconButton>
        </Tooltip>
      ) : onRefresh && (
        <Tooltip title={refreshLoading ? 'Reloading…' : 'Reload results'}>
          <span>
            <IconButton
              onClick={onRefresh}
              aria-label="Reload results"
              disabled={refreshLoading}
              sx={{
                width: 42, height: 42, bgcolor: "#fff", color: '#5A697D', borderRadius: 2,
                border: '1px solid #E2E8F0', transition: 'all .15s ease',
                "&:hover": { bgcolor: "#E9F7F1", color: '#047857', borderColor: '#A7DCC4' },
                "&:active": { transform: 'scale(.97)' },
                '& .MuiSvgIcon-root': { transition: 'transform .25s ease' },
                '&:hover .MuiSvgIcon-root': { transform: 'rotate(35deg)' },
              }}
            >
              {refreshLoading ? <CircularProgress size={18} color="inherit" /> : <RefreshIcon />}
            </IconButton>
          </span>
        </Tooltip>
      )}
    </Box>
  );
}
