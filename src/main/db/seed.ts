// path: src/main/db/seed.ts
import Database from 'better-sqlite3';
import { calculateLineItemTotals, calculateInvoiceTotals } from '../../shared/utils/money';

export interface SeedClient {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  taxPin: string;
  notes: string;
}

export interface SeedLineItem {
  description: string;
  quantity: number;
  unitPriceMinor: number;
  discountPercent?: number;
  taxRatePercent?: number;
}

export interface SeedInvoice {
  id: string;
  invoiceNumber: string;
  clientId: string;
  status: 'draft' | 'sent' | 'partially_paid' | 'paid' | 'overdue';
  issueDate: string;
  dueDate: string;
  currency: 'KES';
  amountPaidMinor: number;
  notes: string;
  terms: string;
  lineItems: SeedLineItem[];
  payments?: Array<{
    amountMinor: number;
    paymentDate: string;
    method: 'mpesa' | 'bank' | 'cash' | 'card' | 'cheque' | 'other';
    reference: string;
    notes: string;
  }>;
}

export interface SeedExpense {
  id: string;
  category: 'office' | 'travel' | 'equipment' | 'software' | 'utilities' | 'subcontractor' | 'marketing' | 'other';
  description: string;
  amountMinor: number;
  currency: 'KES';
  date: string;
  notes: string;
}

export const SEED_CLIENTS: SeedClient[] = [
  {
    id: 'cli-safaricom',
    name: 'Safaricom Enterprise Solutions Ltd',
    email: 'billing@safaricom.co.ke',
    phone: '+254722000000',
    address: 'Safaricom HQ, Waiyaki Way, Westlands, Nairobi',
    taxPin: 'P051123456A',
    notes: 'Key Account: Daraja API and USSD integrations. Payment via RTGS/Bank.'
  },
  {
    id: 'cli-kcb',
    name: 'KCB Bank Group (Technology Division)',
    email: 'procurement.it@kcbgroup.com',
    phone: '+254711087000',
    address: 'Kencom House, 8th Floor, Moi Avenue, Nairobi CBD',
    taxPin: 'P000654321C',
    notes: 'Core banking and open finance APIs. Net 30 payment terms.'
  },
  {
    id: 'cli-twiga',
    name: 'Twiga Foods Kenya Ltd',
    email: 'accounts.payable@twigafoods.co.ke',
    phone: '+254712345678',
    address: 'Riverside Drive, Westlands, Nairobi',
    taxPin: 'P051987654B',
    notes: 'Supply chain logistics, cold-chain telemetry & driver dispatch app.'
  },
  {
    id: 'cli-mkopa',
    name: 'M-KOPA Solar Kenya Ltd',
    email: 'finance.ke@m-kopa.com',
    phone: '+254700112233',
    address: 'Chaka Road, Kilimani, Nairobi',
    taxPin: 'P051445566D',
    notes: 'IoT telemetry parsers & automated pay-as-you-go customer gateways.'
  },
  {
    id: 'cli-wasoko',
    name: 'Wasoko Logistics Ltd',
    email: 'invoices@wasoko.com',
    phone: '+254799887766',
    address: 'Enterprise Road, Industrial Area, Nairobi',
    taxPin: 'P051887799E',
    notes: 'Warehouse inventory management and B2B ordering portal.'
  },
  {
    id: 'cli-afyamed',
    name: 'AfyaMed Diagnostics Center',
    email: 'accounts@afyamed.co.ke',
    phone: '+254719223344',
    address: '5th Avenue Office Suites, Ngong Road, Upper Hill, Nairobi',
    taxPin: 'P051556677H',
    notes: 'Electronic Medical Records (EMR) integration & laboratory HL7 bridge.'
  },
  {
    id: 'cli-java',
    name: 'Nairobi Java House Ltd',
    email: 'finance@javahouseafrica.com',
    phone: '+254720998877',
    address: 'ABC Place, Waiyaki Way, Nairobi',
    taxPin: 'P051667788G',
    notes: 'Point of sale loyalty systems and till reconciliation software.'
  },
  {
    id: 'cli-amani',
    name: 'Amani Creative Agency',
    email: 'hello@amanicreative.co.ke',
    phone: '+254733445566',
    address: 'The Junction, Ngong Road, Nairobi',
    taxPin: 'P051332211F',
    notes: 'Creative studio retainer. Monthly cloud hosting and DevOps.'
  }
];

