// path: src/main/ipc/handlers/pdfHandlers.ts
import { ipcRegistry } from '../registry';
import { IPC_CHANNELS } from '@shared/channels';
import {
  EmailInvoiceSchema,
  ExportPdfSchema,
  OpenPdfSchema,
  PdfRenderOptionsSchema
} from '@shared/schemas/pdf';
import { getDatabase } from '../../db/connection';
import {
  exportInvoicePdf,
  generateInvoicePdfBuffer,
  openInvoicePdf,
  prepareEmailInvoice,
  previewInvoicePdf,
  revealInvoicePdf
} from '../../pdf/pdfService';

export function registerPdfHandlers(): void {
  ipcRegistry.register(IPC_CHANNELS.INVOICE.GENERATE_PDF, PdfRenderOptionsSchema, async input => {
    const { buffer, fileName } = await generateInvoicePdfBuffer(getDatabase(), input);
    return {
      fileName,
      bytes: buffer.byteLength,
      base64: buffer.toString('base64')
    };
  });

  ipcRegistry.register(IPC_CHANNELS.INVOICE.PREVIEW_PDF, PdfRenderOptionsSchema, async input => {
    return await previewInvoicePdf(getDatabase(), input);
  });

  ipcRegistry.register(IPC_CHANNELS.INVOICE.EXPORT_PDF, ExportPdfSchema, async input => {
    return await exportInvoicePdf(getDatabase(), input);
  });

  ipcRegistry.register(IPC_CHANNELS.INVOICE.OPEN_PDF, OpenPdfSchema, async input => {
    return await openInvoicePdf(input.filePath);
  });

  ipcRegistry.register(IPC_CHANNELS.INVOICE.REVEAL_PDF, OpenPdfSchema, async input => {
    return revealInvoicePdf(input.filePath);
  });

  ipcRegistry.register(IPC_CHANNELS.INVOICE.PREPARE_EMAIL, EmailInvoiceSchema, async input => {
    return await prepareEmailInvoice(getDatabase(), input);
  });
}
