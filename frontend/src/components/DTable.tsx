"use client";

import { useEffect, useMemo, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import Box from "@mui/material/Box";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TablePagination from "@mui/material/TablePagination";
import TableSortLabel from "@mui/material/TableSortLabel";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Skeleton from "@mui/material/Skeleton";
import InboxIcon from "@mui/icons-material/InboxOutlined";

export interface DColumn<T> {
  field: string;
  header: string;
  align?: "left" | "center" | "right";
  width?: number | string;
  sortable?: boolean;
  render?: (row: T) => ReactNode;
}

interface Props<T> {
  columns: DColumn<T>[];
  rows: T[];
  rowKey?: (row: T) => string;
  loading?: boolean;
  totalCount?: number;
  page?: number;
  pageSize?: number;
  pageSizeOptions?: number[];
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  onRowClick?: (row: T) => void;
  emptyIcon?: ReactNode;
  emptyMessage?: string;
  stickyHeader?: boolean;
}

export default function DTable<T extends Record<string, any>>({
  columns,
  rows,
  rowKey,
  loading,
  totalCount,
  page = 0,
  pageSize = 10,
  pageSizeOptions = [10, 20, 50],
  onPageChange,
  onPageSizeChange,
  onRowClick,
  emptyIcon,
  emptyMessage = "No data found",
  stickyHeader = true,
}: Props<T>) {
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [columnOrder, setColumnOrder] = useState<string[]>(() => columns.map((column) => column.field));
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() =>
    Object.fromEntries(columns.map((column) => [column.field, typeof column.width === "number" ? column.width : 180]))
  );
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [localPage, setLocalPage] = useState(0);
  const [localPageSize, setLocalPageSize] = useState(pageSize);

  useEffect(() => {
    setColumnOrder((current) => {
      const incoming = columns.map((column) => column.field);
      const kept = current.filter((field) => incoming.includes(field));
      return [...kept, ...incoming.filter((field) => !kept.includes(field))];
    });
  }, [columns]);

  const orderedColumns = useMemo(() => {
    const byField = new Map(columns.map((column) => [column.field, column]));
    return columnOrder.map((field) => byField.get(field)).filter((column): column is DColumn<T> => Boolean(column));
  }, [columns, columnOrder]);

  const moveColumn = (target: string) => {
    if (!draggedColumn || draggedColumn === target) return;
    setColumnOrder((current) => {
      const next = [...current];
      const from = next.indexOf(draggedColumn);
      const to = next.indexOf(target);
      if (from < 0 || to < 0) return current;
      next.splice(from, 1);
      next.splice(to, 0, draggedColumn);
      return next;
    });
    setDraggedColumn(null);
  };

  const startResize = (event: ReactPointerEvent<HTMLDivElement>, field: string) => {
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const initialWidth = columnWidths[field] ?? 180;
    const onMove = (moveEvent: PointerEvent) => {
      const nextWidth = Math.max(88, initialWidth + moveEvent.clientX - startX);
      setColumnWidths((current) => ({ ...current, [field]: nextWidth }));
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const sortedRows = sortField
    ? [...rows].sort((a, b) => {
        const av = a[sortField];
        const bv = b[sortField];
        if (av == null && bv == null) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        const cmp = typeof av === "string" ? av.localeCompare(bv) : av - bv;
        return sortDir === "asc" ? cmp : -cmp;
      })
    : rows;

  const count = totalCount ?? rows.length;
  const minTableWidth = orderedColumns.reduce((width, column) => width + (columnWidths[column.field] ?? 180), 0);
  const activePage = onPageChange ? page : localPage;
  const activePageSize = onPageChange ? pageSize : localPageSize;
  const visibleRows = onPageChange ? sortedRows : sortedRows.slice(activePage * activePageSize, (activePage + 1) * activePageSize);
  const showPagination = count > 0;

  return (
    <Paper sx={{ width: "100%", minWidth: 0, maxWidth: "100%", boxSizing: "border-box", overflow: "hidden", display: "flex", flexDirection: "column", height: "calc(100vh - 320px)", minHeight: 360 }}>
      <TableContainer sx={{ width: "100%", minWidth: 0, maxWidth: "100%", flex: 1, minHeight: 0, overflowX: "auto", overflowY: "auto", overscrollBehavior: "contain" }}>
        <Table size="medium" stickyHeader={stickyHeader} sx={{ minWidth: minTableWidth, tableLayout: "fixed", width: `max(100%, ${minTableWidth}px)` }}>
          <TableHead>
            <TableRow>
              {orderedColumns.map((col) => (
                <TableCell
                  key={col.field}
                  align={col.align}
                  sx={{
                    width: columnWidths[col.field],
                    minWidth: 88,
                    maxWidth: columnWidths[col.field],
                    position: "relative",
                    bgcolor: "#F3F5F7",
                    color: "#718096",
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                    borderBottom: "1px solid #DCE1E6",
                    cursor: "grab",
                    userSelect: "none",
                  }}
                  draggable
                  onDragStart={() => setDraggedColumn(col.field)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => moveColumn(col.field)}
                  onDragEnd={() => setDraggedColumn(null)}
                >
                  {col.sortable !== false ? (
                    <TableSortLabel
                      active={sortField === col.field}
                      direction={sortField === col.field ? sortDir : "asc"}
                      onClick={() => handleSort(col.field)}
                    >
                      {col.header}
                    </TableSortLabel>
                  ) : (
                    col.header
                  )}
                  <Box
                    role="separator"
                    aria-orientation="vertical"
                    aria-label={`Resize ${col.header} column`}
                    title="Drag to resize column"
                    onPointerDown={(event) => startResize(event, col.field)}
                    sx={{
                      position: "absolute",
                      top: 0,
                      right: 0,
                      width: 8,
                      height: "100%",
                      cursor: "col-resize",
                      touchAction: "none",
                      zIndex: 2,
                      "&:hover, &:active": { bgcolor: "primary.main", opacity: 0.45 },
                    }}
                  />
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {orderedColumns.map((col) => (
                      <TableCell key={col.field}>
                        <Skeleton variant="text" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : visibleRows.map((row, i) => (
                  <TableRow
                    key={rowKey ? rowKey(row) : i}
                    hover
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    sx={{
                      ...(onRowClick ? { cursor: "pointer" } : {}),
                      "&:nth-of-type(even)": { bgcolor: "rgba(145, 158, 171, 0.06)" },
                      "& td": { borderBottom: "1px dashed #E1E5E9", py: 1.8 },
                    }}
                  >
                    {orderedColumns.map((col) => (
                      <TableCell key={col.field} align={col.align} sx={{ width: columnWidths[col.field], maxWidth: columnWidths[col.field], overflow: "hidden", textOverflow: "ellipsis" }}>
                        {col.render ? col.render(row) : row[col.field]}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
            {!loading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length} align="center">
                  <Box py={6} display="flex" flexDirection="column" alignItems="center" gap={1}>
                    {emptyIcon ?? <InboxIcon sx={{ fontSize: 48, color: "text.disabled" }} />}
                    <Typography color="text.secondary">{emptyMessage}</Typography>
                  </Box>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      {showPagination && (
        <TablePagination
          component="div"
          count={count}
          page={Math.min(activePage, Math.max(0, Math.ceil(count / activePageSize) - 1))}
          rowsPerPage={activePageSize}
          rowsPerPageOptions={pageSizeOptions}
          onPageChange={(_, p) => onPageChange ? onPageChange(p) : setLocalPage(p)}
          onRowsPerPageChange={(e) => {
            const size = parseInt(e.target.value, 10);
            if (onPageSizeChange) onPageSizeChange(size);
            else { setLocalPageSize(size); setLocalPage(0); }
          }}
        />
      )}
    </Paper>
  );
}
