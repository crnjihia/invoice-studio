// path: src/main/services/receiptStorageService.ts
import { app } from 'electron';
import { createHash } from 'crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'fs';
import { extname, join } from 'path';

let customReceiptsDir: string | null = null;

export function setCustomReceiptsDir(dir: string | null): void {
  customReceiptsDir = dir;
}

export function getReceiptsDirectory(): string {
  if (customReceiptsDir) {
    if (!existsSync(customReceiptsDir)) {
      mkdirSync(customReceiptsDir, { recursive: true });
    }
    return customReceiptsDir;
  }

  const baseDir = app ? app.getPath('userData') : process.cwd();
  const dir = join(baseDir, 'receipts');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function computeContentHash(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

/**
 * Saves a receipt attachment using its SHA-256 content hash as the filename.
 * If an identical file has already been saved, it is deduplicated automatically.
 */
export function saveReceiptFile(
  buffer: Buffer,
  originalFilename: string,
  _mimeType: string
): { hash: string; fileName: string; filePath: string; bytes: number } {
  const hash = computeContentHash(buffer);
  const ext = extname(originalFilename).toLowerCase() || '.bin';
  const fileName = `${hash}${ext}`;
  const receiptsDir = getReceiptsDirectory();
  const filePath = join(receiptsDir, fileName);

  if (!existsSync(filePath)) {
    writeFileSync(filePath, buffer);
  }

  return {
    hash,
    fileName,
    filePath,
    bytes: buffer.byteLength
  };
}

/**
 * Finds the absolute file path for a given content hash.
 */
export function findReceiptPath(hash: string): string | null {
  const receiptsDir = getReceiptsDirectory();
  if (!existsSync(receiptsDir)) return null;

  const files = readdirSync(receiptsDir);
  const match = files.find(file => file.startsWith(hash));
  if (match) {
    return join(receiptsDir, match);
  }
  return null;
}

/**
 * Reads the receipt file contents for a given content hash.
 */
export function readReceiptFile(hash: string): Buffer | null {
  const path = findReceiptPath(hash);
  if (path && existsSync(path)) {
    return readFileSync(path);
  }
  return null;
}

/**
 * Deletes a receipt file by hash.
 */
export function deleteReceiptFile(hash: string): boolean {
  const path = findReceiptPath(hash);
  if (path && existsSync(path)) {
    rmSync(path, { force: true });
    return true;
  }
  return false;
}

