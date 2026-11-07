// path: src/tests/unit/scaffold.test.ts
import { describe, it, expect, vi } from 'vitest';
import { handleExternalUrl } from '../../main/windows/mainWindow';
import { shell } from 'electron';

vi.mock('electron', () => ({
  shell: {
    openExternal: vi.fn().mockResolvedValue(undefined)
  },
  BrowserWindow: vi.fn(),
  app: {
    getVersion: vi.fn().mockReturnValue('0.1.0'),
    requestSingleInstanceLock: vi.fn().mockReturnValue(true),
    whenReady: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    quit: vi.fn()
  },
  ipcMain: {
    handle: vi.fn()
  }
}));

describe('Hardened Window Navigation Security', () => {
  it('permits approved protocols (https, http, mailto)', () => {
    expect(handleExternalUrl('https://example.com')).toBe(true);
    expect(handleExternalUrl('http://localhost:3000')).toBe(true);
    expect(handleExternalUrl('mailto:client@example.com')).toBe(true);
    expect(shell.openExternal).toHaveBeenCalledWith('https://example.com');
  });

  it('rejects disallowed or dangerous protocols', () => {
    expect(handleExternalUrl('javascript:alert(1)')).toBe(false);
    expect(handleExternalUrl('file:///C:/Windows/System32/calc.exe')).toBe(false);
    expect(handleExternalUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
    expect(handleExternalUrl('custom-protocol://token-steal')).toBe(false);
  });

  it('safely handles malformed URLs without crashing', () => {
    expect(handleExternalUrl('not-a-valid-url')).toBe(false);
    expect(handleExternalUrl('')).toBe(false);
  });
});
