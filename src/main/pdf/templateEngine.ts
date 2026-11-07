// path: src/main/pdf/templateEngine.ts
import { BusinessProfile, Client, Invoice, PdfRenderOptions } from '@shared/types';
import { renderClassicTemplate } from './templates/classic';
import { renderModernTemplate } from './templates/modern';
import { renderMinimalTemplate } from './templates/minimal';

export function renderInvoiceHtml(
  invoice: Invoice,
  client: Client,
  business: BusinessProfile,
  options: PdfRenderOptions
): string {
  const templateId = options.templateId || 'classic';

  switch (templateId) {
    case 'modern':
      return renderModernTemplate(invoice, client, business, options);
    case 'minimal':
      return renderMinimalTemplate(invoice, client, business, options);
    case 'classic':
    default:
      return renderClassicTemplate(invoice, client, business, options);
  }
}

