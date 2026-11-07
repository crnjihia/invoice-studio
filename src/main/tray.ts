// path: src/main/tray.ts
import { app, BrowserWindow, Menu, nativeImage, NativeImage, Tray } from 'electron';
import { existsSync } from 'fs';
import { join } from 'path';

let tray: Tray | null = null;

/**
 * Generates or loads the tray icon.
 * Falls back to an in-memory 16x16 icon so the app never throws even in dev/testing.
 */
function getTrayIcon(): NativeImage {
  const customIconPath = join(__dirname, '../../resources/tray-icon.png');
  if (existsSync(customIconPath)) {
    return nativeImage.createFromPath(customIconPath);
  }

  // 16x16 RGBA buffer fallback (a simple vibrant cyan-blue square icon)
  const size = 16;
  const buffer = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      // Border and fill pattern
      const isBorder = x === 0 || x === size - 1 || y === 0 || y === size - 1;
      buffer[idx] = isBorder ? 14 : 59; // R
      buffer[idx + 1] = isBorder ? 165 : 130; // G
      buffer[idx + 2] = isBorder ? 233 : 246; // B
      buffer[idx + 3] = 255; // Alpha
    }
  }

  return nativeImage.createFromBuffer(buffer, { width: size, height: size });
}

export function createAppTray(mainWindow: BrowserWindow): Tray {
  if (tray) return tray;

  const icon = getTrayIcon();
  tray = new Tray(icon);
  tray.setToolTip('Invoice Studio');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Invoice Studio',
      click: (): void => {
        if (!mainWindow.isDestroyed()) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    {
      label: 'New Invoice',
      click: (): void => {
        if (!mainWindow.isDestroyed()) {
          mainWindow.show();
          mainWindow.focus();
          mainWindow.webContents.send('menu:action', 'new-invoice');
        }
      }
    },
    {
      label: 'Backup Database Now',
      click: (): void => {
        if (!mainWindow.isDestroyed()) {
          mainWindow.webContents.send('menu:action', 'trigger-backup');
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: (): void => {
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (!mainWindow.isDestroyed()) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });

  return tray;
}

export function destroyAppTray(): void {
  if (tray) {
    tray.destroy();
    tray = null;
  }
}
