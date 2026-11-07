// path: src/main/pdf/templates/classic.ts
import { BusinessProfile, Client, Invoice, PdfRenderOptions } from '@shared/types';
import { formatMoney } from '@shared/utils/money';
import { BASE_PRINT_CSS, escapeHtml, renderPaymentInstructionsHtml } from './templateUtils';

export function renderClassicTemplate(
  invoice: Invoice,
  client: Client,
  business: BusinessProfile,
  options: PdfRenderOptions
): string {
  const primaryColor = options.primaryColor || '#1e3a8a'; // Deep classic navy
  const currency = invoice.currency;

  const lineItemsHtml = invoice.lineItems
    .map(
      (item, index) => `
    <tr class="${index % 2 === 1 ? 'row-alt' : ''}">
      <td class="col-desc">
        <div class="item-title">${escapeHtml(item.description)}</div>
      </td>
      <td class="col-qty text-center">${item.quantity}</td>
      <td class="col-price text-right">${formatMoney(item.unitPriceMinor, currency)}</td>
      <td class="col-disc text-center">${item.discountPercent > 0 ? `${item.discountPercent}%` : '—'}</td>
      <td class="col-tax text-center">${item.taxRatePercent}%</td>
      <td class="col-total text-right font-semibold">${formatMoney(item.totalMinor, currency)}</td>
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

    .classic-container {
      max-width: 800px;
      margin: 0 auto;
    }

    .header-table {
      width: 100%;
      margin-bottom: 24px;
      border-bottom: 2px solid ${primaryColor};
      padding-bottom: 16px;
    }

    .company-title {
      font-size: 22px;
      font-weight: 700;
      color: ${primaryColor};
      letter-spacing: -0.5px;
    }

    .invoice-title {
      font-size: 28px;
      font-weight: 800;
      color: ${primaryColor};
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .meta-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 10px 14px;
      border-radius: 4px;
      margin-top: 8px;
      display: inline-block;
      text-align: left;
    }

    .meta-row {
      margin-bottom: 3px;
      font-size: 12px;
    }

    .meta-row:last-child {
      margin-bottom: 0;
    }

    .parties-grid {
      width: 100%;
      margin-bottom: 24px;
    }

    .party-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      color: #64748b;
      margin-bottom: 4px;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 2px;
    }

    .party-name {
      font-size: 15px;
      font-weight: 700;
      color: #0f172a;
    }

    .party-detail {
      font-size: 12px;
      color: #475569;
      margin-top: 2px;
    }

    /* Items Table */
    .items-table {
      margin-bottom: 20px;
    }

    .items-table th {
      background-color: ${primaryColor};
      color: #ffffff;
      padding: 8px 10px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .items-table td {
      padding: 9px 10px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 12px;
    }

    .row-alt {
      background-color: #f8fafc;
    }

    .col-desc { width: 44%; }
    .col-qty { width: 10%; }
    .col-price { width: 14%; }
    .col-disc { width: 10%; }
    .col-tax { width: 8%; }
    .col-total { width: 14%; }

    /* Totals */
    .totals-wrapper {
      width: 100%;
      margin-bottom: 24px;
    }

    .totals-table {
      width: 280px;
      margin-left: auto;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      overflow: hidden;
    }

    .totals-table td {
      padding: 6px 12px;
      font-size: 12px;
    }

    .grand-total-row {
      background: ${primaryColor};
      color: #ffffff;
      font-size: 14px !important;
      font-weight: 700;
    }

    /* Bottom Section */
    .footer-section {
      border-top: 1px solid #cbd5e1;
      padding-top: 16px;
      margin-top: 20px;
      font-size: 12px;
    }

    .payment-box {
      background: #f1f5f9;
      border-left: 4px solid ${primaryColor};
      padding: 10px 14px;
      margin-bottom: 16px;
    }

    .disclaimer-note {
      font-size: 10px;
      color: #94a3b8;
      margin-top: 16px;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="classic-container">
    <!-- Header -->
    <table class="header-table">
      <tr>
        <td style="vertical-align: top; width: 60%;">
          <div class="company-title">${escapeHtml(business.name)}</div>
          ${business.taxPin ? `<div style="font-size: 12px; color: #475569;">PIN: ${escapeHtml(business.taxPin)}</div>` : ''}
          ${business.address ? `<div style="font-size: 12px; color: #475569;">${escapeHtml(business.address)}</div>` : ''}
          ${business.phone ? `<div style="font-size: 12px; color: #475569;">Phone: ${escapeHtml(business.phone)}</div>` : ''}
          ${business.email ? `<div style="font-size: 12px; color: #475569;">Email: ${escapeHtml(business.email)}</div>` : ''}
        </td>
        <td style="vertical-align: top; text-align: right; width: 40%;">
          <div class="invoice-title">Invoice</div>
          <div class="meta-box">
            <div class="meta-row"><strong>Invoice No:</strong> ${escapeHtml(invoice.invoiceNumber)}</div>
            <div class="meta-row"><strong>Date:</strong> ${invoice.issueDate}</div>
            <div class="meta-row"><strong>Due Date:</strong> ${invoice.dueDate}</div>
            <div class="meta-row"><strong>Status:</strong> ${escapeHtml(invoice.status.toUpperCase())}</div>
          </div>
        </td>
      </tr>
    </table>

    <!-- Parties -->
    <table class="parties-grid">
      <tr>
        <td style="width: 50%; vertical-align: top; padding-right: 15px;">
          <div class="party-title">Billed To</div>
          <div class="party-name">${escapeHtml(client.name)}</div>
          ${client.taxPin ? `<div class="party-detail"><strong>KRA PIN:</strong> ${escapeHtml(client.taxPin)}</div>` : ''}
          ${client.address ? `<div class="party-detail">${escapeHtml(client.address)}</div>` : ''}
          ${client.phone ? `<div class="party-detail">${escapeHtml(client.phone)}</div>` : ''}
          ${client.email ? `<div class="party-detail">${escapeHtml(client.email)}</div>` : ''}
        </td>
        <td style="width: 50%; vertical-align: top; padding-left: 15px;">
          <div class="party-title">Payment Terms</div>
          <div style="font-size: 12px; color: #334155; margin-top: 4px;">
            ${invoice.terms ? escapeHtml(invoice.terms) : 'Payment due within 30 days of invoice date.'}
          </div>
        </td>
      </tr>
    </table>

    <!-- Line Items Table -->
    <table class="items-table">
      <thead>
        <tr>
          <th class="col-desc text-left">Description</th>
          <th class="col-qty text-center">Qty</th>
          <th class="col-price text-right">Unit Price</th>
          <th class="col-disc text-center">Discount</th>
          <th class="col-tax text-center">VAT</th>
          <th class="col-total text-right">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${lineItemsHtml}
      </tbody>
    </table>

    <!-- Totals -->
    <div class="totals-wrapper no-break">
      <table class="totals-table">
        <tr>
          <td>Subtotal:</td>
          <td class="text-right">${formatMoney(invoice.subtotalMinor, currency)}</td>
        </tr>
        ${
          invoice.discountTotalMinor > 0
            ? `<tr>
                <td>Discount:</td>
                <td class="text-right text-emerald-600">-${formatMoney(invoice.discountTotalMinor, currency)}</td>
              </tr>`
            : ''
        }
        <tr>
          <td>VAT (Tax):</td>
          <td class="text-right">${formatMoney(invoice.taxTotalMinor, currency)}</td>
        </tr>
        <tr class="grand-total-row">
          <td>Total Due:</td>
          <td class="text-right">${formatMoney(invoice.totalMinor, currency)}</td>
        </tr>
        ${
          invoice.amountPaidMinor > 0
            ? `<tr>
                <td>Amount Paid:</td>
                <td class="text-right">${formatMoney(invoice.amountPaidMinor, currency)}</td>
              </tr>
              <tr style="font-weight: 700; color: #dc2626;">
                <td>Balance Due:</td>
                <td class="text-right">${formatMoney(invoice.balanceDueMinor, currency)}</td>
              </tr>`
            : ''
        }
      </table>
    </div>

    <!-- Payment & Footer -->
    <div class="footer-section no-break">
      <div class="payment-box">
        <strong style="color: ${primaryColor};">Settlement Instructions:</strong>
        <div style="margin-top: 4px;">
          ${renderPaymentInstructionsHtml(business)}
        </div>
      </div>

      ${
        invoice.notes
          ? `<div style="margin-bottom: 12px;">
              <strong>Notes:</strong><br/>
              <span style="color: #475569;">${escapeHtml(invoice.notes)}</span>
            </div>`
          : ''
      }

      <div class="disclaimer-note">
        Note: This invoice is issued for commercial settlement. Official KRA eTIMS fiscalization is managed separately.
      </div>
    </div>
  </div>
</body>
</html>`;
}