export const SEED_INVOICES: SeedInvoice[] = [
  {
    id: 'inv-2026-0001',
    invoiceNumber: 'INV-2026-0001',
    clientId: 'cli-kcb',
    status: 'paid',
    issueDate: '2026-01-15',
    dueDate: '2026-02-15',
    currency: 'KES',
    amountPaidMinor: 58000000, // 580,000 KES fully settled
    notes: 'Payable via KCB Bank Transfer or Safaricom Paybill: 247247, Account: INV-2026-0001.',
    terms: 'Payment received in full. Thank you for partnering with us.',
    lineItems: [
      {
        description: 'Core Banking API Integration & Microservices High-Availability Architecture',
        quantity: 1,
        unitPriceMinor: 35000000, // 350,000 KES
        taxRatePercent: 16
      },
      {
        description: 'Disaster Recovery Failover Audit & Automated PostgreSQL/SQLite Replication',
        quantity: 1,
        unitPriceMinor: 15000000, // 150,000 KES
        taxRatePercent: 16
      }
    ],
    payments: [
      {
        amountMinor: 58000000,
        paymentDate: '2026-02-10T11:30:00Z',
        method: 'bank',
        reference: 'KCB-RTGS-992819',
        notes: 'Full settlement via corporate wire transfer.'
      }
    ]
  },
  {
    id: 'inv-2026-0002',
    invoiceNumber: 'INV-2026-0002',
    clientId: 'cli-safaricom',
    status: 'paid',
    issueDate: '2026-02-01',
    dueDate: '2026-03-03',
    currency: 'KES',
    amountPaidMinor: 60320000, // 603,200 KES fully settled
    notes: 'Settled to Standard Chartered Bank Nairobi, Swift: SCBLKENX.',
    terms: 'Payment terms: Net 30 days from date of invoice.',
    lineItems: [
      {
        description: 'Daraja M-Pesa API V3 Migration & Stress Load Testing (80 Engineering Hours)',
        quantity: 80,
        unitPriceMinor: 500000, // 5,000 KES/hr = 400,000 KES
        taxRatePercent: 16
      },
      {
        description: 'High-Concurrency USSD Gateway Timeout & Session Redundancy Module',
        quantity: 1,
        unitPriceMinor: 12000000, // 120,000 KES
        taxRatePercent: 16
      }
    ],
    payments: [
      {
        amountMinor: 60320000,
        paymentDate: '2026-02-28T09:15:00Z',
        method: 'mpesa',
        reference: 'QBK8947K12',
        notes: 'Corporate M-Pesa settlement confirmation.'
      }
    ]
  },
  {
    id: 'inv-2026-0003',
    invoiceNumber: 'INV-2026-0003',
    clientId: 'cli-wasoko',
    status: 'overdue',
    issueDate: '2026-02-20',
    dueDate: '2026-03-22', // Overdue
    currency: 'KES',
    amountPaidMinor: 0,
    notes: 'Overdue Notice: Second reminder. Payable to NCBA Bank, Acc: 1002938491.',
    terms: 'Late payments attract a 2% monthly fee per Kenyan commercial standards.',
    lineItems: [
      {
        description: 'Warehouse Inventory Barcode Scanning Progressive Web App',
        quantity: 1,
        unitPriceMinor: 16000000, // 160,000 KES
        taxRatePercent: 16
      },
      {
        description: 'Delivery Route Clustering Microservice & Geofencing Verification',
        quantity: 1,
        unitPriceMinor: 14000000, // 140,000 KES
        taxRatePercent: 16
      }
    ]
  },
  {
    id: 'inv-2026-0004',
    invoiceNumber: 'INV-2026-0004',
    clientId: 'cli-twiga',
    status: 'partially_paid',
    issueDate: '2026-03-10',
    dueDate: '2026-04-10',
    currency: 'KES',
    amountPaidMinor: 30000000, // 300,000 KES paid, balance remaining
    notes: 'Settlement via M-Pesa Paybill: 522522, Account: INV-2026-0004.',
    terms: 'Balance due upon milestone 2 delivery acceptance.',
    lineItems: [
      {
        description: 'Cold-Chain IoT Sensor Telemetry Pipeline & Real-Time Alerting Dashboard',
        quantity: 1,
        unitPriceMinor: 28000000, // 280,000 KES
        taxRatePercent: 16
      },
      {
        description: 'Fleet Driver Mobile Dispatch App (Offline Sync & Location Tracking)',
        quantity: 1,
        unitPriceMinor: 22000000, // 220,000 KES
        discountPercent: 5, // 5% discount
        taxRatePercent: 16
      }
    ],
    payments: [
      {
        amountMinor: 30000000,
        paymentDate: '2026-03-24T14:20:00Z',
        method: 'bank',
        reference: 'EQUITY-TR-782910',
        notes: '50% project kickoff deposit.'
      }
    ]
  },
  {
    id: 'inv-2026-0005',
    invoiceNumber: 'INV-2026-0005',
    clientId: 'cli-mkopa',
    status: 'sent',
    issueDate: '2026-04-05',
    dueDate: '2026-05-05',
    currency: 'KES',
    amountPaidMinor: 0,
    notes: 'Please remit payment via Safaricom Paybill: 247247, Account: 0712345678.',
    terms: 'Payment is due within 30 days of issue date.',
    lineItems: [
      {
        description: 'Solar Inverter Firmware Telemetry Parser & Edge SQLite Sync Service',
        quantity: 1,
        unitPriceMinor: 18000000, // 180,000 KES
        taxRatePercent: 16
      },
      {
        description: 'Automated Customer Billing SMS Dispatch Gateway with Delivery Receipts',
        quantity: 1,
        unitPriceMinor: 9500000, // 95,000 KES
        taxRatePercent: 16
      }
    ]
  },
  {
    id: 'inv-2026-0006',
    invoiceNumber: 'INV-2026-0006',
    clientId: 'cli-afyamed',
    status: 'paid',
    issueDate: '2026-04-15',
    dueDate: '2026-05-15',
    currency: 'KES',
    amountPaidMinor: 21460000, // 214,600 KES fully settled
    notes: 'Paid via M-Pesa Express to Paybill 247247.',
    terms: 'Healthcare partner terms: Settled within 10 days.',
    lineItems: [
      {
        description: 'Electronic Medical Records (EMR) Biometric Staff Authentication Module',
        quantity: 1,
        unitPriceMinor: 12000000, // 120,000 KES
        taxRatePercent: 16
      },
      {
        description: 'Laboratory Automated Machine HL7 Interface Parser & Sync Daemon',
        quantity: 1,
        unitPriceMinor: 6500000, // 65,000 KES
        taxRatePercent: 16
      }
    ],
    payments: [
      {
        amountMinor: 21460000,
        paymentDate: '2026-04-25T16:45:00Z',
        method: 'mpesa',
        reference: 'RC9481LK22',
        notes: 'M-Pesa business confirmation for AfyaMed.'
      }
    ]
  },
  {
    id: 'inv-2026-0007',
    invoiceNumber: 'INV-2026-0007',
    clientId: 'cli-java',
    status: 'sent',
    issueDate: '2026-04-28',
    dueDate: '2026-05-28',
    currency: 'KES',
    amountPaidMinor: 0,
    notes: 'Payment via Safaricom Till Number: 888999 (Buy Goods) or Stanbic Bank.',
    terms: 'Payment due on or before 28th May 2026.',
    lineItems: [
      {
        description: 'Loyalty Rewards Tablet App UI Modernization & Barcode Loyalty Integration',
        quantity: 1,
        unitPriceMinor: 12500000, // 125,000 KES
        taxRatePercent: 16
      },
      {
        description: 'Safaricom M-Pesa Express (STK Push) Till 888999 Direct POS Integration',
        quantity: 1,
        unitPriceMinor: 7500000, // 75,000 KES
        taxRatePercent: 16
      }
    ]
  },
  {
    id: 'inv-2026-0008',
    invoiceNumber: 'INV-2026-0008',
    clientId: 'cli-amani',
    status: 'draft',
    issueDate: '2026-05-02',
    dueDate: '2026-06-02',
    currency: 'KES',
    amountPaidMinor: 0,
    notes: 'Draft estimate for Q2 campaign development & media portal.',
    terms: 'Estimate valid for 30 calendar days from issue date.',
    lineItems: [
      {
        description: 'Interactive Brand Portal with High-Performance 3D Product Configurator',
        quantity: 1,
        unitPriceMinor: 9500000, // 95,000 KES
        taxRatePercent: 16
      },
      {
        description: 'Monthly Cloud Infrastructure Maintenance & SLA Performance Retainer',
        quantity: 1,
        unitPriceMinor: 3000000, // 30,000 KES
        taxRatePercent: 16
      }
    ]
  },
  {
    id: 'inv-2026-0009',
    invoiceNumber: 'INV-2026-0009',
    clientId: 'cli-safaricom',
    status: 'sent',
    issueDate: '2026-05-10',
    dueDate: '2026-06-10',
    currency: 'KES',
    amountPaidMinor: 0,
    notes: 'Payment via RTGS to Standard Chartered Bank Kenya, Account: 01020304050.',
    terms: 'Net 30 days corporate invoice terms.',
    lineItems: [
      {
        description: 'Cloud Architecture & Microservices Refactoring Consulting Sprint (2 Weeks)',
        quantity: 2,
        unitPriceMinor: 30000000, // 300,000 KES each = 600,000 KES
        discountPercent: 10, // 10% volume discount = 60,000 KES off
        taxRatePercent: 16
      },
      {
        description: 'Kubernetes Cluster Hardening, mTLS Mesh & Automated CI/CD Pipelines',
        quantity: 1,
        unitPriceMinor: 15000000, // 150,000 KES
        taxRatePercent: 16
      }
    ]
  }
];

