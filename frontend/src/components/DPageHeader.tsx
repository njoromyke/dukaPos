"use client";

import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import Link from "@mui/material/Link";
import NextLink from "next/link";

interface Crumb {
  label: string;
  href?: string;
}

interface Props {
  title: string;
  subtitle?: string;
  breadcrumbs?: Crumb[];
  action?: ReactNode;
}

export default function DPageHeader({ title, subtitle, breadcrumbs, action }: Props) {
  return (
    <Box mb={3}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumbs sx={{ mb: 1.25, fontSize: "0.78rem", '& .MuiBreadcrumbs-separator': { color: '#B2BBC7' } }}>
          {breadcrumbs.map((crumb, i) =>
            crumb.href && i < breadcrumbs.length - 1 ? (
              <Link
                key={i}
                component={NextLink}
                href={crumb.href}
                underline="hover"
                color="text.secondary"
                sx={{ fontSize: "inherit", color: '#758397' }}
              >
                {crumb.label}
              </Link>
            ) : (
              <Typography key={i} color="text.primary" sx={{ fontSize: "inherit", fontWeight: 600 }}>
                {crumb.label}
              </Typography>
            )
          )}
        </Breadcrumbs>
      )}
      <Box display="flex" alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between" gap={2} flexWrap="wrap">
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h5" sx={{ fontSize: { xs: '1.4rem', sm: '1.65rem' }, fontWeight: 750, color: '#142033', letterSpacing: '-0.035em' }}>{title}</Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary" mt={0.5} sx={{ fontSize: '0.86rem' }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        {action && <Box display="flex" gap={1} flexWrap="wrap">{action}</Box>}
      </Box>
    </Box>
  );
}
