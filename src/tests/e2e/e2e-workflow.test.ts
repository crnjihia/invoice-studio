// path: src/tests/e2e/e2e-workflow.test.ts
import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

test.describe('Invoice Studio Electron E2E Integration Suite', () => {
  let app: ElectronApplication;
  let page: Page;
  const testDir = join(process.cwd(), 'temp-e2e-run');

  test.beforeAll(async () => {
    // Launch Electron application with isolated test environment
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }

    // Ensure ELECTRON_RUN_AS_NODE is unset so Electron launches as a GUI app, not Node CLI
    const cleanEnv = {
      ...process.env,
      NODE_ENV: 'test',
      INVOICE_STUDIO_TEST_DIR: testDir
    };
    delete cleanEnv.ELECTRON_RUN_AS_NODE;

    app = await electron.launch({
      args: ['.'],
      env: cleanEnv
    });

    page = await app.firstWindow();
    await page.waitForLoadState('domcontentloaded');
  });

  test.afterAll(async () => {
    if (app) {
      await app.close();
    }
    if (existsSync(testDir)) {
      try {
        rmSync(testDir, { recursive: true, force: true });
      } catch {
        // Ignored
      }
    }
  });

  test('executes end-to-end lifecycle: create-client -> create-invoice -> export PDF -> backup -> restore', async () => {
    // 1. Verify window title and DOM presence
    const title = await page.title();
    expect(title).toBe('Invoice Studio');

    // 2. Step 1: Create Client via ContextBridge IPC
    const client = await page.evaluate(async () => {
      return window.api.clients.create({
        name: 'Nairobi Tech Ventures Ltd',
        email: 'billing@nairobitech.co.ke',
        phone: '+254712345678',
        taxPin: 'P051234567A',
        address: 'Delta Corner Tower, Westlands, Nairobi'
      });
    });

    expect(client).toHaveProperty('id');
    expect(client.name).toBe('Nairobi Tech Ventures Ltd');
    expect(client.taxPin).toBe('P051234567A');

    // 3. Step 2: Create Invoice for the Client with 16% VAT line items
    const invoice = await page.evaluate(async (clientId: string) => {
      return window.api.invoices.create({
        clientId,
        issueDate: '2026-03-01',
        dueDate: '2026-03-31',
        currency: 'KES',
        lineItems: [
          {
            description: 'Cloud Infrastructure & High-Availability Database Migration',
            quantity: 1,
            unitPriceMinor: 10000000, // 100,000 KES
            taxRatePercent: 16,
            discountPercent: 0
          }
        ],
        notes: 'Payable via Safaricom Paybill or Bank Transfer within 30 days.'
      });
    }, client.id);

    expect(invoice).toHaveProperty('id');
    expect(invoice.invoiceNumber).toMatch(/^INV-\d{4}-\d{4}$/);
    expect(invoice.subtotalMinor).toBe(10000000);
    expect(invoice.taxTotalMinor).toBe(1600000); // 16% VAT = 16,000 KES
    expect(invoice.totalMinor).toBe(11600000); // Total = 116,000 KES
    expect(invoice.balanceDueMinor).toBe(11600000);

    // 4. Step 3: Export PDF via Headless Print-to-PDF Window
    const exportPath = join(testDir, 'e2e-exported-invoice.pdf');
    const pdfExport = await page.evaluate(
      async ({ invoiceId, targetPath }) => {
        return window.api.pdf.export({
          invoiceId,
          templateId: 'modern',
          primaryColor: '#059669',
          accentColor: '#10b981',
          targetPath
        });
      },
      { invoiceId: invoice.id, targetPath: exportPath }
    );

    expect(pdfExport).not.toBeNull();
    if (pdfExport) {
      expect(pdfExport.bytes).toBeGreaterThan(1000);
      expect(existsSync(pdfExport.filePath)).toBe(true);
    }

    // 5. Step 4: Create Online SQLite Backup with PRAGMA verification
    const backupInfo = await page.evaluate(async () => {
      return window.api.backups.trigger('manual');
    });

    expect(backupInfo).toHaveProperty('fullPath');
    expect(backupInfo.isVerified).toBe(true);
    expect(existsSync(backupInfo.fullPath)).toBe(true);

    // 6. Step 5: Simulate Data Loss (delete the invoice)
    const deleteSuccess = await page.evaluate(async (invoiceId: string) => {
      return window.api.invoices.delete(invoiceId);
    }, invoice.id);

    expect(deleteSuccess).toBe(true);

    // Verify invoice is gone from database
    const invoicesAfterDelete = await page.evaluate(async () => {
      return window.api.invoices.list({});
    });
    const foundInvoice = invoicesAfterDelete.items.find(inv => inv.id === invoice.id);
    expect(foundInvoice).toBeUndefined();

    // 7. Step 6: Restore from Verified Online Backup
    const restoreResult = await page.evaluate(async (backupPath: string) => {
      return window.api.backups.restore(backupPath);
    }, backupInfo.fullPath);

    expect(restoreResult.success).toBe(true);

    // Verify invoice has been restored completely with line items intact
    const restoredInvoice = await page.evaluate(async (invoiceId: string) => {
      return window.api.invoices.get(invoiceId);
    }, invoice.id);

    expect(restoredInvoice.id).toBe(invoice.id);
    expect(restoredInvoice.invoiceNumber).toBe(invoice.invoiceNumber);
    expect(restoredInvoice.totalMinor).toBe(11600000);
    expect(restoredInvoice.lineItems.length).toBe(1);
    expect(restoredInvoice.lineItems[0].description).toBe(
      'Cloud Infrastructure & High-Availability Database Migration'
    );
  });
});