export const SEED_EXPENSES: SeedExpense[] = [
  {
    id: 'exp-001',
    category: 'software',
    description: 'GitHub Enterprise, AWS Cloud Hosting & Vercel Pro Subscriptions',
    amountMinor: 2450000, // 24,500 KES
    currency: 'KES',
    date: '2026-01-05',
    notes: 'Monthly engineering cloud tool stack.'
  },
  {
    id: 'exp-002',
    category: 'office',
    description: 'Nairobi Garage (Kilimani) Dedicated Office Desk Membership',
    amountMinor: 2500000, // 25,000 KES
    currency: 'KES',
    date: '2026-02-01',
    notes: 'Monthly co-working space rental.'
  },
  {
    id: 'exp-003',
    category: 'utilities',
    description: 'Safaricom Fibre for Business 100Mbps Dedicated Line',
    amountMinor: 999900, // 9,999 KES
    currency: 'KES',
    date: '2026-02-15',
    notes: 'High-speed fiber connectivity for video conferencing and deployments.'
  },
  {
    id: 'exp-004',
    category: 'equipment',
    description: 'Apple MacBook Pro M3 Stand & Ergonomic Dual Monitor Mount',
    amountMinor: 1850000, // 18,500 KES
    currency: 'KES',
    date: '2026-03-02',
    notes: 'Workstation ergonomic upgrade.'
  },
  {
    id: 'exp-005',
    category: 'travel',
    description: 'Client Onsite Transport & Parking (Westlands, CBD, Industrial Area)',
    amountMinor: 480000, // 4,800 KES
    currency: 'KES',
    date: '2026-03-20',
    notes: 'Uber business trips for client architecture meetings.'
  },
  {
    id: 'exp-006',
    category: 'subcontractor',
    description: 'Senior UI/UX Designer Contractor (Twiga Mobile Dispatch App Wireframes)',
    amountMinor: 4500000, // 45,000 KES
    currency: 'KES',
    date: '2026-03-28',
    notes: 'Contract design milestone settlement.'
  },
  {
    id: 'exp-007',
    category: 'marketing',
    description: 'Google Workspace for Business & Domain Registrations (.co.ke)',
    amountMinor: 720000, // 7,200 KES
    currency: 'KES',
    date: '2026-04-10',
    notes: 'Domain names and enterprise email suites.'
  },
  {
    id: 'exp-008',
    category: 'other',
    description: 'Institute of Software Engineers Kenya (ISEK) Annual Membership',
    amountMinor: 1500000, // 15,000 KES
    currency: 'KES',
    date: '2026-04-18',
    notes: 'Professional engineering body subscription.'
  }
];

