import dayjs from "dayjs";

const EMPTY_GUID = "00000000-0000-0000-0000-000000000000";

export function formatCurrency(amount: number): string {
  return `KES ${(amount ?? 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(date: string | Date, format: "short" | "long" = "short"): string {
  if (!date) return "";
  const d = dayjs(date);
  return format === "long" ? d.format("MMMM D, YYYY") : d.format("MMM D, YYYY");
}

export function formatDateTime(date: string | Date): string {
  if (!date) return "";
  return dayjs(date).format("MMM D, YYYY h:mm A");
}

export function isEmptyGuid(id: string | undefined | null): boolean {
  return !id || id === EMPTY_GUID;
}

export function downloadCsv(filename: string, rows: Array<Array<string | number>>): void {
  const escape = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
  const csv = rows.map((row) => row.map(escape).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
