"use client";

import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import dayjs from "dayjs";

interface Props {
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  onRangeChange?: (from: string, to: string) => void;
}

const presets = [
  { label: "Today", from: () => dayjs().format("YYYY-MM-DD"), to: () => dayjs().format("YYYY-MM-DD") },
  { label: "This Week", from: () => dayjs().startOf("week").format("YYYY-MM-DD"), to: () => dayjs().format("YYYY-MM-DD") },
  { label: "This Month", from: () => dayjs().startOf("month").format("YYYY-MM-DD"), to: () => dayjs().format("YYYY-MM-DD") },
  { label: "Last 30 Days", from: () => dayjs().subtract(30, "day").format("YYYY-MM-DD"), to: () => dayjs().format("YYYY-MM-DD") },
];

export default function DDateRange({ from, to, onFromChange, onToChange, onRangeChange }: Props) {
  return (
    <Box display="flex" gap={1.5} alignItems="center" flexWrap="wrap">
      <TextField
        type="date"
        label="From"
        value={from}
        onChange={(e) => onFromChange(e.target.value)}
        slotProps={{ inputLabel: { shrink: true } }}
        sx={{ width: 160 }}
      />
      <TextField
        type="date"
        label="To"
        value={to}
        onChange={(e) => onToChange(e.target.value)}
        slotProps={{ inputLabel: { shrink: true } }}
        sx={{ width: 160 }}
      />
      {presets.map((p) => (
        <Button
          key={p.label}
          size="small"
          variant="outlined"
          onClick={() => {
            if (onRangeChange) onRangeChange(p.from(), p.to());
            else {
              onFromChange(p.from());
              onToChange(p.to());
            }
          }}
          sx={{ textTransform: "none", whiteSpace: "nowrap" }}
        >
          {p.label}
        </Button>
      ))}
    </Box>
  );
}
