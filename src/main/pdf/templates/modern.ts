// path: src/main/pdf/templates/modern.ts
import { BusinessProfile, Client, Invoice, PdfRenderOptions } from '@shared/types';
import { formatMoney } from '@shared/utils/money';
import { BASE_PRINT_CSS, escapeHtml, renderPaymentInstructionsHtml } from './templateUtils';

export function renderModernTemplate(
  invoice: Invoice,
  client: Client,
  business: BusinessProfile,
  options: PdfRenderOptions
): string {
  const primaryColor = options.primaryColor || '#059669'; // Bold Kenyan emerald
  const accentColor = options.accentColor || '#0f172a';
  const currency = invoice.currency;

  const lineItemsHtml = invoice.lineItems
    .map(
      item => `
    <tr>
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

    .modern-container {
      max-width: 800px;
      margin: 0 auto;
    }

    /* Top Brand Bar */
    .top-banner {
      background: linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 100%);
      color: #ffffff;
      padding: 24px 28px;
      border-radius: 8px;
      margin-bottom: 24px;
    }

    .banner-table {
      width: 100%;
    }

    .company-name {
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.5px;
    }

    .company-sub {
      font-size: 11px;
      opacity: 0.9;
      margin-top: 4px;
      line-height: 1.4;
    }

    .invoice-badge {
      display: inline-block;
      background: rgba(255, 255, 255, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.3);
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }

    .invoice-num {
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.5px;
    }

    /* Client & Info Cards */
    .cards-table {
      width: 100%;
      margin-bottom: 24px;
    }

    .info-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 14px 16px;
    }

    .card-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      color: ${primaryColor};
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }

    .client-title {
      font-size: 15px;
      font-weight: 700;
      color: #0f172a;
    }

    /* Items Table */
    .items-table {
      margin-bottom: 20px;
    }

    .items-table th {
      background: #f1f5f9;
      color: #475569;
      padding: 10px 12px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-top: 2px solid ${primaryColor};
      border-bottom: 1px solid #cbd5e1;
    }

    .items-table td {
      padding: 10px 12px;
      border-bottom: 1px solid #f1f5f9;
      font-size: 12px;
    }

    .col-desc { width: 44%; }
    .col-qty { width: 10%; }
    .col-price { width: 14%; }
    .col-disc { width: 10%; }
    .col-tax { width: 8%; }
    .col-total { width: 14%; }

    /* Summary & Totals */
    .summary-section {
      width: 100%;
      margin-top: 10px;
      margin-bottom: 24px;
    }

    .payment-callout {
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      border-radius: 6px;
      padding: 14px 16px;
      font-size: 12px;
      color: #065f46;
    }

    .totals-box {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0 4px;
    }

    .totals-box td {
      padding: 4px 10px;
      font-size: 12px;
    }

    .total-highlight {
      background: ${primaryColor};
      color: #ffffff;
      font-weight: 800;
      font-size: 15px !important;
      border-radius: 4px;
    }

    .total-highlight td {
      padding: 8px 12px;
    }

    .disclaimer {
      text-align: center;
      font-size: 10px;
      color: #94a3b8;
      margin-top: 24px;
      padding-top: 12px;
      border-top: 1px dashed #e2e8f0;
    }
  </style>
</head>
<body>
  <div class="modern-container">
    <!-- Top Brand Banner -->
    <div class="top-banner">
      <table class="banner-table">
        <tr>
          <td style="vertical-align: middle; width: 60%;">
            <div class="company-name">${escapeHtml(business.name)}</div>
            <div class="company-sub">
              ${business.taxPin ? `PIN: ${escapeHtml(business.taxPin)} | ` : ''}
              ${business.phone ? `Phone: ${escapeHtml(business.phone)} | ` : ''}
              ${business.email ? `Email: ${escapeHtml(business.email)}` : ''}<br/>
              ${business.address ? escapeHtml(business.address) : ''}
            </div>
          </td>
          <td style="vertical-align: middle; text-align: right; width: 40%;">
            <div class="invoice-badge">${escapeHtml(invoice.status)}</div>
            <div class="invoice-num">${escapeHtml(invoice.invoiceNumber)}</div>
            <div style="font-size: 11px; opacity: 0.9; margin-top: 4px;">
              Date: <strong>${invoice.issueDate}</strong> | Due: <strong>${invoice.dueDate}</strong>
            </div>
          </td>
        </tr>
      </table>
    </div>

    <!-- Info Cards -->
    <table class="cards-table">
      <tr>
        <td style="width: 50%; vertical-align: top; padding-right: 8px;">
          <div class="info-card">
            <div class="card-label">Invoice For</div>
            <div class="client-title">${escapeHtml(client.name)}</div>
            ${client.taxPin ? `<div style="font-size: 12px; color: #475569; margin-top: 2px;"><strong>KRA PIN:</strong> ${escapeHtml(client.taxPin)}</div>` : ''}
            ${client.address ? `<div style="font-size: 12px; color: #475569; margin-top: 2px;">${escapeHtml(client.address)}</div>` : ''}
            ${client.phone ? `<div style="font-size: 12px; color: #475569; margin-top: 2px;">${escapeHtml(client.phone)}</div>` : ''}
            ${client.email ? `<div style="font-size: 12px; color: #475569; margin-top: 2px;">${escapeHtml(client.email)}</div>` : ''}
          </div>
        </td>
        <td style="width: 50%; vertical-align: top; padding-left: 8px;">
          <div class="info-card">
            <div class="card-label">Payment Terms & SLA</div>
            <div style="font-size: 12px; color: #334155; line-height: 1.5;">
              ${invoice.terms ? escapeHtml(invoice.terms) : 'Full payment due within 30 days.'}
            </div>
            ${
              invoice.notes
                ? `<div style="margin-top: 8px; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 6px;">
                    <strong>Special Notes:</strong> ${escapeHtml(invoice.notes)}
                  </div>`
                : ''
            }
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
          <th class="col-tax text-center">Tax</th>
          <th class="col-total text-right">Line Total</th>
        </tr>
      </thead>
      <tbody>
        ${lineItemsHtml}
      </tbody>
    </table>

    <!-- Summary & Totals -->
    <table class="summary-section no-break">
      <tr>
        <td style="width: 55%; vertical-align: top; padding-right: 15px;">
          <div class="payment-callout">
            <strong style="font-size: 13px; color: ${primaryColor};">M-Pesa &amp; Bank Routing Details:</strong>
            <div style="margin-top: 6px; line-height: 1.5;">
              ${renderPaymentInstructionsHtml(business)}
            </div>
          </div>
        </td>
        <td style="width: 45%; vertical-align: top;">
          <table class="totals-box">
            <tr>
              <td style="color: #64748b;">Subtotal:</td>
              <td class="text-right font-semibold">${formatMoney(invoice.subtotalMinor, currency)}</td>
            </tr>
            ${
              invoice.discountTotalMinor > 0
                ? `<tr>
                    <td style="color: #059669;">Discount:</td>
                    <td class="text-right font-semibold text-emerald-600">-${formatMoney(invoice.discountTotalMinor, currency)}</td>
                  </tr>`
                : ''
            }
            <tr>
              <td style="color: #64748b;">VAT Total:</td>
              <td class="text-right font-semibold">${formatMoney(invoice.taxTotalMinor, currency)}</td>
            </tr>
            <tr class="total-highlight">
              <td>Total Due:</td>
              <td class="text-right">${formatMoney(invoice.totalMinor, currency)}</td>
            </tr>
            ${
              invoice.amountPaidMinor > 0
                ? `<tr>
                    <td style="color: #64748b;">Amount Paid:</td>
                    <td class="text-right">${formatMoney(invoice.amountPaidMinor, currency)}</td>
                  </tr>
                  <tr style="font-weight: 800; color: #e11d48; font-size: 13px;">
                    <td>Balance Outstanding:</td>
                    <td class="text-right">${formatMoney(invoice.balanceDueMinor, currency)}</td>
                  </tr>`
                : ''
            }
          </table>
        </td>
      </tr>
    </table>

    <div class="disclaimer no-break">
      Note: This invoice is issued for commercial settlement. Official KRA eTIMS fiscalization is managed separately.
    </div>
  </div>
</body>
</html>`;
}
