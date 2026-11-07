// path: src/main/services/reportService.ts
import Database from 'better-sqlite3';
import {
  CategoryExpenseSummary,
  ExpenseCategory,
  FinancialSummary,
  MonthlyRevenue,
  ReportFilter
} from '@shared/types';

export function getFinancialSummary(
  db: Database.Database,
  filter?: ReportFilter
): FinancialSummary {
  // Invoiced amounts (non-void)
  let invoicedQuery = "SELECT COALESCE(SUM(total_minor), 0) as total FROM invoices WHERE status != 'void'";
  const invoicedParams: unknown[] = [];
  if (filter?.startDate) {
    invoicedQuery += ' AND issue_date >= ?';
    invoicedParams.push(filter.startDate);
  }
  if (filter?.endDate) {
    invoicedQuery += ' AND issue_date <= ?';
    invoicedParams.push(filter.endDate);
  }
  const invoicedRow = db.prepare(invoicedQuery).get(...invoicedParams) as { total: number };

  // Revenue (collected payments)
  let revenueQuery = 'SELECT COALESCE(SUM(amount_minor), 0) as total FROM payments WHERE 1=1';
  const revenueParams: unknown[] = [];
  if (filter?.startDate) {
    revenueQuery += ' AND payment_date >= ?';
    revenueParams.push(filter.startDate);
  }
  if (filter?.endDate) {
    revenueQuery += ' AND payment_date <= ?';
    revenueParams.push(filter.endDate);
  }
  const revenueRow = db.prepare(revenueQuery).get(...revenueParams) as { total: number };

  // Outstanding amounts
  let outstandingQuery = `
    SELECT COALESCE(SUM(total_minor - amount_paid_minor), 0) as total
    FROM invoices
    WHERE status IN ('sent', 'partially_paid', 'overdue')
  `;
  const outstandingParams: unknown[] = [];
  if (filter?.startDate) {
    outstandingQuery += ' AND issue_date >= ?';
    outstandingParams.push(filter.startDate);
  }
  if (filter?.endDate) {
    outstandingQuery += ' AND issue_date <= ?';
    outstandingParams.push(filter.endDate);
  }
  const outstandingRow = db.prepare(outstandingQuery).get(...outstandingParams) as { total: number };

  // Expenses
  let expensesQuery = 'SELECT COALESCE(SUM(amount_minor), 0) as total FROM expenses WHERE 1=1';
  const expensesParams: unknown[] = [];
  if (filter?.startDate) {
    expensesQuery += ' AND date >= ?';
    expensesParams.push(filter.startDate);
  }
  if (filter?.endDate) {
    expensesQuery += ' AND date <= ?';
    expensesParams.push(filter.endDate);
  }
  const expensesRow = db.prepare(expensesQuery).get(...expensesParams) as { total: number };

  // Invoice status counts
  const countsRow = db
    .prepare(`
      SELECT
        COUNT(CASE WHEN status IN ('sent', 'partially_paid', 'overdue') THEN 1 END) as active_count,
        COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_count
      FROM invoices
    `)
    .get() as { active_count: number; paid_count: number };

  const totalRevenueMinor = revenueRow.total;
  const totalExpensesMinor = expensesRow.total;
  const estimatedProfitMinor = totalRevenueMinor - totalExpensesMinor;

  return {
    totalInvoicedMinor: invoicedRow.total,
    totalRevenueMinor,
    totalOutstandingMinor: outstandingRow.total,
    totalExpensesMinor,
    estimatedProfitMinor,
    activeInvoicesCount: countsRow.active_count,
    paidInvoicesCount: countsRow.paid_count
  };
}

export function getRevenueByMonth(
  db: Database.Database,
  filter?: ReportFilter
): MonthlyRevenue[] {
  let query = `
    SELECT
      strftime('%Y-%m', payment_date) as month,
      SUM(amount_minor) as revenue_minor,
      COUNT(*) as payments_count
    FROM payments
    WHERE 1=1
  `;
  const params: unknown[] = [];

  if (filter?.startDate) {
    query += ' AND payment_date >= ?';
    params.push(filter.startDate);
  }
  if (filter?.endDate) {
    query += ' AND payment_date <= ?';
    params.push(filter.endDate);
  }

  query += `
    GROUP BY strftime('%Y-%m', payment_date)
    ORDER BY month ASC
  `;

  interface MonthRow {
    month: string;
    revenue_minor: number;
    payments_count: number;
  }

  const rows = db.prepare(query).all(...params) as MonthRow[];

  return rows.map(r => ({
    month: r.month,
    revenueMinor: r.revenue_minor,
    paymentsCount: r.payments_count
  }));
}

export function getExpensesByCategory(
  db: Database.Database,
  filter?: ReportFilter
): CategoryExpenseSummary[] {
  let query = `
    SELECT
      category,
      SUM(amount_minor) as total_minor,
      COUNT(*) as count
    FROM expenses
    WHERE 1=1
  `;
  const params: unknown[] = [];

  if (filter?.startDate) {
    query += ' AND date >= ?';
    params.push(filter.startDate);
  }
  if (filter?.endDate) {
    query += ' AND date <= ?';
    params.push(filter.endDate);
  }

  query += `
    GROUP BY category
    ORDER BY total_minor DESC
  `;

  interface CategoryRow {
    category: string;
    total_minor: number;
    count: number;
  }

  const rows = db.prepare(query).all(...params) as CategoryRow[];

  return rows.map(r => ({
    category: r.category as ExpenseCategory,
    totalMinor: r.total_minor,
    count: r.count
  }));
}

