// path: src/main/windows/windowState.ts
import { app, BrowserWindow, screen } from 'electron';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

export interface WindowState {
  x?: number;
  y?: number;
  width: number;
  height: number;
  isMaximized: boolean;
}

const DEFAULT_STATE: WindowState = {
  width: 1280,
  height: 800,
  isMaximized: false
};

const STATE_FILE = 'window-state.json';

function getStateFilePath(): string {
  return join(app.getPath('userData'), STATE_FILE);
}

/**
 * Validates whether the given coordinate falls within the bounds of any connected display.
 */
function isPositionOnAnyDisplay(x: number, y: number, width: number, height: number): boolean {
  const displays = screen.getAllDisplays();
  return displays.some(display => {
    const { bounds } = display;
    return (
      x >= bounds.x - 10 &&
      y >= bounds.y - 10 &&
      x + width <= bounds.x + bounds.width + 10 &&
      y + height <= bounds.y + bounds.height + 10
    );
  });
}

/**
 * Loads the saved window bounds from disk and validates them against active displays.
 */
export function getWindowState(): WindowState {
  try {
    const filePath = getStateFilePath();
    if (existsSync(filePath)) {
      const data = JSON.parse(readFileSync(filePath, 'utf-8')) as WindowState;
      const width = Number.isInteger(data.width) && data.width >= 960 ? data.width : DEFAULT_STATE.width;
      const height =
        Number.isInteger(data.height) && data.height >= 640 ? data.height : DEFAULT_STATE.height;
      const isMaximized = Boolean(data.isMaximized);

      if (
        data.x !== undefined &&
        data.y !== undefined &&
        isPositionOnAnyDisplay(data.x, data.y, width, height)
      ) {
        return { x: data.x, y: data.y, width, height, isMaximized };
      }

      return { width, height, isMaximized };
    }
  } catch (err) {
    console.warn('[WindowState] Failed to load window state, falling back to defaults:', err);
  }

  return { ...DEFAULT_STATE };
}

/**
 * Persists the current window bounds to the user's data directory.
 */
export function saveWindowState(window: BrowserWindow): void {
  try {
    if (window.isDestroyed()) return;

    const isMaximized = window.isMaximized();
    let bounds = { width: DEFAULT_STATE.width, height: DEFAULT_STATE.height };
    let x: number | undefined;
    let y: number | undefined;

    if (!isMaximized) {
      const normalBounds = window.getNormalBounds();
      bounds = { width: normalBounds.width, height: normalBounds.height };
      x = normalBounds.x;
      y = normalBounds.y;
    }

    const stateToSave: WindowState = {
      x,
      y,
      width: bounds.width,
      height: bounds.height,
      isMaximized
    };

    writeFileSync(getStateFilePath(), JSON.stringify(stateToSave, null, 2), 'utf-8');
  } catch (err) {
    console.error('[WindowState] Failed to save window state:', err);
  }
}

/**
 * Attaches debounced event listeners to track and save window bounds changes.
 */
export function trackWindowState(window: BrowserWindow): void {
  let saveTimeout: NodeJS.Timeout | null = null;

  const debouncedSave = (): void => {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      saveWindowState(window);
    }, 500);
  };

  window.on('resize', debouncedSave);
  window.on('move', debouncedSave);
  window.on('close', () => {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveWindowState(window);
  });
}

