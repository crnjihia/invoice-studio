// path: src/main/services/csvExportService.ts
import { app, dialog } from 'electron';
import Database from 'better-sqlite3';
import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { CsvExportResult, ExpenseFilter, InvoiceFilter } from '@shared/types';
import { toMajorUnits } from '@shared/utils/money';
import { listInvoices } from '../ipc/handlers/invoiceHandlers';

export function escapeCsvField(val: unknown): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function formatCsvRow(fields: unknown[]): string {
  return fields.map(escapeCsvField).join(',');
}

/**
 * Exports all matching invoices to RFC 4180 CSV string.
 */
export function generateInvoicesCsv(db: Database.Database, filter?: InvoiceFilter): { csv: string; count: number } {
  const result = listInvoices(db, {
    ...(filter || {}),
    page: 1,
    limit: 10000
  });

  const header = [
    'Invoice Number',
    'Client Name',
    'Status',
    'Issue Date',
    'Due Date',
    'Currency',
    'Subtotal',
    'Discount Total',
    'Tax Total',
    'Total Due',
    'Amount Paid',
    'Balance Due',
    'Notes'
  ];

  const rows: string[] = [formatCsvRow(header)];

  for (const inv of result.items) {
    rows.push(
      formatCsvRow([
        inv.invoiceNumber,
        inv.clientName || '',
        inv.status.toUpperCase(),
        inv.issueDate,
        inv.dueDate,
        inv.currency,
        toMajorUnits(inv.subtotalMinor).toFixed(2),
        toMajorUnits(inv.discountTotalMinor).toFixed(2),
        toMajorUnits(inv.taxTotalMinor).toFixed(2),
        toMajorUnits(inv.totalMinor).toFixed(2),
        toMajorUnits(inv.amountPaidMinor).toFixed(2),
        toMajorUnits(inv.balanceDueMinor).toFixed(2),
        inv.notes || ''
      ])
    );
  }

  return {
    csv: rows.join('\r\n'),
    count: result.items.length
  };
}

/**
 * Exports all matching expenses to RFC 4180 CSV string.
 */
export function generateExpensesCsv(
  db: Database.Database,
  filter?: ExpenseFilter
): { csv: string; count: number } {
  let query = 'SELECT * FROM expenses WHERE 1=1';
  const params: unknown[] = [];

  if (filter?.category) {
    query += ' AND category = ?';
    params.push(filter.category);
  }
  if (filter?.startDate) {
    query += ' AND date >= ?';
    params.push(filter.startDate);
  }
  if (filter?.endDate) {
    query += ' AND date <= ?';
    params.push(filter.endDate);
  }
  if (filter?.search && filter.search.trim().length > 0) {
    query += ' AND (description LIKE ? OR notes LIKE ?)';
    const term = `%${filter.search.trim()}%`;
    params.push(term, term);
  }

  query += ' ORDER BY date DESC, created_at DESC';

  interface ExpenseRow {
    id: string;
    category: string;
    description: string;
    amount_minor: number;
    currency: string;
    date: string;
    receipt_hash: string | null;
    receipt_name: string | null;
    notes: string | null;
  }

  const rows = db.prepare(query).all(...params) as ExpenseRow[];

  const header = [
    'Date',
    'Category',
    'Description',
    'Currency',
    'Amount',
    'Receipt Attached',
    'Receipt Filename',
    'Notes'
  ];

  const csvRows: string[] = [formatCsvRow(header)];

  for (const exp of rows) {
    csvRows.push(
      formatCsvRow([
        exp.date,
        exp.category,
        exp.description,
        exp.currency,
        toMajorUnits(exp.amount_minor).toFixed(2),
        exp.receipt_hash ? 'Yes' : 'No',
        exp.receipt_name || '',
        exp.notes || ''
      ])
    );
  }

  return {
    csv: csvRows.join('\r\n'),
    count: rows.length
  };
}

/**
 * Prompts user to save CSV file or writes to target path.
 */
export async function saveCsvFile(
  csvContent: string,
  defaultFilename: string,
  targetPath?: string
): Promise<CsvExportResult | null> {
  let filePath = targetPath;

  if (!filePath) {
    const dialogResult = await dialog.showSaveDialog({
      title: 'Export to CSV',
      defaultPath: join(app ? app.getPath('documents') : process.cwd(), defaultFilename),
      filters: [{ name: 'CSV (Comma delimited)', extensions: ['csv'] }]
    });

    if (dialogResult.canceled || !dialogResult.filePath) {
      return null;
    }
    filePath = dialogResult.filePath;
  }

  const buffer = Buffer.from(csvContent, 'utf-8');
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, buffer);

  const lines = csvContent.split('\r\n').filter(Boolean);
  const rowCount = Math.max(0, lines.length - 1); // exclude header

  return {
    filePath,
    rowCount,
    bytes: buffer.byteLength
  };
}
