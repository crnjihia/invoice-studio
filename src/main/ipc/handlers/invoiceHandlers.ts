// path: src/main/ipc/handlers/invoiceHandlers.ts
import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import { ipcRegistry } from '../registry';
import { IPC_CHANNELS } from '@shared/channels';
import {
  CreateInvoiceSchema,
  DeleteInvoiceSchema,
  DuplicateInvoiceSchema,
  GetInvoiceSchema,
  InvoiceFilterSchema,
  UpdateInvoiceSchema
} from '@shared/schemas/invoice';
import {
  CreateInvoiceInput,
  CurrencyCode,
  Invoice,
  InvoiceFilter,
  InvoiceLineItemCalculated,
  InvoiceStatus,
  UpdateInvoiceInput
} from '@shared/types';
import { calculateInvoiceTotals, calculateLineItemTotals } from '@shared/utils/money';
import { getNextInvoiceNumber } from '../../services/invoiceNumberService';
import { getDatabase } from '../../db/connection';
import { getClient } from './clientHandlers';

interface InvoiceDbRow {
  id: string;
  invoice_number: string;
  client_id: string;
  client_name?: string;
  status: string;
  issue_date: string;
  due_date: string;
  currency: string;
  subtotal_minor: number;
  tax_total_minor: number;
  discount_total_minor: number;
  total_minor: number;
  amount_paid_minor: number;
  notes: string | null;
  terms: string | null;
  created_at: string;
  updated_at: string;
}

interface LineItemDbRow {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price_minor: number;
  discount_percent: number;
  tax_rate_percent: number;
  subtotal_minor: number;
  discount_minor: number;
  tax_minor: number;
  total_minor: number;
  created_at: string;
}

function mapLineItemRow(row: LineItemDbRow): InvoiceLineItemCalculated {
  return {
    id: row.id,
    invoiceId: row.invoice_id,
    description: row.description,
    quantity: row.quantity,
    unitPriceMinor: row.unit_price_minor,
    discountPercent: row.discount_percent,
    taxRatePercent: row.tax_rate_percent,
    subtotalMinor: row.subtotal_minor,
    discountMinor: row.discount_minor,
    taxMinor: row.tax_minor,
    totalMinor: row.total_minor
  };
}

