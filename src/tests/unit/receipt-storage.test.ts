// path: src/tests/unit/receipt-storage.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, rmSync } from 'fs';
import {
  computeContentHash,
  deleteReceiptFile,
  findReceiptPath,
  readReceiptFile,
  saveReceiptFile,
  setCustomReceiptsDir
} from '../../main/services/receiptStorageService';

const TEST_RECEIPTS_DIR = 'temp-test-receipts-unit';

describe('Receipt Storage & Content-Hash Deduplication Unit Tests', () => {
  beforeEach(() => {
    setCustomReceiptsDir(TEST_RECEIPTS_DIR);
  });

  afterEach(() => {
    setCustomReceiptsDir(null);
    if (existsSync(TEST_RECEIPTS_DIR)) {
      try {
        rmSync(TEST_RECEIPTS_DIR, { recursive: true, force: true });
      } catch {
        // Ignored: cleanup error
      }
    }
  });

  it('computes consistent SHA-256 content hashes for file buffers', () => {
    const bufferA = Buffer.from('Receipt data 12345 for fuel');
    const bufferB = Buffer.from('Receipt data 12345 for fuel');
    const bufferC = Buffer.from('Different receipt data');

    const hashA = computeContentHash(bufferA);
    const hashB = computeContentHash(bufferB);
    const hashC = computeContentHash(bufferC);

    expect(hashA).toHaveLength(64);
    expect(hashA).toBe(hashB);
    expect(hashA).not.toBe(hashC);
  });

  it('saves receipt file with content hash name and deduplicates identical uploads', () => {
    const receiptData = Buffer.from('Sample fuel receipt from Shell Westlands, KES 5,000');

    // First save
    const result1 = saveReceiptFile(receiptData, 'fuel-receipt.jpg', 'image/jpeg');
    expect(result1.hash).toBe(computeContentHash(receiptData));
    expect(result1.fileName).toBe(`${result1.hash}.jpg`);
    expect(existsSync(result1.filePath)).toBe(true);

    // Second save with identical contents under a different original filename
    const result2 = saveReceiptFile(receiptData, 'renamed_copy.jpg', 'image/jpeg');
    expect(result2.hash).toBe(result1.hash);
    expect(result2.filePath).toBe(result1.filePath);

    // Find receipt path by hash
    const foundPath = findReceiptPath(result1.hash);
    expect(foundPath).toBe(result1.filePath);

    // Read file contents
    const readBuffer = readReceiptFile(result1.hash);
    expect(readBuffer).not.toBeNull();
    expect(readBuffer?.toString()).toBe(receiptData.toString());

    // Delete receipt
    const deleted = deleteReceiptFile(result1.hash);
    expect(deleted).toBe(true);
    expect(findReceiptPath(result1.hash)).toBeNull();
  });
});
