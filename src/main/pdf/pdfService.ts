// path: src/main/pdf/pdfService.ts
import { app, clipboard, dialog, shell } from 'electron';
import Database from 'better-sqlite3';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import {
  BusinessProfile,
  EmailInvoiceOptions,
  ExportPdfOptions,
  PdfExportResult,
  PdfRenderOptions,
  PrepareEmailResult
} from '@shared/types';
import { formatMoney } from '@shared/utils/money';
import { getClient } from '../ipc/handlers/clientHandlers';
import { getInvoice } from '../ipc/handlers/invoiceHandlers';
import { handleExternalUrl } from '../windows/mainWindow';
import { renderHtmlToPdf } from './pdfGenerator';
import { renderInvoiceHtml } from './templateEngine';

export function getBusinessProfile(db: Database.Database): BusinessProfile {
  interface BusinessProfileRow {
    name: string;
    tax_pin: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
    logo_path: string | null;
    bank_details: string | null;
    mpesa_paybill: string | null;
    mpesa_account: string | null;
    mpesa_till: string | null;
    default_currency: string;
    default_tax_rate: number;
  }

  const row = db.prepare('SELECT * FROM business_profile LIMIT 1').get() as
    | BusinessProfileRow
    | undefined;

  if (row) {
    return {
      name: row.name,
      taxPin: row.tax_pin || undefined,
      address: row.address || undefined,
      phone: row.phone || undefined,
      email: row.email || undefined,
      logoPath: row.logo_path || undefined,
      bankDetails: row.bank_details || undefined,
      mpesaPaybill: row.mpesa_paybill || undefined,
      mpesaAccount: row.mpesa_account || undefined,
      mpesaTill: row.mpesa_till || undefined,
      defaultCurrency: row.default_currency || 'KES',
      defaultTaxRate: row.default_tax_rate || 16
    };
  }

  return {
    name: 'Chris Developer Studio',
    taxPin: 'P051234567Z',
    address: 'Nairobi, Kenya',
    phone: '+254700112233',
    email: 'chris@invoicestudio.ke',
    mpesaPaybill: '522522',
    mpesaAccount: 'STUDIO',
    bankDetails: 'NCBA Bank Kenya\nAccount: 1234567890\nBranch: Upper Hill',
    defaultCurrency: 'KES',
    defaultTaxRate: 16
  };
}

export function getDefaultInvoicesDir(): string {
  const dir = join(app.getPath('userData'), 'invoices');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Generates the PDF buffer for an invoice and returns it alongside metadata.
 */
export async function generateInvoicePdfBuffer(
  db: Database.Database,
  options: PdfRenderOptions
): Promise<{ buffer: Buffer; fileName: string }> {
  const invoice = getInvoice(db, options.invoiceId);
  const client = getClient(db, invoice.clientId);
  const business = getBusinessProfile(db);

  const html = renderInvoiceHtml(invoice, client, business, options);
  const buffer = await renderHtmlToPdf(html);

  const sanitizedInvoiceNumber = invoice.invoiceNumber.replace(/[^a-zA-Z0-9-_]/g, '_');
  const fileName = `${sanitizedInvoiceNumber}.pdf`;

  return { buffer, fileName };
}

/**
 * Exports invoice PDF to disk either to a target path or via a native Save As dialog.
 */
export async function exportInvoicePdf(
  db: Database.Database,
  options: ExportPdfOptions
): Promise<PdfExportResult | null> {
  const { buffer, fileName } = await generateInvoicePdfBuffer(db, options);

  let targetPath = options.targetPath;

  if (!targetPath) {
    const dialogResult = await dialog.showSaveDialog({
      title: 'Export Invoice as PDF',
      defaultPath: join(app.getPath('documents'), fileName),
      filters: [{ name: 'PDF Documents', extensions: ['pdf'] }]
    });

    if (dialogResult.canceled || !dialogResult.filePath) {
      return null;
    }
    targetPath = dialogResult.filePath;
  }

  mkdirSync(dirname(targetPath), { recursive: true });
  writeFileSync(targetPath, buffer);

  return {
    filePath: targetPath,
    bytes: buffer.byteLength
  };
}

/**
 * Generates a base64 data URI of the rendered PDF for in-app preview.
 */
export async function previewInvoicePdf(
  db: Database.Database,
  options: PdfRenderOptions
): Promise<string> {
  const { buffer } = await generateInvoicePdfBuffer(db, options);
  return `data:application/pdf;base64,${buffer.toString('base64')}`;
}

/**
 * Reveals an invoice PDF in the native file explorer.
 */
export function revealInvoicePdf(filePath: string): boolean {
  if (existsSync(filePath)) {
    shell.showItemInFolder(filePath);
    return true;
  }
  return false;
}

/**
 * Opens an invoice PDF with the operating system's default viewer.
 */
export async function openInvoicePdf(filePath: string): Promise<string> {
  if (!existsSync(filePath)) {
    throw new Error(`PDF file does not exist at path: ${filePath}`);
  }
  return await shell.openPath(filePath);
}

/**
 * Prepares an email dispatch with honest mailto: attachment handling.
 * Saves the PDF to disk, copies the path to clipboard, and triggers mailto:.
 */
export async function prepareEmailInvoice(
  db: Database.Database,
  options: EmailInvoiceOptions
): Promise<PrepareEmailResult> {
  const invoice = getInvoice(db, options.invoiceId);
  const client = getClient(db, invoice.clientId);
  const business = getBusinessProfile(db);

  // 1. Save PDF to local invoices storage
  const { buffer, fileName } = await generateInvoicePdfBuffer(db, options);
  const localPdfPath = join(getDefaultInvoicesDir(), fileName);
  writeFileSync(localPdfPath, buffer);

  // 2. Copy PDF path to clipboard for quick drag-and-drop or attachment
  clipboard.writeText(localPdfPath);

  // 3. Construct RFC 6068 mailto parameters
  const recipient = options.clientEmail || client.email || '';
  const subject = encodeURIComponent(`Invoice ${invoice.invoiceNumber} from ${business.name}`);
  const totalFormatted = formatMoney(invoice.totalMinor, invoice.currency);
  const bodyText = [
    `Dear ${client.name},`,
    '',
    `Please find your invoice ${invoice.invoiceNumber} for ${totalFormatted}.`,
    `Payment is due by ${invoice.dueDate}.`,
    '',
    'Payment details:',
    business.mpesaPaybill
      ? `M-Pesa Paybill: ${business.mpesaPaybill} (Account: ${business.mpesaAccount || invoice.invoiceNumber})`
      : '',
    business.mpesaTill ? `M-Pesa Till: ${business.mpesaTill}` : '',
    business.bankDetails ? `Bank Details:\n${business.bankDetails}` : '',
    '',
    'Thank you for your business.',
    '',
    business.name
  ]
    .filter(Boolean)
    .join('\n');

  const mailtoUrl = `mailto:${recipient}?subject=${subject}&body=${encodeURIComponent(bodyText)}`;

  // 4. Trigger mailto in default desktop client
  handleExternalUrl(mailtoUrl);

  const message =
    'Invoice PDF generated and copied to your clipboard. Standard desktop mail clients do not allow automatic file attachment via mailto: links, so please attach the copied PDF file in your email window.';

  return {
    mailtoUrl,
    pdfPath: localPdfPath,
    message
  };
}

