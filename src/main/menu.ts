// path: src/main/menu.ts
import { app, BrowserWindow, dialog, Menu, MenuItemConstructorOptions } from 'electron';

export function setupAppMenu(mainWindow: BrowserWindow): void {
  const isMac = process.platform === 'darwin';

  const sendMenuAction = (action: string): void => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('menu:action', action);
    }
  };

  const template: MenuItemConstructorOptions[] = [
    ...(isMac
      ? ([
          {
            label: app.name,
            submenu: [
              { role: 'about' },
              { type: 'separator' },
              { role: 'services' },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'hideOthers' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit' }
            ]
          }
        ] as MenuItemConstructorOptions[])
      : []),
    {
      label: '&File',
      submenu: [
        {
          label: 'New Invoice',
          accelerator: 'CmdOrCtrl+N',
          click: (): void => sendMenuAction('new-invoice')
        },
        {
          label: 'New Client',
          accelerator: 'CmdOrCtrl+Shift+C',
          click: (): void => sendMenuAction('new-client')
        },
        {
          label: 'Save Draft',
          accelerator: 'CmdOrCtrl+S',
          click: (): void => sendMenuAction('save-draft')
        },
        { type: 'separator' },
        {
          label: 'Backup Database Now',
          click: (): void => sendMenuAction('trigger-backup')
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },
    {
      label: '&Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: '&View',
      submenu: [
        {
          label: 'Search Invoices / Clients',
          accelerator: 'CmdOrCtrl+F',
          click: (): void => sendMenuAction('focus-search')
        },
        {
          label: 'Toggle Dark Mode',
          accelerator: 'CmdOrCtrl+Shift+D',
          click: (): void => sendMenuAction('toggle-theme')
        },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: '&Navigate',
      submenu: [
        {
          label: 'Invoices',
          accelerator: 'CmdOrCtrl+1',
          click: (): void => sendMenuAction('nav-invoices')
        },
        {
          label: 'Clients',
          accelerator: 'CmdOrCtrl+2',
          click: (): void => sendMenuAction('nav-clients')
        },
        {
          label: 'Backups & Recovery',
          accelerator: 'CmdOrCtrl+3',
          click: (): void => sendMenuAction('nav-backups')
        }
      ]
    },
    {
      label: '&Help',
      submenu: [
        {
          label: 'About Invoice Studio',
          click: (): void => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About Invoice Studio',
              message: `Invoice Studio v${app.getVersion()}`,
              detail:
                'Offline-first Invoicing & Expense Desktop Studio for Freelancers.\n\n' +
                'Built for Kenyan Freelancers (Nairobi, Africa/Nairobi).\n' +
                'Default Currency: KES | VAT: 16% | Integer Minor-Unit Math.\n\n' +
                'Note: KRA eTIMS e-invoicing compliance is not included and this software makes no claim of statutory tax compliance.'
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

