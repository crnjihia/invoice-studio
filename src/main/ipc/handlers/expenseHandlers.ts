// path: src/main/ipc/handlers/expenseHandlers.ts
import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import { ipcRegistry } from '../registry';
import { IPC_CHANNELS } from '@shared/channels';
import {
  CreateExpenseSchema,
  DeleteExpenseSchema,
  ExpenseFilterSchema,
  GetExpenseSchema,
  SaveReceiptInputSchema,
  UpdateExpenseSchema
} from '@shared/schemas/expense';
import {
  CreateExpenseInput,
  Expense,
  ExpenseCategory,
  ExpenseFilter,
  UpdateExpenseInput
} from '@shared/types';
import { getDatabase } from '../../db/connection';
import {
  deleteReceiptFile,
  findReceiptPath,
  saveReceiptFile
} from '../../services/receiptStorageService';
import { z } from 'zod';

interface ExpenseDbRow {
  id: string;
  category: string;
  description: string;
  amount_minor: number;
  currency: string;
  date: string;
  receipt_hash: string | null;
  receipt_name: string | null;
  receipt_mime: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

function mapExpenseRow(row: ExpenseDbRow): Expense {
  return {
    id: row.id,
    category: row.category as ExpenseCategory,
    description: row.description,
    amountMinor: row.amount_minor,
    currency: row.currency as Expense['currency'],
    date: row.date,
    receiptHash: row.receipt_hash || undefined,
    receiptName: row.receipt_name || undefined,
    receiptMime: row.receipt_mime || undefined,
    notes: row.notes || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function createExpense(db: Database.Database, input: CreateExpenseInput): Expense {
  const id = randomUUID();
  const now = new Date().toISOString();
  const currency = input.currency || 'KES';

  db.prepare(`
    INSERT INTO expenses (
      id, category, description, amount_minor, currency, date,
      receipt_hash, receipt_name, receipt_mime, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    input.category,
    input.description.trim(),
    input.amountMinor,
    currency,
    input.date,
    input.receiptHash || null,
    input.receiptName || null,
    input.receiptMime || null,
    input.notes?.trim() || null,
    now,
    now
  );

  return {
    id,
    category: input.category,
    description: input.description.trim(),
    amountMinor: input.amountMinor,
    currency,
    date: input.date,
    receiptHash: input.receiptHash,
    receiptName: input.receiptName,
    receiptMime: input.receiptMime,
    notes: input.notes?.trim() || undefined,
    createdAt: now,
    updatedAt: now
  };
}

export function getExpense(db: Database.Database, id: string): Expense {
  const row = db.prepare('SELECT * FROM expenses WHERE id = ?').get(id) as
    | ExpenseDbRow
    | undefined;

  if (!row) {
    throw new Error(`Expense with ID "${id}" was not found.`);
  }

  return mapExpenseRow(row);
}

export function listExpenses(
  db: Database.Database,
  filter: ExpenseFilter
): { items: Expense[]; total: number } {
  const page = Math.max(1, filter.page ?? 1);
  const limit = Math.min(100, Math.max(1, filter.limit ?? 50));
  const offset = (page - 1) * limit;

  let query = 'SELECT * FROM expenses WHERE 1=1';
  let countQuery = 'SELECT COUNT(*) as total FROM expenses WHERE 1=1';
  const params: unknown[] = [];
  const countParams: unknown[] = [];

  if (filter.category) {
    query += ' AND category = ?';
    countQuery += ' AND category = ?';
    params.push(filter.category);
    countParams.push(filter.category);
  }

  if (filter.startDate) {
    query += ' AND date >= ?';
    countQuery += ' AND date >= ?';
    params.push(filter.startDate);
    countParams.push(filter.startDate);
  }

  if (filter.endDate) {
    query += ' AND date <= ?';
    countQuery += ' AND date <= ?';
    params.push(filter.endDate);
    countParams.push(filter.endDate);
  }

  if (filter.search && filter.search.trim().length > 0) {
    const term = `%${filter.search.trim()}%`;
    const searchClause = ' AND (description LIKE ? OR notes LIKE ?)';
    query += searchClause;
    countQuery += searchClause;
    params.push(term, term);
    countParams.push(term, term);
  }

  query += ' ORDER BY date DESC, created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const countRow = db.prepare(countQuery).get(...countParams) as { total: number };
  const rows = db.prepare(query).all(...params) as ExpenseDbRow[];

  return {
    items: rows.map(mapExpenseRow),
    total: countRow.total
  };
}

export function updateExpense(db: Database.Database, input: UpdateExpenseInput): Expense {
  const existing = getExpense(db, input.id);
  const now = new Date().toISOString();

  const updatedCategory = input.category || existing.category;
  const updatedDesc = input.description !== undefined ? input.description.trim() : existing.description;
  const updatedAmount = input.amountMinor !== undefined ? input.amountMinor : existing.amountMinor;
  const updatedCurrency = input.currency || existing.currency;
  const updatedDate = input.date || existing.date;
  const updatedReceiptHash =
    input.receiptHash !== undefined ? input.receiptHash : existing.receiptHash;
  const updatedReceiptName =
    input.receiptName !== undefined ? input.receiptName : existing.receiptName;
  const updatedReceiptMime =
    input.receiptMime !== undefined ? input.receiptMime : existing.receiptMime;
  const updatedNotes =
    input.notes !== undefined ? input.notes.trim() || null : (existing.notes || null);

  db.prepare(`
    UPDATE expenses
    SET category = ?, description = ?, amount_minor = ?, currency = ?, date = ?,
        receipt_hash = ?, receipt_name = ?, receipt_mime = ?, notes = ?, updated_at = ?
    WHERE id = ?
  `).run(
    updatedCategory,
    updatedDesc,
    updatedAmount,
    updatedCurrency,
    updatedDate,
    updatedReceiptHash || null,
    updatedReceiptName || null,
    updatedReceiptMime || null,
    updatedNotes,
    now,
    input.id
  );

  return getExpense(db, input.id);
}

export function deleteExpense(db: Database.Database, id: string): boolean {
  const existing = getExpense(db, id);

  // If receipt hash is attached, verify if other expenses share it before deleting file
  if (existing.receiptHash) {
    const otherSharing = db
      .prepare('SELECT COUNT(*) as count FROM expenses WHERE receipt_hash = ? AND id != ?')
      .get(existing.receiptHash, id) as { count: number };

    if (otherSharing.count === 0) {
      deleteReceiptFile(existing.receiptHash);
    }
  }

  const result = db.prepare('DELETE FROM expenses WHERE id = ?').run(id);
  return result.changes > 0;
}

export function registerExpenseHandlers(): void {
  ipcRegistry.register(IPC_CHANNELS.EXPENSE.CREATE, CreateExpenseSchema, async input => {
    return createExpense(getDatabase(), input);
  });

  ipcRegistry.register(IPC_CHANNELS.EXPENSE.GET, GetExpenseSchema, async input => {
    return getExpense(getDatabase(), input.id);
  });

  ipcRegistry.register(IPC_CHANNELS.EXPENSE.LIST, ExpenseFilterSchema, async input => {
    return listExpenses(getDatabase(), input);
  });

  ipcRegistry.register(IPC_CHANNELS.EXPENSE.UPDATE, UpdateExpenseSchema, async input => {
    return updateExpense(getDatabase(), input);
  });

  ipcRegistry.register(IPC_CHANNELS.EXPENSE.DELETE, DeleteExpenseSchema, async input => {
    return deleteExpense(getDatabase(), input.id);
  });

  ipcRegistry.register(IPC_CHANNELS.EXPENSE.SAVE_RECEIPT, SaveReceiptInputSchema, async input => {
    const buffer = Buffer.from(input.base64Data, 'base64');
    return saveReceiptFile(buffer, input.fileName, input.mimeType);
  });

  ipcRegistry.register(
    IPC_CHANNELS.EXPENSE.GET_RECEIPT_PATH,
    z.object({ hash: z.string().min(1) }),
    async input => {
      return findReceiptPath(input.hash);
    }
  );
}

