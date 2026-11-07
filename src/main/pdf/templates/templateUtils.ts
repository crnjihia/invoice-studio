// path: src/main/pdf/templates/templateUtils.ts
import { BusinessProfile } from '@shared/types';

export function escapeHtml(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function renderPaymentInstructionsHtml(profile: BusinessProfile): string {
  const parts: string[] = [];

  if (profile.mpesaPaybill && profile.mpesaAccount) {
    parts.push(`
      <div class="payment-channel">
        <strong>M-Pesa Paybill:</strong> ${escapeHtml(profile.mpesaPaybill)}<br/>
        <strong>Account No:</strong> ${escapeHtml(profile.mpesaAccount)}
      </div>
    `);
  } else if (profile.mpesaTill) {
    parts.push(`
      <div class="payment-channel">
        <strong>M-Pesa Buy Goods / Till:</strong> ${escapeHtml(profile.mpesaTill)}
      </div>
    `);
  }

  if (profile.bankDetails) {
    parts.push(`
      <div class="payment-channel">
        <strong>Bank Details:</strong><br/>
        <span style="white-space: pre-line;">${escapeHtml(profile.bankDetails)}</span>
      </div>
    `);
  }

  if (parts.length === 0) {
    return `
      <div class="payment-channel">
        <strong>Payment Method:</strong> Bank Transfer or M-Pesa. Contact accounts for payment routing details.
      </div>
    `;
  }

  return parts.join('\n');
}

export const BASE_PRINT_CSS = `
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    color: #1e293b;
    background: #ffffff;
    font-size: 13px;
    line-height: 1.5;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  @page {
    size: A4 portrait;
    margin: 14mm 15mm 15mm 15mm;
  }

  @media print {
    body {
      background: #ffffff;
    }
    .page-break {
      page-break-before: always;
      break-before: page;
    }
    .no-break {
      page-break-inside: avoid;
      break-inside: avoid;
    }
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  thead {
    display: table-header-group;
  }

  tr {
    page-break-inside: avoid;
    break-inside: avoid;
  }

  .text-left { text-align: left; }
  .text-right { text-align: right; }
  .text-center { text-align: center; }
  .font-bold { font-weight: 700; }
  .font-semibold { font-weight: 600; }
`;

