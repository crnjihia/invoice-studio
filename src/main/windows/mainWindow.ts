// path: src/main/windows/mainWindow.ts
import { BrowserWindow, shell } from 'electron';
import { join } from 'path';
import { getWindowState, trackWindowState } from './windowState';

const ALLOWED_EXTERNAL_SCHEMES = new Set(['http:', 'https:', 'mailto:']);

/**
 * Handles external URL dispatch securely using an explicit scheme allowlist.
 */
export function handleExternalUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (ALLOWED_EXTERNAL_SCHEMES.has(parsed.protocol)) {
      shell.openExternal(rawUrl).catch(err => {
        console.error('[Security] Failed to open external URL:', err.message);
      });
      return true;
    }
    console.warn(
      `[Security] Blocked navigation to unapproved external protocol: ${parsed.protocol}`
    );
    return false;
  } catch {
    console.warn(`[Security] Blocked invalid URL navigation attempt: ${rawUrl}`);
    return false;
  }
}

/**
 * Factory for creating the primary hardened BrowserWindow.
 * Enforces sandbox, context isolation, webSecurity, window state restoration, and navigation restrictions.
 */
export function createMainWindow(): BrowserWindow {
  const windowState = getWindowState();

  const mainWindow = new BrowserWindow({
    x: windowState.x,
    y: windowState.y,
    width: windowState.width,
    height: windowState.height,
    minWidth: 960,
    minHeight: 640,
    show: false,
    autoHideMenuBar: false,
    title: 'Invoice Studio',
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      nodeIntegrationInWorker: false,
      nodeIntegrationInSubFrames: false,
      webSecurity: true,
      allowRunningInsecureContent: false
    }
  });

  if (windowState.isMaximized) {
    mainWindow.maximize();
  }

  trackWindowState(mainWindow);

  // Strict CSP injection at session level
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none';"
        ]
      }
    });
  });

  // Prevent window.open and redirect allowed schemes to system handler
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    handleExternalUrl(url);
    return { action: 'deny' };
  });

  // Prevent unexpected internal window navigation
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const currentUrl = mainWindow.webContents.getURL();
    if (navigationUrl !== currentUrl) {
      event.preventDefault();
      handleExternalUrl(navigationUrl);
    }
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
  });

  // Load Vite dev server or production index.html
  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  return mainWindow;
}
