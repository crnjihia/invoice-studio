// path: src/tests/unit/client-handlers.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '../../main/db/migrator';
import {
  createClient,
  getClient,
  listClients,
  updateClient,
  deleteClient
} from '../../main/ipc/handlers/clientHandlers';

describe('Client IPC Handlers & Repository Unit Tests', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    runMigrations(db);
  });

  afterEach(() => {
    if (db && db.open) {
      db.close();
    }
  });

  it('creates a client with valid Kenyan contact details and tax PIN', () => {
    const client = createClient(db, {
      name: 'Acme Technologies Ltd',
      email: 'finance@acmetech.co.ke',
      phone: '+254712345678',
      address: 'Westlands Commercial Centre, Nairobi',
      taxPin: 'P051234567Z',
      notes: 'Net 30 payment terms'
    });

    expect(client.id).toBeDefined();
    expect(client.name).toBe('Acme Technologies Ltd');
    expect(client.email).toBe('finance@acmetech.co.ke');
    expect(client.phone).toBe('+254712345678');
    expect(client.taxPin).toBe('P051234567Z');
    expect(client.createdAt).toBeDefined();
    expect(client.updatedAt).toBeDefined();
  });

  it('retrieves an existing client by id and throws for unknown ids', () => {
    const created = createClient(db, {
      name: 'Safaricom Telecommunications',
      phone: '+254722000000'
    });

    const retrieved = getClient(db, created.id);
    expect(retrieved.id).toBe(created.id);
    expect(retrieved.name).toBe('Safaricom Telecommunications');

    expect(() => getClient(db, 'non-existent-uuid')).toThrow('was not found');
  });

  it('lists and filters clients by search term across multiple fields', () => {
    createClient(db, {
      name: 'Nairobi Java House',
      email: 'accounts@javahouse.africa',
      phone: '+254733111222'
    });

    createClient(db, {
      name: 'Artcaffe Coffee & Bakery',
      email: 'billing@artcaffe.co.ke',
      phone: '+254799333444',
      taxPin: 'A009876543X'
    });

    createClient(db, {
      name: 'M-Kopa Solar',
      email: 'ops@m-kopa.com',
      phone: '+254700555666'
    });

    // Search by name
    const nameSearch = listClients(db, { search: 'Java' });
    expect(nameSearch.total).toBe(1);
    expect(nameSearch.items[0].name).toBe('Nairobi Java House');

    // Search by PIN
    const pinSearch = listClients(db, { search: 'A009876543X' });
    expect(pinSearch.total).toBe(1);
    expect(pinSearch.items[0].name).toBe('Artcaffe Coffee & Bakery');

    // Search by phone
    const phoneSearch = listClients(db, { search: '+254700' });
    expect(phoneSearch.total).toBe(1);
    expect(phoneSearch.items[0].name).toBe('M-Kopa Solar');

    // Pagination
    const pageResult = listClients(db, { page: 1, limit: 2 });
    expect(pageResult.items.length).toBe(2);
    expect(pageResult.total).toBe(3);
  });

  it('updates an existing client preserving unmodified fields', () => {
    const client = createClient(db, {
      name: 'Twiga Foods',
      email: 'finance@twiga.com',
      phone: '+254720999888'
    });

    const updated = updateClient(db, {
      id: client.id,
      name: 'Twiga Foods Limited',
      notes: 'Updated logistics vendor agreement'
    });

    expect(updated.name).toBe('Twiga Foods Limited');
    expect(updated.notes).toBe('Updated logistics vendor agreement');
    expect(updated.email).toBe('finance@twiga.com');
    expect(updated.phone).toBe('+254720999888');
  });

  it('deletes an unused client, but rejects deletion when active invoices exist', () => {
    const client = createClient(db, {
      name: 'Delete Target Client',
      phone: '+254711223344'
    });

    // Delete unused client succeeds
    const deleted = deleteClient(db, client.id);
    expect(deleted).toBe(true);
    expect(() => getClient(db, client.id)).toThrow('was not found');

    // Create client with attached invoice
    const clientWithInvoice = createClient(db, {
      name: 'Client with Invoices',
      phone: '+254788990011'
    });

    db.prepare(`
      INSERT INTO invoices (
        id, invoice_number, client_id, status, issue_date, due_date, currency,
        subtotal_minor, tax_total_minor, discount_total_minor, total_minor,
        amount_paid_minor, created_at, updated_at
      ) VALUES ('inv-123', 'INV-2026-0001', ?, 'draft', '2026-01-01', '2026-01-31', 'KES', 10000, 1600, 0, 11600, 0, '2026-01-01', '2026-01-01')
    `).run(clientWithInvoice.id);

    expect(() => deleteClient(db, clientWithInvoice.id)).toThrow(
      'Cannot delete client with 1 associated invoice(s)'
    );
  });
});
