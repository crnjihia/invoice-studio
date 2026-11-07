// path: src/tests/unit/pdf-templates.test.ts
import { describe, it, expect } from 'vitest';
import { BusinessProfile, Client, Invoice } from '../../shared/types';
import { renderInvoiceHtml } from '../../main/pdf/templateEngine';
import { renderClassicTemplate } from '../../main/pdf/templates/classic';
import { renderModernTemplate } from '../../main/pdf/templates/modern';
import { renderMinimalTemplate } from '../../main/pdf/templates/minimal';
import { escapeHtml } from '../../main/pdf/templates/templateUtils';

describe('PDF Invoice HTML/CSS Templates Unit Tests', () => {
  const mockBusiness: BusinessProfile = {
    name: 'Nairobi Digital Studio Ltd',
    taxPin: 'P051234567A',
    address: 'Kileleshwa, Nairobi, Kenya',
    phone: '+254711223344',
    email: 'hello@nairobidigital.ke',
    mpesaPaybill: '400200',
    mpesaAccount: 'INV-STUDIO',
    bankDetails: 'Stanbic Bank Kenya\nAccount: 010023456789\nBranch: Chiromo',
    defaultCurrency: 'KES',
    defaultTaxRate: 16
  };

  const mockClient: Client = {
    id: 'client-123',
    name: 'Savannah Agribusiness PLC',
    email: 'billing@savannahagri.co.ke',
    phone: '+254722998877',
    address: 'Naivasha Road, Nakuru',
    taxPin: 'P059988776B',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  };

  const mockInvoice: Invoice = {
    id: 'inv-123',
    invoiceNumber: 'INV-2026-0042',
    clientId: 'client-123',
    clientName: 'Savannah Agribusiness PLC',
    status: 'sent',
    issueDate: '2026-03-15',
    dueDate: '2026-04-14',
    currency: 'KES',
    subtotalMinor: 10000000, // KES 100,000.00
    discountTotalMinor: 1000000, // KES 10,000.00
    taxTotalMinor: 1440000, // KES 14,400.00 (16% of 90k)
    totalMinor: 10440000, // KES 104,400.00
    amountPaidMinor: 2000000, // KES 20,000.00
    balanceDueMinor: 8440000, // KES 84,400.00
    notes: 'Thank you for partnering with us.',
    terms: 'Net 30 days. Late fee applies.',
    lineItems: [
      {
        id: 'item-1',
        invoiceId: 'inv-123',
        description: 'Custom IoT Telemetry Dashboard',
        quantity: 1,
        unitPriceMinor: 10000000,
        discountPercent: 10,
        taxRatePercent: 16,
        subtotalMinor: 10000000,
        discountMinor: 1000000,
        taxMinor: 1440000,
        totalMinor: 10440000
      }
    ],
    createdAt: '2026-03-15T10:00:00.000Z',
    updatedAt: '2026-03-15T10:00:00.000Z'
  };

  it('renders the Classic template with full financial and contact breakdowns', () => {
    const html = renderClassicTemplate(mockInvoice, mockClient, mockBusiness, {
      invoiceId: mockInvoice.id,
      templateId: 'classic'
    });

    // Brand and invoice identifiers
    expect(html).toContain('Nairobi Digital Studio Ltd');
    expect(html).toContain('INV-2026-0042');
    expect(html).toContain('Savannah Agribusiness PLC');
    expect(html).toContain('P059988776B');

    // Financial minor-unit totals formatted as KES
    expect(html).toContain('Custom IoT Telemetry Dashboard');
    expect(html).toContain('100,000.00'); // Subtotal
    expect(html).toContain('14,400.00'); // VAT
    expect(html).toContain('104,400.00'); // Grand total
    expect(html).toContain('84,400.00'); // Balance due

    // Payment details
    expect(html).toContain('M-Pesa Paybill:</strong> 400200');
    expect(html).toContain('Account No:</strong> INV-STUDIO');
    expect(html).toContain('Stanbic Bank Kenya');

    // KRA Disclaimer
    expect(html).toContain('Official KRA eTIMS fiscalization is managed separately');

    // CSS print rules
    expect(html).toContain('@page');
    expect(html).toContain('break-inside: avoid');
  });

  it('renders the Modern template with custom primary brand color', () => {
    const customTeal = '#0d9488';
    const html = renderModernTemplate(mockInvoice, mockClient, mockBusiness, {
      invoiceId: mockInvoice.id,
      templateId: 'modern',
      primaryColor: customTeal
    });

    expect(html).toContain(customTeal);
    expect(html).toContain('INV-2026-0042');
    expect(html).toContain('Savannah Agribusiness PLC');
    expect(html).toContain('M-Pesa &amp; Bank Routing Details');
    expect(html).toContain('Official KRA eTIMS fiscalization is managed separately');
  });

  it('renders the Minimal template with Swiss styling and clean divider lines', () => {
    const html = renderMinimalTemplate(mockInvoice, mockClient, mockBusiness, {
      invoiceId: mockInvoice.id,
      templateId: 'minimal'
    });

    expect(html).toContain('INV-2026-0042');
    expect(html).toContain('Savannah Agribusiness PLC');
    expect(html).toContain('Payment Instructions');
    expect(html).toContain('104,400.00');
    expect(html).toContain('Official KRA eTIMS fiscalization is managed separately');
  });

  it('templateEngine properly routes between all three template IDs', () => {
    const classic = renderInvoiceHtml(mockInvoice, mockClient, mockBusiness, {
      invoiceId: mockInvoice.id,
      templateId: 'classic'
    });
    const modern = renderInvoiceHtml(mockInvoice, mockClient, mockBusiness, {
      invoiceId: mockInvoice.id,
      templateId: 'modern'
    });
    const minimal = renderInvoiceHtml(mockInvoice, mockClient, mockBusiness, {
      invoiceId: mockInvoice.id,
      templateId: 'minimal'
    });

    expect(classic).toContain('classic-container');
    expect(modern).toContain('modern-container');
    expect(minimal).toContain('minimal-container');
  });

  it('handles multi-item invoices with 25 line items without crashing or dropping rows', () => {
    const longItems = Array.from({ length: 25 }, (_, i) => ({
      id: `item-${i + 1}`,
      invoiceId: 'inv-long',
      description: `Deliverable Milestone Phase ${i + 1}`,
      quantity: 1,
      unitPriceMinor: 100000,
      discountPercent: 0,
      taxRatePercent: 16,
      subtotalMinor: 100000,
      discountMinor: 0,
      taxMinor: 16000,
      totalMinor: 116000
    }));

    const longInvoice: Invoice = {
      ...mockInvoice,
      lineItems: longItems,
      totalMinor: 116000 * 25
    };

    const html = renderInvoiceHtml(longInvoice, mockClient, mockBusiness, {
      invoiceId: longInvoice.id,
      templateId: 'modern'
    });

    expect(html).toContain('Deliverable Milestone Phase 1');
    expect(html).toContain('Deliverable Milestone Phase 25');
  });

  it('safely escapes HTML characters against XSS injections', () => {
    const maliciousInput = '<script>alert("hack")</script>';
    const escaped = escapeHtml(maliciousInput);

    expect(escaped).not.toContain('<script>');
    expect(escaped).toBe('&lt;script&gt;alert(&quot;hack&quot;)&lt;/script&gt;');

    const maliciousClient: Client = {
      ...mockClient,
      name: 'Acme <img src=x onerror=alert(1)> Corp'
    };

    const html = renderInvoiceHtml(mockInvoice, maliciousClient, mockBusiness, {
      invoiceId: mockInvoice.id,
      templateId: 'classic'
    });

    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });
});
