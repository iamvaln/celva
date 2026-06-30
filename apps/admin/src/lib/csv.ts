/**
 * Client-side CSV export.
 *
 * Builds a UTF-8 CSV string (with a BOM so Excel reads accents correctly),
 * comma-separated, RFC-4180 quoting, and triggers a download via a temporary
 * `<a>` element. No server round-trip — operates on the rows already in memory.
 */

export type CsvColumn<T> = {
  /** Header label (already translated by the caller). */
  label: string;
  /** Extracts the cell value from a row. */
  get: (row: T) => string | number;
};

/** Quote/escape a single field per RFC 4180 (double quotes, comma, newlines). */
const escapeField = (value: string | number): string => {
  const s = String(value ?? '');
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
};

/**
 * Build a CSV from `rows` using `columns` and trigger a browser download.
 *
 * @param filename  Suggested file name (`.csv` appended if missing).
 * @param columns   Ordered column definitions (label + value extractor).
 * @param rows      Data rows — already filtered/sorted by the caller.
 */
export function downloadCsv<T>(
  filename: string,
  columns: Array<CsvColumn<T>>,
  rows: T[],
): void {
  const header = columns.map((c) => escapeField(c.label)).join(',');
  const body = rows
    .map((row) => columns.map((c) => escapeField(c.get(row))).join(','))
    .join('\r\n');
  const csv = body ? `${header}\r\n${body}` : header;

  // BOM prefix so Excel/Numbers detect UTF-8 (preserves é, è, FCFA, …).
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
