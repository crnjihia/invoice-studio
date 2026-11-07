// path: src/main/pdf/templates/minimal.ts
import { BusinessProfile, Client, Invoice, PdfRenderOptions } from '@shared/types';
import { formatMoney } from '@shared/utils/money';
import { BASE_PRINT_CSS, escapeHtml, renderPaymentInstructionsHtml } from './templateUtils';

export function renderMinimalTemplate(
  invoice: Invoice,
  client: Client,
  business: BusinessProfile,
  options: PdfRenderOptions
): string {
  const primaryColor = options.primaryColor || '#0f172a'; // Slate-900 neutral
  const currency = invoice.currency;

  const lineItemsHtml = invoice.lineItems
    .map(
      item => `
    <tr>
      <td class="col-desc">
        <div style="font-weight: 500;">${escapeHtml(item.description)}</div>
      </td>
      <td class="col-qty text-center">${item.quantity}</td>
      <td class="col-price text-right">${formatMoney(item.unitPriceMinor, currency)}</td>
      <td class="col-disc text-center">${item.discountPercent > 0 ? `${item.discountPercent}%` : '—'}</td>
      <td class="col-tax text-center">${item.taxRatePercent}%</td>
      <td class="col-total text-right">${formatMoney(item.totalMinor, currency)}</td>
    </tr>
  `
    )
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Invoice ${escapeHtml(invoice.invoiceNumber)}</title>
  <style>
    ${BASE_PRINT_CSS}

    .minimal-container {
      max-width: 800px;
      margin: 0 auto;
    }

    .header-section {
      width: 100%;
      margin-bottom: 36px;
      border-bottom: 1px solid #0f172a;
      padding-bottom: 20px;
    }

    .company-title {
      font-size: 20px;
      font-weight: 700;
      color: ${primaryColor};
      letter-spacing: -0.5px;
    }

    .invoice-title {
      font-size: 24px;
      font-weight: 300;
      color: #64748b;
      letter-spacing: -0.5px;
    }

    .invoice-number {
      font-size: 20px;
      font-weight: 700;
      color: ${primaryColor};
    }

    .meta-line {
      font-size: 11px;
      color: #64748b;
      margin-top: 3px;
    }

    /* Parties Section */
    .parties-table {
      width: 100%;
      margin-bottom: 32px;
    }

    .section-label {
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #94a3b8;
      margin-bottom: 6px;
    }

    .client-name {
      font-size: 14px;
      font-weight: 600;
      color: #0f172a;
    }

    .client-sub {
      font-size: 12px;
      color: #475569;
      margin-top: 2px;
    }

    /* Table */
    .minimal-table {
      width: 100%;
      margin-bottom: 28px;
    }

    .minimal-table th {
      border-bottom: 1px solid #cbd5e1;
      padding: 8px 6px;
      font-size: 11px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .minimal-table td {
      padding: 10px 6px;
      border-bottom: 1px solid #f1f5f9;
      font-size: 12px;
    }

    .col-desc { width: 44%; }
    .col-qty { width: 10%; }
    .col-price { width: 14%; }
    .col-disc { width: 10%; }
    .col-tax { width: 8%; }
    .col-total { width: 14%; }

    /* Totals */
    .totals-area {
      width: 100%;
      margin-bottom: 32px;
    }

    .totals-table {
      width: 250px;
      margin-left: auto;
    }

    .totals-table td {
      padding: 4px 6px;
      font-size: 12px;
    }

    .total-final {
      border-top: 1px solid #0f172a;
      border-bottom: 1px solid #0f172a;
      font-size: 14px !important;
      font-weight: 700;
      color: #0f172a;
    }

    .total-final td {
      padding: 8px 6px;
    }

    /* Footer info */
    .footer-area {
      border-top: 1px solid #e2e8f0;
      padding-top: 20px;
      font-size: 11px;
      color: #475569;
    }

    .disclaimer-note {
      font-size: 9px;
      color: #94a3b8;
      text-align: center;
      margin-top: 28px;
    }
  </style>
</head>
<body>
  <div class="minimal-container">
    <!-- Header -->
    <table class="header-section">
      <tr>
        <td style="width: 50%; vertical-align: top;">
          <div class="company-title">${escapeHtml(business.name)}</div>
          ${business.taxPin ? `<div class="meta-line">PIN: ${escapeHtml(business.taxPin)}</div>` : ''}
          ${business.address ? `<div class="meta-line">${escapeHtml(business.address)}</div>` : ''}
          ${business.phone ? `<div class="meta-line">${escapeHtml(business.phone)}</div>` : ''}
          ${business.email ? `<div class="meta-line">${escapeHtml(business.email)}</div>` : ''}
        </td>
        <td style="width: 50%; vertical-align: top; text-align: right;">
          <div class="invoice-title">Invoice</div>
          <div class="invoice-number">${escapeHtml(invoice.invoiceNumber)}</div>
          <div class="meta-line">Issue: ${invoice.issueDate} &bull; Due: ${invoice.dueDate}</div>
          <div class="meta-line">Status: ${escapeHtml(invoice.status.toUpperCase())}</div>
        </td>
      </tr>
    </table>

    <!-- Parties -->
    <table class="parties-table">
      <tr>
        <td style="width: 50%; vertical-align: top; padding-right: 20px;">
          <div class="section-label">Billed To</div>
          <div class="client-name">${escapeHtml(client.name)}</div>
          ${client.taxPin ? `<div class="client-sub">PIN: ${escapeHtml(client.taxPin)}</div>` : ''}
          ${client.address ? `<div class="client-sub">${escapeHtml(client.address)}</div>` : ''}
          ${client.phone ? `<div class="client-sub">${escapeHtml(client.phone)}</div>` : ''}
          ${client.email ? `<div class="client-sub">${escapeHtml(client.email)}</div>` : ''}
        </td>
        <td style="width: 50%; vertical-align: top;">
          <div class="section-label">Terms</div>
          <div style="font-size: 12px; color: #475569; line-height: 1.5;">
            ${invoice.terms ? escapeHtml(invoice.terms) : 'Standard Net 30.'}
          </div>
          ${
            invoice.notes
              ? `<div style="margin-top: 8px; font-size: 11px; color: #64748b;">
                  <strong>Note:</strong> ${escapeHtml(invoice.notes)}
                </div>`
              : ''
          }
        </td>
      </tr>
    </table>

    <!-- Line Items Table -->
    <table class="minimal-table">
      <thead>
        <tr>
          <th class="col-desc text-left">Description</th>
          <th class="col-qty text-center">Qty</th>
          <th class="col-price text-right">Price</th>
          <th class="col-disc text-center">Disc</th>
          <th class="col-tax text-center">VAT</th>
          <th class="col-total text-right">Total</th>
        </tr>
      </thead>
      <tbody>
        ${lineItemsHtml}
      </tbody>
    </table>

    <!-- Totals -->
    <div class="totals-area no-break">
      <table class="totals-table">
        <tr>
          <td>Subtotal:</td>
          <td class="text-right">${formatMoney(invoice.subtotalMinor, currency)}</td>
        </tr>
        ${
          invoice.discountTotalMinor > 0
            ? `<tr>
                <td>Discount:</td>
                <td class="text-right">-${formatMoney(invoice.discountTotalMinor, currency)}</td>
              </tr>`
            : ''
        }
        <tr>
          <td>VAT:</td>
          <td class="text-right">${formatMoney(invoice.taxTotalMinor, currency)}</td>
        </tr>
        <tr class="total-final">
          <td>Total Due:</td>
          <td class="text-right">${formatMoney(invoice.totalMinor, currency)}</td>
        </tr>
        ${
          invoice.amountPaidMinor > 0
            ? `<tr>
                <td>Paid:</td>
                <td class="text-right">${formatMoney(invoice.amountPaidMinor, currency)}</td>
              </tr>
              <tr style="font-weight: 700;">
                <td>Balance:</td>
                <td class="text-right">${formatMoney(invoice.balanceDueMinor, currency)}</td>
              </tr>`
            : ''
        }
      </table>
    </div>

    <!-- Settlement -->
    <div class="footer-area no-break">
      <div class="section-label">Payment Instructions</div>
      <div style="line-height: 1.5; color: #334155;">
        ${renderPaymentInstructionsHtml(business)}
      </div>

      <div class="disclaimer-note">
        Note: This invoice is issued for commercial settlement. Official KRA eTIMS fiscalization is managed separately.
      </div>
    </div>
  </div>
</body>
</html>`;
}

