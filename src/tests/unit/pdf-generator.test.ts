// path: src/tests/unit/pdf-generator.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { existsSync, rmSync } from 'fs';
import { runMigrations } from '../../main/db/migrator';
import { createClient } from '../../main/ipc/handlers/clientHandlers';
import { createInvoice } from '../../main/ipc/handlers/invoiceHandlers';
import { getBusinessProfile, prepareEmailInvoice } from '../../main/pdf/pdfService';

const { testDir } = vi.hoisted(() => ({
  testDir: 'temp-test-pdf-generator'
}));

// Mock electron modules
vi.mock('electron', () => {
  let clipboardContent = '';
  return {
    app: {
      getPath: vi.fn().mockImplementation((name: string) => {
        if (name === 'userData') return 'temp-test-pdf-generator/userData';
        if (name === 'documents') return 'temp-test-pdf-generator/documents';
        return 'temp-test-pdf-generator';
      })
    },
    clipboard: {
      writeText: vi.fn().mockImplementation((text: string) => {
        clipboardContent = text;
      }),
      readText: vi.fn().mockImplementation(() => clipboardContent)
    },
    dialog: {
      showSaveDialog: vi.fn().mockResolvedValue({ canceled: false, filePath: 'temp-test-pdf-generator/invoice.pdf' })
    },
    shell: {
      openPath: vi.fn().mockResolvedValue(''),
      showItemInFolder: vi.fn(),
      openExternal: vi.fn().mockResolvedValue(true)
    },
    BrowserWindow: vi.fn().mockImplementation(() => ({
      webContents: {
        once: vi.fn().mockImplementation((event: string, cb: () => void) => {
          if (event === 'did-finish-load') cb();
        }),
        printToPDF: vi.fn().mockResolvedValue(Buffer.from('%PDF-1.4 mock pdf binary stream'))
      },
      loadURL: vi.fn().mockResolvedValue(undefined),
      destroy: vi.fn(),
      isDestroyed: vi.fn().mockReturnValue(false)
    }))
  };
});

describe('PDF Generation & Email Service Unit Tests', () => {
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
    if (existsSync(testDir)) {
      try {
        rmSync(testDir, { recursive: true, force: true });
      } catch {
        // Ignored: cleanup error
      }
    }
  });

  it('fetches default Kenyan business profile when no record exists in database', () => {
    const profile = getBusinessProfile(db);
    expect(profile.name).toBe('Chris Developer Studio');
    expect(profile.taxPin).toBe('P051234567Z');
    expect(profile.mpesaPaybill).toBe('522522');
    expect(profile.defaultCurrency).toBe('KES');
    expect(profile.defaultTaxRate).toBe(16);
  });

  it('retrieves custom business profile when populated in database', () => {
    db.prepare(`
      INSERT INTO business_profile (
        id, name, tax_pin, address, phone, email, mpesa_paybill, mpesa_account, default_currency, default_tax_rate, created_at, updated_at
      ) VALUES ('profile-1', 'Apex Cloud Solutions Nairobi', 'P059998881Z', 'Upper Hill, Nairobi', '+254711889900', 'finance@apexcloud.ke', '888222', 'APEX-INV', 'KES', 16, '2026-01-01', '2026-01-01')
    `).run();

    const profile = getBusinessProfile(db);
    expect(profile.name).toBe('Apex Cloud Solutions Nairobi');
    expect(profile.taxPin).toBe('P059998881Z');
    expect(profile.mpesaPaybill).toBe('888222');
    expect(profile.mpesaAccount).toBe('APEX-INV');
  });

  it('prepares email invoice with honest mailto: parameters and clipboard guidance', async () => {
    const client = createClient(db, {
      name: 'Kilimani Media Ltd',
      email: 'accounts@kilimanimedia.co.ke',
      phone: '+254712001122'
    });

    const invoice = createInvoice(db, {
      clientId: client.id,
      issueDate: '2026-03-01',
      dueDate: '2026-03-31',
      currency: 'KES',
      lineItems: [
        {
          description: 'Technical Advisory & Audit',
          quantity: 1,
          unitPriceMinor: 2500000,
          discountPercent: 0,
          taxRatePercent: 16
        }
      ]
    });

    const emailResult = await prepareEmailInvoice(db, {
      invoiceId: invoice.id,
      templateId: 'modern'
    });

    expect(emailResult.mailtoUrl).toContain('mailto:accounts@kilimanimedia.co.ke');
    expect(emailResult.mailtoUrl).toContain(encodeURIComponent(`Invoice ${invoice.invoiceNumber}`));
    expect(emailResult.pdfPath).toContain(invoice.invoiceNumber);
    expect(emailResult.message).toContain('Standard desktop mail clients do not allow automatic file attachment');
  });
});
