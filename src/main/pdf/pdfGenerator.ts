// path: src/main/pdf/pdfGenerator.ts
import { BrowserWindow } from 'electron';

export interface PrintToPdfOptions {
  pageSize?: 'A4' | 'Letter';
  printBackground?: boolean;
}

/**
 * Renders an HTML string into an A4 PDF Buffer using a hidden, hardened BrowserWindow.
 */
export async function renderHtmlToPdf(
  htmlContent: string,
  options: PrintToPdfOptions = {}
): Promise<Buffer> {
  const window = new BrowserWindow({
    show: false,
    width: 800,
    height: 1100,
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      nodeIntegrationInWorker: false,
      nodeIntegrationInSubFrames: false,
      webSecurity: true,
      allowRunningInsecureContent: false
    }
  });

  try {
    const encodedHtml = `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`;

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('PDF generation timed out waiting for page to load.'));
      }, 15000);

      window.webContents.once('did-finish-load', () => {
        clearTimeout(timeout);
        resolve();
      });

      window.webContents.once('did-fail-load', (_event, errorCode, errorDescription) => {
        clearTimeout(timeout);
        reject(new Error(`Failed to load PDF template: [${errorCode}] ${errorDescription}`));
      });

      window.loadURL(encodedHtml).catch(reject);
    });

    const pdfBuffer = await window.webContents.printToPDF({
      pageSize: options.pageSize || 'A4',
      printBackground: options.printBackground !== false,
      margins: {
        marginType: 'none'
      }
    });

    return pdfBuffer;
  } finally {
    if (!window.isDestroyed()) {
      window.destroy();
    }
  }
}