function mapInvoiceRow(row: InvoiceDbRow, lineItems: InvoiceLineItemCalculated[]): Invoice {
  const totalMinor = row.total_minor;
  const amountPaidMinor = row.amount_paid_minor;
  const balanceDueMinor = Math.max(0, totalMinor - amountPaidMinor);

  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    clientId: row.client_id,
    clientName: row.client_name ?? undefined,
    status: row.status as InvoiceStatus,
    issueDate: row.issue_date,
    dueDate: row.due_date,
    currency: row.currency as CurrencyCode,
    subtotalMinor: row.subtotal_minor,
    taxTotalMinor: row.tax_total_minor,
    discountTotalMinor: row.discount_total_minor,
    totalMinor,
    amountPaidMinor,
    balanceDueMinor,
    notes: row.notes ?? undefined,
    terms: row.terms ?? undefined,
    lineItems,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function createInvoice(db: Database.Database, input: CreateInvoiceInput): Invoice {
  const currency: CurrencyCode = input.currency ?? 'KES';

  const createTx = db.transaction(() => {
    // 1. Verify client exists
    const client = getClient(db, input.clientId);

    // 2. Generate unique gap-free invoice number
    const invoiceNumber = getNextInvoiceNumber(db);
    const invoiceId = randomUUID();
    const now = new Date().toISOString();

    // 3. Compute totals
    const totals = calculateInvoiceTotals(input.lineItems, 0);

    // 4. Insert invoice header
    db.prepare(`
      INSERT INTO invoices (
        id, invoice_number, client_id, status, issue_date, due_date, currency,
        subtotal_minor, tax_total_minor, discount_total_minor, total_minor,
        amount_paid_minor, notes, terms, created_at, updated_at
      ) VALUES (?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)
    `).run(
      invoiceId,
      invoiceNumber,
      client.id,
      input.issueDate,
      input.dueDate,
      currency,
      totals.subtotalMinor,
      totals.taxTotalMinor,
      totals.discountTotalMinor,
      totals.totalMinor,
      input.notes?.trim() || null,
      input.terms?.trim() || null,
      now,
      now
    );

    // 5. Insert line items
    const lineItemStmt = db.prepare(`
      INSERT INTO invoice_items (
        id, invoice_id, description, quantity, unit_price_minor,
        discount_percent, tax_rate_percent, subtotal_minor,
        discount_minor, tax_minor, total_minor, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const calculatedLineItems: InvoiceLineItemCalculated[] = [];

    for (const item of input.lineItems) {
      const itemId = randomUUID();
      const lineTotals = calculateLineItemTotals(
        item.quantity,
        item.unitPriceMinor,
        item.discountPercent ?? 0,
        item.taxRatePercent ?? 16
      );

      lineItemStmt.run(
        itemId,
        invoiceId,
        item.description.trim(),
        item.quantity,
        item.unitPriceMinor,
        item.discountPercent ?? 0,
        item.taxRatePercent ?? 16,
        lineTotals.subtotalMinor,
        lineTotals.discountMinor,
        lineTotals.taxMinor,
        lineTotals.totalMinor,
        now
      );

      calculatedLineItems.push({
        id: itemId,
        invoiceId,
        description: item.description.trim(),
        quantity: item.quantity,
        unitPriceMinor: item.unitPriceMinor,
        discountPercent: item.discountPercent ?? 0,
        taxRatePercent: item.taxRatePercent ?? 16,
        subtotalMinor: lineTotals.subtotalMinor,
        discountMinor: lineTotals.discountMinor,
        taxMinor: lineTotals.taxMinor,
        totalMinor: lineTotals.totalMinor
      });
    }

    return {
      id: invoiceId,
      invoiceNumber,
      clientId: client.id,
      clientName: client.name,
      status: 'draft' as InvoiceStatus,
      issueDate: input.issueDate,
      dueDate: input.dueDate,
      currency,
      subtotalMinor: totals.subtotalMinor,
      taxTotalMinor: totals.taxTotalMinor,
      discountTotalMinor: totals.discountTotalMinor,
      totalMinor: totals.totalMinor,
      amountPaidMinor: 0,
      balanceDueMinor: totals.totalMinor,
      notes: input.notes?.trim() || undefined,
      terms: input.terms?.trim() || undefined,
      lineItems: calculatedLineItems,
      createdAt: now,
      updatedAt: now
    };
  });

  return createTx();
}

export function getInvoice(db: Database.Database, id: string): Invoice {
  const row = db
    .prepare(`
      SELECT invoices.*, clients.name as client_name
      FROM invoices
      LEFT JOIN clients ON invoices.client_id = clients.id
      WHERE invoices.id = ?
    `)
    .get(id) as InvoiceDbRow | undefined;

  if (!row) {
    throw new Error(`Invoice with ID "${id}" was not found.`);
  }

  const items = db
    .prepare('SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY rowid ASC')
    .all(id) as LineItemDbRow[];

  return mapInvoiceRow(row, items.map(mapLineItemRow));
}

export function listInvoices(
  db: Database.Database,
  filter: InvoiceFilter
): { items: Invoice[]; total: number } {
  const page = Math.max(1, filter.page ?? 1);
  const limit = Math.min(100, Math.max(1, filter.limit ?? 50));
  const offset = (page - 1) * limit;

  let query = `
    SELECT invoices.*, clients.name as client_name
    FROM invoices
    LEFT JOIN clients ON invoices.client_id = clients.id
  `;
  let countQuery = `
    SELECT COUNT(*) as total
    FROM invoices
    LEFT JOIN clients ON invoices.client_id = clients.id
  `;

  const conditions: string[] = [];
  const params: unknown[] = [];
  const countParams: unknown[] = [];

  if (filter.clientId) {
    conditions.push('invoices.client_id = ?');
    params.push(filter.clientId);
    countParams.push(filter.clientId);
  }

  if (filter.status) {
    conditions.push('invoices.status = ?');
    params.push(filter.status);
    countParams.push(filter.status);
  }

  if (filter.search && filter.search.trim().length > 0) {
    const term = `%${filter.search.trim()}%`;
    conditions.push('(invoices.invoice_number LIKE ? OR clients.name LIKE ?)');
    params.push(term, term);
    countParams.push(term, term);
  }

  if (conditions.length > 0) {
    const where = ' WHERE ' + conditions.join(' AND ');
    query += where;
    countQuery += where;
  }

  query += ' ORDER BY invoices.issue_date DESC, invoices.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const countRow = db.prepare(countQuery).get(...countParams) as { total: number };
  const rows = db.prepare(query).all(...params) as InvoiceDbRow[];

  const invoiceItemsStmt = db.prepare(
    'SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY rowid ASC'
  );

  const items = rows.map(row => {
    const lineItemRows = invoiceItemsStmt.all(row.id) as LineItemDbRow[];
    return mapInvoiceRow(row, lineItemRows.map(mapLineItemRow));
  });

  return {
    items,
    total: countRow.total
  };
}

export function updateInvoice(db: Database.Database, input: UpdateInvoiceInput): Invoice {
  const updateTx = db.transaction(() => {
    const existing = getInvoice(db, input.id);
    const now = new Date().toISOString();

    let subtotalMinor = existing.subtotalMinor;
    let taxTotalMinor = existing.taxTotalMinor;
    let discountTotalMinor = existing.discountTotalMinor;
    let totalMinor = existing.totalMinor;

    if (input.lineItems && input.lineItems.length > 0) {
      // Recalculate totals
      const totals = calculateInvoiceTotals(input.lineItems, existing.amountPaidMinor);
      subtotalMinor = totals.subtotalMinor;
      taxTotalMinor = totals.taxTotalMinor;
      discountTotalMinor = totals.discountTotalMinor;
      totalMinor = totals.totalMinor;

      // Replace line items
      db.prepare('DELETE FROM invoice_items WHERE invoice_id = ?').run(input.id);

      const lineItemStmt = db.prepare(`
        INSERT INTO invoice_items (
          id, invoice_id, description, quantity, unit_price_minor,
          discount_percent, tax_rate_percent, subtotal_minor,
          discount_minor, tax_minor, total_minor, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const item of input.lineItems) {
        const itemId = item.id || randomUUID();
        const lineTotals = calculateLineItemTotals(
          item.quantity,
          item.unitPriceMinor,
          item.discountPercent ?? 0,
          item.taxRatePercent ?? 16
        );

        lineItemStmt.run(
          itemId,
          input.id,
          item.description.trim(),
          item.quantity,
          item.unitPriceMinor,
          item.discountPercent ?? 0,
          item.taxRatePercent ?? 16,
          lineTotals.subtotalMinor,
          lineTotals.discountMinor,
          lineTotals.taxMinor,
          lineTotals.totalMinor,
          now
        );
      }
    }

    const updatedClientId = input.clientId ?? existing.clientId;
    if (input.clientId) {
      getClient(db, input.clientId); // verify client existence
    }

    const updatedStatus = input.status ?? existing.status;
    const updatedIssueDate = input.issueDate ?? existing.issueDate;
    const updatedDueDate = input.dueDate ?? existing.dueDate;
    const updatedCurrency = input.currency ?? existing.currency;
    const updatedNotes =
      input.notes !== undefined ? input.notes.trim() || null : (existing.notes ?? null);
    const updatedTerms =
      input.terms !== undefined ? input.terms.trim() || null : (existing.terms ?? null);

    db.prepare(`
      UPDATE invoices
      SET client_id = ?, status = ?, issue_date = ?, due_date = ?, currency = ?,
          subtotal_minor = ?, tax_total_minor = ?, discount_total_minor = ?,
          total_minor = ?, notes = ?, terms = ?, updated_at = ?
      WHERE id = ?
    `).run(
      updatedClientId,
      updatedStatus,
      updatedIssueDate,
      updatedDueDate,
      updatedCurrency,
      subtotalMinor,
      taxTotalMinor,
      discountTotalMinor,
      totalMinor,
      updatedNotes,
      updatedTerms,
      now,
      input.id
    );

    return getInvoice(db, input.id);
  });

  return updateTx();
}

export function deleteInvoice(db: Database.Database, id: string): boolean {
  const deleteTx = db.transaction(() => {
    getInvoice(db, id); // Verify existence
    db.prepare('DELETE FROM invoice_items WHERE invoice_id = ?').run(id);
    const result = db.prepare('DELETE FROM invoices WHERE id = ?').run(id);
    return result.changes > 0;
  });

  return deleteTx();
}

export function duplicateInvoice(db: Database.Database, id: string): Invoice {
  const duplicateTx = db.transaction(() => {
    const original = getInvoice(db, id);
    const now = new Date();
    const issueDate = now.toISOString().split('T')[0];

    const due = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const dueDate = due.toISOString().split('T')[0];

    return createInvoice(db, {
      clientId: original.clientId,
      issueDate,
      dueDate,
      currency: original.currency,
      lineItems: original.lineItems.map(item => ({
        description: item.description,
        quantity: item.quantity,
        unitPriceMinor: item.unitPriceMinor,
        discountPercent: item.discountPercent,
        taxRatePercent: item.taxRatePercent
      })),
      notes: original.notes,
      terms: original.terms
    });
  });

  return duplicateTx();
}

export function registerInvoiceHandlers(): void {
  ipcRegistry.register(IPC_CHANNELS.INVOICE.CREATE, CreateInvoiceSchema, async input => {
    return createInvoice(getDatabase(), input);
  });

  ipcRegistry.register(IPC_CHANNELS.INVOICE.GET, GetInvoiceSchema, async input => {
    return getInvoice(getDatabase(), input.id);
  });

  ipcRegistry.register(IPC_CHANNELS.INVOICE.LIST, InvoiceFilterSchema, async input => {
    return listInvoices(getDatabase(), input);
  });

  ipcRegistry.register(IPC_CHANNELS.INVOICE.UPDATE, UpdateInvoiceSchema, async input => {
    return updateInvoice(getDatabase(), input);
  });

  ipcRegistry.register(IPC_CHANNELS.INVOICE.DELETE, DeleteInvoiceSchema, async input => {
    return deleteInvoice(getDatabase(), input.id);
  });

  ipcRegistry.register(IPC_CHANNELS.INVOICE.DUPLICATE, DuplicateInvoiceSchema, async input => {
    return duplicateInvoice(getDatabase(), input.id);
  });
}
