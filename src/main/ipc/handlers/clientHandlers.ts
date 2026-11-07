// path: src/main/ipc/handlers/clientHandlers.ts
import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import { ipcRegistry } from '../registry';
import { IPC_CHANNELS } from '@shared/channels';
import {
  ClientFilterSchema,
  CreateClientSchema,
  DeleteClientSchema,
  GetClientSchema,
  UpdateClientSchema
} from '@shared/schemas/client';
import { Client, ClientFilter, CreateClientInput, UpdateClientInput } from '@shared/types';
import { getDatabase } from '../../db/connection';

interface ClientDbRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  tax_pin: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function mapClientRow(row: ClientDbRow): Client {
  return {
    id: row.id,
    name: row.name,
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    address: row.address ?? undefined,
    taxPin: row.tax_pin ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function createClient(db: Database.Database, input: CreateClientInput): Client {
  const id = randomUUID();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO clients (id, name, email, phone, address, tax_pin, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    input.name.trim(),
    input.email?.trim() || null,
    input.phone?.trim() || null,
    input.address?.trim() || null,
    input.taxPin?.trim() || null,
    input.notes?.trim() || null,
    now,
    now
  );

  return {
    id,
    name: input.name.trim(),
    email: input.email?.trim() || undefined,
    phone: input.phone?.trim() || undefined,
    address: input.address?.trim() || undefined,
    taxPin: input.taxPin?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    createdAt: now,
    updatedAt: now
  };
}

export function getClient(db: Database.Database, id: string): Client {
  const stmt = db.prepare('SELECT * FROM clients WHERE id = ?');
  const row = stmt.get(id) as ClientDbRow | undefined;

  if (!row) {
    throw new Error(`Client with ID "${id}" was not found.`);
  }

  return mapClientRow(row);
}

export function listClients(
  db: Database.Database,
  filter: ClientFilter
): { items: Client[]; total: number } {
  const page = Math.max(1, filter.page ?? 1);
  const limit = Math.min(100, Math.max(1, filter.limit ?? 50));
  const offset = (page - 1) * limit;

  let query = 'SELECT * FROM clients';
  let countQuery = 'SELECT COUNT(*) as total FROM clients';
  const params: unknown[] = [];
  const countParams: unknown[] = [];

  if (filter.search && filter.search.trim().length > 0) {
    const term = `%${filter.search.trim()}%`;
    const searchClause = ' WHERE name LIKE ? OR email LIKE ? OR phone LIKE ? OR tax_pin LIKE ?';
    query += searchClause;
    countQuery += searchClause;
    params.push(term, term, term, term);
    countParams.push(term, term, term, term);
  }

  query += ' ORDER BY name ASC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const countRow = db.prepare(countQuery).get(...countParams) as { total: number };
  const rows = db.prepare(query).all(...params) as ClientDbRow[];

  return {
    items: rows.map(mapClientRow),
    total: countRow.total
  };
}

export function updateClient(db: Database.Database, input: UpdateClientInput): Client {
  const existing = getClient(db, input.id);
  const now = new Date().toISOString();

  const updatedName = input.name !== undefined ? input.name.trim() : existing.name;
  const updatedEmail = input.email !== undefined ? input.email.trim() || null : (existing.email ?? null);
  const updatedPhone = input.phone !== undefined ? input.phone.trim() || null : (existing.phone ?? null);
  const updatedAddress =
    input.address !== undefined ? input.address.trim() || null : (existing.address ?? null);
  const updatedTaxPin =
    input.taxPin !== undefined ? input.taxPin.trim() || null : (existing.taxPin ?? null);
  const updatedNotes = input.notes !== undefined ? input.notes.trim() || null : (existing.notes ?? null);

  const stmt = db.prepare(`
    UPDATE clients
    SET name = ?, email = ?, phone = ?, address = ?, tax_pin = ?, notes = ?, updated_at = ?
    WHERE id = ?
  `);

  stmt.run(
    updatedName,
    updatedEmail,
    updatedPhone,
    updatedAddress,
    updatedTaxPin,
    updatedNotes,
    now,
    input.id
  );

  return getClient(db, input.id);
}

export function deleteClient(db: Database.Database, id: string): boolean {
  getClient(db, id); // Verify existence

  // Verify no attached invoices
  const invoiceCheck = db
    .prepare('SELECT COUNT(*) as count FROM invoices WHERE client_id = ?')
    .get(id) as { count: number };

  if (invoiceCheck.count > 0) {
    throw new Error(
      `Cannot delete client with ${invoiceCheck.count} associated invoice(s). Please delete or reassign them first.`
    );
  }

  const result = db.prepare('DELETE FROM clients WHERE id = ?').run(id);
  return result.changes > 0;
}

export function registerClientHandlers(): void {
  ipcRegistry.register(IPC_CHANNELS.CLIENT.CREATE, CreateClientSchema, async input => {
    return createClient(getDatabase(), input);
  });

  ipcRegistry.register(IPC_CHANNELS.CLIENT.GET, GetClientSchema, async input => {
    return getClient(getDatabase(), input.id);
  });

  ipcRegistry.register(IPC_CHANNELS.CLIENT.LIST, ClientFilterSchema, async input => {
    return listClients(getDatabase(), input);
  });

  ipcRegistry.register(IPC_CHANNELS.CLIENT.UPDATE, UpdateClientSchema, async input => {
    return updateClient(getDatabase(), input);
  });

  ipcRegistry.register(IPC_CHANNELS.CLIENT.DELETE, DeleteClientSchema, async input => {
    return deleteClient(getDatabase(), input.id);
  });
}