export const SEED_BUSINESS_PROFILE = {
  id: 'biz-profile-main',
  name: 'Chris Njihia Consulting (Software Engineering)',
  taxPin: 'P051999888K',
  address: 'Delta Corner Tower, Westlands, Nairobi, Kenya',
  phone: '+254712345678',
  email: 'chris@invoicestudio.local',
  logoPath: '',
  bankDetails: 'NCBA Bank Kenya | Acc: 1002938491 | Westlands Branch',
  mpesaPaybill: '247247',
  mpesaAccount: 'INV-STUDIO',
  mpesaTill: '888999',
  defaultCurrency: 'KES',
  defaultTaxRate: 16
};

/**
 * Seeds the database with rich, realistic Kenyan freelance/SME data.
 * Can be run automatically on fresh database initialization or explicitly triggered.
 */
export function seedDatabase(
  db: Database.Database,
  forceReset = false
): { clientCount: number; invoiceCount: number; expenseCount: number } {
  const clientCount = (db.prepare('SELECT COUNT(*) as count FROM clients').get() as { count: number }).count;

  if (clientCount > 0 && !forceReset) {
    const invoiceCount = (db.prepare('SELECT COUNT(*) as count FROM invoices').get() as { count: number }).count;
    const expenseCount = (db.prepare('SELECT COUNT(*) as count FROM expenses').get() as { count: number }).count;
    return { clientCount, invoiceCount, expenseCount };
  }

  const transaction = db.transaction(() => {
    if (forceReset) {
      db.prepare('DELETE FROM invoice_items').run();
      db.prepare('DELETE FROM payments').run();
      db.prepare('DELETE FROM invoices').run();
      db.prepare('DELETE FROM expenses').run();
      db.prepare('DELETE FROM clients').run();
      db.prepare('DELETE FROM invoice_sequences').run();
      db.prepare('DELETE FROM business_profile').run();
    }

    const now = new Date().toISOString();

    // 1. Insert Business Profile
    db.prepare(`
      INSERT OR REPLACE INTO business_profile (
        id, name, tax_pin, address, phone, email, logo_path,
        bank_details, mpesa_paybill, mpesa_account, mpesa_till,
        default_currency, default_tax_rate, created_at, updated_at
      ) VALUES (
        @id, @name, @taxPin, @address, @phone, @email, @logoPath,
        @bankDetails, @mpesaPaybill, @mpesaAccount, @mpesaTill,
        @defaultCurrency, @defaultTaxRate, @createdAt, @updatedAt
      )
    `).run({
      ...SEED_BUSINESS_PROFILE,
      createdAt: now,
      updatedAt: now
    });

    // 2. Insert Clients
    const insertClient = db.prepare(`
      INSERT OR REPLACE INTO clients (
        id, name, email, phone, address, tax_pin, notes, created_at, updated_at
      ) VALUES (
        @id, @name, @email, @phone, @address, @taxPin, @notes, @createdAt, @updatedAt
      )
    `);

    for (const client of SEED_CLIENTS) {
      insertClient.run({
        ...client,
        createdAt: now,
        updatedAt: now
      });
    }

    // 3. Insert Invoices & Line Items
    const insertInvoice = db.prepare(`
      INSERT OR REPLACE INTO invoices (
        id, invoice_number, client_id, status, issue_date, due_date,
        currency, subtotal_minor, tax_total_minor, discount_total_minor,
        total_minor, amount_paid_minor, notes, terms, created_at, updated_at
      ) VALUES (
        @id, @invoiceNumber, @clientId, @status, @issueDate, @dueDate,
        @currency, @subtotalMinor, @taxTotalMinor, @discountTotalMinor,
        @totalMinor, @amountPaidMinor, @notes, @terms, @createdAt, @updatedAt
      )
    `);

    const insertItem = db.prepare(`
      INSERT INTO invoice_items (
        id, invoice_id, description, quantity, unit_price_minor,
        discount_percent, tax_rate_percent, subtotal_minor, discount_minor,
        tax_minor, total_minor, created_at
      ) VALUES (
        @id, @invoiceId, @description, @quantity, @unitPriceMinor,
        @discountPercent, @taxRatePercent, @subtotalMinor, @discountMinor,
        @taxMinor, @totalMinor, @createdAt
      )
    `);

    const insertPayment = db.prepare(`
      INSERT INTO payments (
        id, invoice_id, amount_minor, currency, payment_date,
        method, reference, notes, created_at
      ) VALUES (
        @id, @invoiceId, @amountMinor, @currency, @paymentDate,
        @method, @reference, @notes, @createdAt
      )
    `);

    for (const inv of SEED_INVOICES) {
      const totals = calculateInvoiceTotals(inv.lineItems, inv.amountPaidMinor);

      insertInvoice.run({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        clientId: inv.clientId,
        status: inv.status,
        issueDate: inv.issueDate,
        dueDate: inv.dueDate,
        currency: inv.currency,
        subtotalMinor: totals.subtotalMinor,
        taxTotalMinor: totals.taxTotalMinor,
        discountTotalMinor: totals.discountTotalMinor,
        totalMinor: totals.totalMinor,
        amountPaidMinor: inv.amountPaidMinor,
        notes: inv.notes,
        terms: inv.terms,
        createdAt: `${inv.issueDate}T08:00:00Z`,
        updatedAt: `${inv.issueDate}T08:00:00Z`
      });

      for (let idx = 0; idx < inv.lineItems.length; idx++) {
        const item = inv.lineItems[idx];
        const itemCalc = calculateLineItemTotals(
          item.quantity,
          item.unitPriceMinor,
          item.discountPercent ?? 0,
          item.taxRatePercent ?? 16
        );

        insertItem.run({
          id: `li-${inv.id}-${idx + 1}`,
          invoiceId: inv.id,
          description: item.description,
          quantity: item.quantity,
          unitPriceMinor: item.unitPriceMinor,
          discountPercent: item.discountPercent ?? 0,
          taxRatePercent: item.taxRatePercent ?? 16,
          subtotalMinor: itemCalc.subtotalMinor,
          discountMinor: itemCalc.discountMinor,
          taxMinor: itemCalc.taxMinor,
          totalMinor: itemCalc.totalMinor,
          createdAt: `${inv.issueDate}T08:00:00Z`
        });
      }

      if (inv.payments) {
        for (let pIdx = 0; pIdx < inv.payments.length; pIdx++) {
          const pay = inv.payments[pIdx];
          insertPayment.run({
            id: `pay-${inv.id}-${pIdx + 1}`,
            invoiceId: inv.id,
            amountMinor: pay.amountMinor,
            currency: inv.currency,
            paymentDate: pay.paymentDate,
            method: pay.method,
            reference: pay.reference,
            notes: pay.notes,
            createdAt: pay.paymentDate
          });
        }
      }
    }

    // 4. Update Sequence Counter for 2026 to the highest seeded invoice sequence (9)
    db.prepare(`
      INSERT OR REPLACE INTO invoice_sequences (year, last_sequence, updated_at)
      VALUES (2026, 9, @updatedAt)
    `).run({
      updatedAt: now
    });

    // 5. Insert Expenses
    const insertExpense = db.prepare(`
      INSERT OR REPLACE INTO expenses (
        id, category, description, amount_minor, currency,
        date, receipt_hash, receipt_name, receipt_mime, notes,
        created_at, updated_at
      ) VALUES (
        @id, @category, @description, @amountMinor, @currency,
        @date, NULL, NULL, NULL, @notes, @createdAt, @updatedAt
      )
    `);

    for (const exp of SEED_EXPENSES) {
      insertExpense.run({
        ...exp,
        createdAt: `${exp.date}T10:00:00Z`,
        updatedAt: `${exp.date}T10:00:00Z`
      });
    }
  });

  transaction();
  console.info(
    `[Database] Seeded ${SEED_CLIENTS.length} Kenyan clients, ${SEED_INVOICES.length} invoices, and ${SEED_EXPENSES.length} expenses successfully.`
  );

  return {
    clientCount: SEED_CLIENTS.length,
    invoiceCount: SEED_INVOICES.length,
    expenseCount: SEED_EXPENSES.length
  };
}
