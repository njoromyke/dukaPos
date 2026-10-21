"use client";

import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import api from "@/lib/api";

interface Props { imageUrl?: string | null; imageData?: string | null; size?: number; radius?: number }

export default function DProductImage({ imageUrl, imageData, size = 42, radius = 1.5 }: Props) {
  const [source, setSource] = useState<string | null>(null);
  useEffect(() => {
    if (imageData) { setSource(imageData); return; }
    if (!imageUrl) { setSource(null); return; }
    if (imageUrl.startsWith("blob:") || imageUrl.startsWith("data:")) { setSource(imageUrl); return; }
    let objectUrl: string | null = null;
    let active = true;
    let path = imageUrl;
    if (imageUrl.startsWith("http")) {
      try {
        const image = new URL(imageUrl);
        const apiOrigin = new URL(api.defaults.baseURL || window.location.origin).origin;
        if (image.origin !== apiOrigin) { setSource(imageUrl); return; }
        path = `${image.pathname}${image.search}`;
      } catch { setSource(null); return; }
    } else if (!imageUrl.startsWith("/")) {
      path = `/api/blobs/${imageUrl}`;
    }
    api.get(path, { responseType: "blob" }).then(({ data }) => {
      objectUrl = URL.createObjectURL(data);
      if (active) setSource(objectUrl);
    }).catch(() => { if (active) setSource(null); });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [imageUrl, imageData]);
  return (
    <Box sx={{ width: size, height: size, flex: `0 0 ${size}px`, borderRadius: radius, overflow: "hidden", bgcolor: "action.hover", display: "grid", placeItems: "center" }}>
      {source ? <Box component="img" src={source} alt="" sx={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <ImageOutlinedIcon sx={{ color: "text.disabled", fontSize: size * 0.48 }} />}
    </Box>
  );
}
