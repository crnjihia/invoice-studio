// path: src/main/services/paymentService.ts
import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import { Payment, RecordPaymentInput } from '@shared/types';
import { getInvoice } from '../ipc/handlers/invoiceHandlers';

interface PaymentDbRow {
  id: string;
  invoice_id: string;
  amount_minor: number;
  currency: string;
  payment_date: string;
  method: string;
  reference: string | null;
  notes: string | null;
  created_at: string;
}

function mapPaymentRow(row: PaymentDbRow): Payment {
  return {
    id: row.id,
    invoiceId: row.invoice_id,
    amountMinor: row.amount_minor,
    currency: row.currency as Payment['currency'],
    paymentDate: row.payment_date,
    method: row.method as Payment['method'],
    reference: row.reference || undefined,
    notes: row.notes || undefined,
    createdAt: row.created_at
  };
}

/**
 * Records a payment against an invoice and updates its amount paid and status transactionally.
 */
export function recordPayment(db: Database.Database, input: RecordPaymentInput): Payment {
  const recordTx = db.transaction(() => {
    // 1. Verify invoice exists
    const invoice = getInvoice(db, input.invoiceId);
    const id = randomUUID();
    const now = new Date().toISOString();
    const currency = input.currency || invoice.currency;
    const method = input.method ?? 'mpesa';

    // 2. Insert payment record
    db.prepare(`
      INSERT INTO payments (
        id, invoice_id, amount_minor, currency, payment_date, method, reference, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.invoiceId,
      input.amountMinor,
      currency,
      input.paymentDate,
      method,
      input.reference?.trim() || null,
      input.notes?.trim() || null,
      now
    );

    // 3. Compute aggregate paid amount
    const paidSumRow = db
      .prepare('SELECT COALESCE(SUM(amount_minor), 0) as total_paid FROM payments WHERE invoice_id = ?')
      .get(input.invoiceId) as { total_paid: number };

    const totalPaidMinor = paidSumRow.total_paid;

    // 4. Determine new invoice status
    let newStatus = invoice.status;
    if (totalPaidMinor >= invoice.totalMinor) {
      newStatus = 'paid';
    } else if (totalPaidMinor > 0) {
      newStatus = 'partially_paid';
    } else {
      newStatus = invoice.status === 'paid' || invoice.status === 'partially_paid' ? 'sent' : invoice.status;
    }

    // 5. Update invoice
    db.prepare(`
      UPDATE invoices
      SET amount_paid_minor = ?, status = ?, updated_at = ?
      WHERE id = ?
    `).run(totalPaidMinor, newStatus, now, input.invoiceId);

    return {
      id,
      invoiceId: input.invoiceId,
      amountMinor: input.amountMinor,
      currency,
      paymentDate: input.paymentDate,
      method,
      reference: input.reference?.trim() || undefined,
      notes: input.notes?.trim() || undefined,
      createdAt: now
    };
  });

  return recordTx();
}

/**
 * Lists all payments recorded for an invoice ordered by date.
 */
export function listPaymentsByInvoice(db: Database.Database, invoiceId: string): Payment[] {
  const rows = db
    .prepare('SELECT * FROM payments WHERE invoice_id = ? ORDER BY payment_date DESC, created_at DESC')
    .all(invoiceId) as PaymentDbRow[];

  return rows.map(mapPaymentRow);
}

/**
 * Deletes a payment record and readjusts the associated invoice status and balance.
 */
export function deletePayment(db: Database.Database, paymentId: string): boolean {
  const deleteTx = db.transaction(() => {
    const payment = db
      .prepare('SELECT * FROM payments WHERE id = ?')
      .get(paymentId) as PaymentDbRow | undefined;

    if (!payment) {
      throw new Error(`Payment with ID "${paymentId}" was not found.`);
    }

    const invoiceId = payment.invoice_id;
    const now = new Date().toISOString();

    // Delete payment row
    db.prepare('DELETE FROM payments WHERE id = ?').run(paymentId);

    // Recompute total paid
    const paidSumRow = db
      .prepare('SELECT COALESCE(SUM(amount_minor), 0) as total_paid FROM payments WHERE invoice_id = ?')
      .get(invoiceId) as { total_paid: number };

    const totalPaidMinor = paidSumRow.total_paid;
    const invoice = getInvoice(db, invoiceId);

    let newStatus = invoice.status;
    if (totalPaidMinor >= invoice.totalMinor) {
      newStatus = 'paid';
    } else if (totalPaidMinor > 0) {
      newStatus = 'partially_paid';
    } else {
      newStatus = 'sent';
    }

    db.prepare(`
      UPDATE invoices
      SET amount_paid_minor = ?, status = ?, updated_at = ?
      WHERE id = ?
    `).run(totalPaidMinor, newStatus, now, invoiceId);

    return true;
  });

  return deleteTx();
}
