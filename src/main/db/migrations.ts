// path: src/main/db/migrations.ts
export interface Migration {
  id: number;
  name: string;
  up: string;
}

export const MIGRATIONS: Migration[] = [
  {
    id: 1,
    name: '001_initial_schema',
    up: `
      -- Clients table
      CREATE TABLE IF NOT EXISTS clients (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        address TEXT,
        tax_pin TEXT,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);

      -- Invoices table (all monetary amounts in integer minor units / cents)
      CREATE TABLE IF NOT EXISTS invoices (
        id TEXT PRIMARY KEY NOT NULL,
        invoice_number TEXT NOT NULL UNIQUE,
        client_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'draft',
        issue_date TEXT NOT NULL,
        due_date TEXT NOT NULL,
        currency TEXT NOT NULL DEFAULT 'KES',
        subtotal_minor INTEGER NOT NULL DEFAULT 0,
        tax_total_minor INTEGER NOT NULL DEFAULT 0,
        discount_total_minor INTEGER NOT NULL DEFAULT 0,
        total_minor INTEGER NOT NULL DEFAULT 0,
        amount_paid_minor INTEGER NOT NULL DEFAULT 0,
        notes TEXT,
        terms TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE RESTRICT
      );

      CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(client_id);
      CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
      CREATE INDEX IF NOT EXISTS idx_invoices_issue_date ON invoices(issue_date);
      CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);

      -- Line items table
      CREATE TABLE IF NOT EXISTS invoice_items (
        id TEXT PRIMARY KEY NOT NULL,
        invoice_id TEXT NOT NULL,
        description TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        unit_price_minor INTEGER NOT NULL DEFAULT 0,
        discount_percent REAL NOT NULL DEFAULT 0,
        tax_rate_percent REAL NOT NULL DEFAULT 16,
        subtotal_minor INTEGER NOT NULL DEFAULT 0,
        discount_minor INTEGER NOT NULL DEFAULT 0,
        tax_minor INTEGER NOT NULL DEFAULT 0,
        total_minor INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);

      -- Invoice number sequences per year for gap-free sequencing (INV-YYYY-XXXX)
      CREATE TABLE IF NOT EXISTS invoice_sequences (
        year INTEGER PRIMARY KEY NOT NULL,
        last_sequence INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL
      );

      -- Business profile singleton
      CREATE TABLE IF NOT EXISTS business_profile (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        tax_pin TEXT,
        address TEXT,
        phone TEXT,
        email TEXT,
        logo_path TEXT,
        bank_details TEXT,
        mpesa_paybill TEXT,
        mpesa_account TEXT,
        mpesa_till TEXT,
        default_currency TEXT NOT NULL DEFAULT 'KES',
        default_tax_rate REAL NOT NULL DEFAULT 16,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `
  },
  {
    id: 2,
    name: '002_expenses_and_payments',
    up: `
      -- Expenses table
      CREATE TABLE IF NOT EXISTS expenses (
        id TEXT PRIMARY KEY NOT NULL,
        category TEXT NOT NULL,
        description TEXT NOT NULL,
        amount_minor INTEGER NOT NULL,
        currency TEXT NOT NULL DEFAULT 'KES',
        date TEXT NOT NULL,
        receipt_hash TEXT,
        receipt_name TEXT,
        receipt_mime TEXT,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
      CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);

      -- Payments table (partial & full payments against invoices)
      CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY NOT NULL,
        invoice_id TEXT NOT NULL,
        amount_minor INTEGER NOT NULL,
        currency TEXT NOT NULL DEFAULT 'KES',
        payment_date TEXT NOT NULL,
        method TEXT NOT NULL DEFAULT 'mpesa',
        reference TEXT,
        notes TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
      CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);
    `
  }
];
