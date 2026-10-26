"use client";

import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
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
  const apply = (rangeFrom: string, rangeTo: string) => {
    if (onRangeChange) onRangeChange(rangeFrom, rangeTo);
    else { onFromChange(rangeFrom); onToChange(rangeTo); }
  };

  const activePreset = presets.find((preset) => preset.from() === from && preset.to() === to)?.label;

  return (
    <Box sx={{
      display: 'flex', gap: 1.5, alignItems: { xs: 'stretch', lg: 'center' }, flexWrap: 'wrap',
      p: 1.25, mb: 1.5, border: '1px solid #E6EAF0', borderRadius: 2.5, bgcolor: '#fff',
      boxShadow: '0 1px 3px rgba(15,23,42,.025)',
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Typography sx={{ color: '#8895A6', fontSize: '.72rem', fontWeight: 700, letterSpacing: '.045em', textTransform: 'uppercase', mr: .25 }}>Date range</Typography>
        <TextField
          type="date"
          label="From"
          value={from}
          onChange={(e) => onFromChange(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ width: { xs: 145, sm: 160 }, '& .MuiOutlinedInput-root': { minHeight: 40, borderRadius: 1.75, bgcolor: '#FBFCFD', fontSize: '.82rem' }, '& .MuiInputLabel-root': { fontSize: '.82rem' } }}
        />
        <Typography sx={{ color: '#B0B9C5', fontSize: '.8rem', px: .15 }}>to</Typography>
        <TextField
          type="date"
          label="To"
          value={to}
          onChange={(e) => onToChange(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ width: { xs: 145, sm: 160 }, '& .MuiOutlinedInput-root': { minHeight: 40, borderRadius: 1.75, bgcolor: '#FBFCFD', fontSize: '.82rem' }, '& .MuiInputLabel-root': { fontSize: '.82rem' } }}
        />
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: .4, p: .45, borderRadius: 2, bgcolor: '#F3F6F8', ml: { lg: 'auto' }, flexWrap: 'wrap' }}>
        {presets.map((preset) => {
          const selected = activePreset === preset.label;
          return (
            <Button
              key={preset.label}
              size="small"
              aria-pressed={selected}
              onClick={() => apply(preset.from(), preset.to())}
              sx={{
                minHeight: 34, px: { xs: 1, sm: 1.35 }, borderRadius: 1.5, whiteSpace: 'nowrap',
                color: selected ? '#087A58' : '#68778A', bgcolor: selected ? '#fff' : 'transparent',
                fontSize: '.76rem', fontWeight: selected ? 700 : 550, boxShadow: selected ? '0 1px 3px rgba(15,23,42,.1)' : 'none',
                '&:hover': { bgcolor: selected ? '#fff' : '#E9F7F1', color: '#047857', boxShadow: 'none' },
              }}
            >
              {preset.label}
            </Button>
          );
        })}
      </Box>
    </Box>
  );
}
