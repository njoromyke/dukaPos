"use client";

import { useCallback } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import CloudUploadIcon from "@mui/icons-material/CloudUploadOutlined";
import DeleteIcon from "@mui/icons-material/DeleteOutline";
import DProductImage from "./DProductImage";

interface Props {
  preview: string | null;
  onSelect: (file: File) => void;
  onRemove: () => void;
  accept?: string;
}

export default function DImageUpload({
  preview,
  onSelect,
  onRemove,
  accept = "image/*",
}: Props) {
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) onSelect(file);
    },
    [onSelect]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onSelect(file);
  };

  if (preview) {
    return (
      <Box display="flex" alignItems="center" gap={1.5}>
        <DProductImage imageUrl={preview} size={72} />
        <IconButton size="small" color="error" onClick={onRemove}>
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Box>
    );
  }

  return (
    <Box
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      sx={{
        border: "1px dashed",
        borderColor: "divider",
        borderRadius: 2,
        p: { xs: 2.25, sm: 3 },
        bgcolor: '#FBFCFD',
        textAlign: "center",
        cursor: "pointer",
        "&:hover": { borderColor: "primary.main", bgcolor: "#F1FAF6" },
      }}
    >
      <CloudUploadIcon sx={{ fontSize: 36, color: "text.disabled", mb: 0.5 }} />
      <Typography variant="body2" color="text.secondary">
        Drag & drop or click to upload
      </Typography>
      <Button component="label" size="small" sx={{ mt: 1 }}>
        Browse
        <input type="file" accept={accept} hidden onChange={handleChange} />
      </Button>
    </Box>
  );
}
