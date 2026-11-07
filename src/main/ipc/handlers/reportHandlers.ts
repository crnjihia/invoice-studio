// path: src/main/ipc/handlers/reportHandlers.ts
import { z } from 'zod';
import { ipcRegistry } from '../registry';
import { IPC_CHANNELS } from '@shared/channels';
import {
  ExportExpensesCsvSchema,
  ExportInvoicesCsvSchema,
  ReportFilterSchema
} from '@shared/schemas/report';
import { getDatabase } from '../../db/connection';
import {
  getExpensesByCategory,
  getFinancialSummary,
  getRevenueByMonth
} from '../../services/reportService';
import {
  generateExpensesCsv,
  generateInvoicesCsv,
  saveCsvFile
} from '../../services/csvExportService';
import { checkAndMarkOverdueInvoices } from '../../services/overdueService';

export function registerReportHandlers(): void {
  ipcRegistry.register(
    IPC_CHANNELS.REPORT.GET_FINANCIAL_SUMMARY,
    ReportFilterSchema,
    async input => {
      return getFinancialSummary(getDatabase(), input);
    }
  );

  ipcRegistry.register(
    IPC_CHANNELS.REPORT.GET_REVENUE_BY_MONTH,
    ReportFilterSchema,
    async input => {
      return getRevenueByMonth(getDatabase(), input);
    }
  );

  ipcRegistry.register(
    IPC_CHANNELS.REPORT.GET_EXPENSES_BY_CATEGORY,
    ReportFilterSchema,
    async input => {
      return getExpensesByCategory(getDatabase(), input);
    }
  );

  ipcRegistry.register(
    IPC_CHANNELS.REPORT.EXPORT_INVOICES_CSV,
    ExportInvoicesCsvSchema,
    async input => {
      const { csv } = generateInvoicesCsv(getDatabase(), input.filter);
      const defaultName = `invoices-export-${new Date().toISOString().split('T')[0]}.csv`;
      return await saveCsvFile(csv, defaultName, input.targetPath);
    }
  );

  ipcRegistry.register(
    IPC_CHANNELS.REPORT.EXPORT_EXPENSES_CSV,
    ExportExpensesCsvSchema,
    async input => {
      const { csv } = generateExpensesCsv(getDatabase(), input.filter);
      const defaultName = `expenses-export-${new Date().toISOString().split('T')[0]}.csv`;
      return await saveCsvFile(csv, defaultName, input.targetPath);
    }
  );

  ipcRegistry.register(IPC_CHANNELS.INVOICE.CHECK_OVERDUE, z.object({}), async () => {
    return checkAndMarkOverdueInvoices(getDatabase());
  });
}

