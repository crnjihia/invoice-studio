// path: src/main/index.ts
import { app, BrowserWindow, ipcMain } from 'electron';
import { createMainWindow, handleExternalUrl } from './windows/mainWindow';
import { getDatabase, initializeDatabase } from './db/connection';
import { registerBackupHandlers } from './ipc/handlers/backupHandlers';
import { registerClientHandlers } from './ipc/handlers/clientHandlers';
import { registerInvoiceHandlers } from './ipc/handlers/invoiceHandlers';
import { registerPdfHandlers } from './ipc/handlers/pdfHandlers';
import { registerExpenseHandlers } from './ipc/handlers/expenseHandlers';
import { registerPaymentHandlers } from './ipc/handlers/paymentHandlers';
import { registerReportHandlers } from './ipc/handlers/reportHandlers';
import { registerOfflineHandlers } from './ipc/handlers/offlineHandlers';
import { registerUpdateHandlers } from './ipc/handlers/updateHandlers';
import { checkAndMarkOverdueInvoices } from './services/overdueService';
import { setupAppMenu } from './menu';
import { createAppTray, destroyAppTray } from './tray';

// Enforce single instance lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  let mainWindow: BrowserWindow | null = null;

  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    // 1. Initialize SQLite database with WAL and migrations
    await initializeDatabase();

    // 2. Base platform IPC handlers
    ipcMain.handle('app:get-version', () => app.getVersion());
    ipcMain.handle('app:get-platform', () => process.platform);
    ipcMain.handle('app:open-external', (_event, url: unknown) => {
      if (typeof url === 'string') {
        return handleExternalUrl(url);
      }
      return false;
    });

    // 3. Register Domain IPC Handlers
    registerBackupHandlers();
    registerClientHandlers();
    registerInvoiceHandlers();
    registerPdfHandlers();
    registerExpenseHandlers();
    registerPaymentHandlers();
    registerReportHandlers();
    registerOfflineHandlers();
    registerUpdateHandlers();

    // 4. Run automated overdue detection on startup
    try {
      checkAndMarkOverdueInvoices(getDatabase());
    } catch (err) {
      console.warn('[Startup] Overdue invoice check warning:', err);
    }

    // 5. Create primary window
    mainWindow = createMainWindow();

    // 6. Setup native application menu and system tray
    setupAppMenu(mainWindow);
    createAppTray(mainWindow);

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        mainWindow = createMainWindow();
        setupAppMenu(mainWindow);
      }
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      destroyAppTray();
      app.quit();
    }
  });

  app.on('before-quit', () => {
    destroyAppTray();
  });
}
