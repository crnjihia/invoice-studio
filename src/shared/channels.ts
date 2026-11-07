// path: src/shared/channels.ts
export const IPC_CHANNELS = {
  APP: {
    GET_VERSION: 'app:get-version',
    GET_PLATFORM: 'app:get-platform',
    OPEN_EXTERNAL: 'app:open-external'
  },
  CLIENT: {
    CREATE: 'client:create',
    GET: 'client:get',
    LIST: 'client:list',
    UPDATE: 'client:update',
    DELETE: 'client:delete'
  },
  INVOICE: {
    CREATE: 'invoice:create',
    GET: 'invoice:get',
    LIST: 'invoice:list',
    UPDATE: 'invoice:update',
    DELETE: 'invoice:delete',
    DUPLICATE: 'invoice:duplicate',
    CHECK_OVERDUE: 'invoice:check-overdue',
    GENERATE_PDF: 'invoice:generate-pdf',
    PREVIEW_PDF: 'invoice:preview-pdf',
    EXPORT_PDF: 'invoice:export-pdf',
    OPEN_PDF: 'invoice:open-pdf',
    REVEAL_PDF: 'invoice:reveal-pdf',
    PREPARE_EMAIL: 'invoice:prepare-email'
  },
  EXPENSE: {
    CREATE: 'expense:create',
    GET: 'expense:get',
    LIST: 'expense:list',
    UPDATE: 'expense:update',
    DELETE: 'expense:delete',
    SAVE_RECEIPT: 'expense:save-receipt',
    GET_RECEIPT_PATH: 'expense:get-receipt-path'
  },
  PAYMENT: {
    RECORD: 'payment:record',
    LIST_BY_INVOICE: 'payment:list-by-invoice',
    DELETE: 'payment:delete'
  },
  REPORT: {
    GET_FINANCIAL_SUMMARY: 'report:get-financial-summary',
    GET_REVENUE_BY_MONTH: 'report:get-revenue-by-month',
    GET_EXPENSES_BY_CATEGORY: 'report:get-expenses-by-category',
    EXPORT_INVOICES_CSV: 'report:export-invoices-csv',
    EXPORT_EXPENSES_CSV: 'report:export-expenses-csv'
  },
  BUSINESS: {
    GET_PROFILE: 'business:get-profile',
    UPDATE_PROFILE: 'business:update-profile'
  },
  BACKUP: {
    TRIGGER: 'backup:trigger',
    LIST: 'backup:list',
    SELECT_FOLDER: 'backup:select-folder',
    PREVIEW: 'backup:preview',
    RESTORE: 'backup:restore'
  },
  DRAFT: {
    SAVE_SNAPSHOT: 'draft:save-snapshot',
    LIST_RECOVERABLE: 'draft:list-recoverable',
    DISCARD_SNAPSHOT: 'draft:discard-snapshot'
  },
  NETWORK: {
    GET_STATUS: 'network:get-status'
  },
  UPDATE: {
    CHECK: 'update:check',
    START_DOWNLOAD: 'update:start-download',
    INSTALL: 'update:install',
    GET_STATUS: 'update:get-status'
  }
} as const;

export type IpcChannel =
  | (typeof IPC_CHANNELS.APP)[keyof typeof IPC_CHANNELS.APP]
  | (typeof IPC_CHANNELS.CLIENT)[keyof typeof IPC_CHANNELS.CLIENT]
  | (typeof IPC_CHANNELS.INVOICE)[keyof typeof IPC_CHANNELS.INVOICE]
  | (typeof IPC_CHANNELS.EXPENSE)[keyof typeof IPC_CHANNELS.EXPENSE]
  | (typeof IPC_CHANNELS.PAYMENT)[keyof typeof IPC_CHANNELS.PAYMENT]
  | (typeof IPC_CHANNELS.REPORT)[keyof typeof IPC_CHANNELS.REPORT]
  | (typeof IPC_CHANNELS.BUSINESS)[keyof typeof IPC_CHANNELS.BUSINESS]
  | (typeof IPC_CHANNELS.BACKUP)[keyof typeof IPC_CHANNELS.BACKUP]
  | (typeof IPC_CHANNELS.DRAFT)[keyof typeof IPC_CHANNELS.DRAFT]
  | (typeof IPC_CHANNELS.NETWORK)[keyof typeof IPC_CHANNELS.NETWORK]
  | (typeof IPC_CHANNELS.UPDATE)[keyof typeof IPC_CHANNELS.UPDATE];
