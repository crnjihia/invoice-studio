// path: src/tests/unit/update-schemas.test.ts
import { describe, it, expect } from 'vitest';
import {
  CheckUpdateOptionsSchema,
  UpdateInfoSchema,
  UpdateProgressSchema,
  UpdateStateSchema,
  UpdateStatusResponseSchema
} from '../../shared/schemas/update';

describe('Auto-Update Zod Schemas Unit Tests', () => {
  it('validates allowed update states and rejects invalid transitions', () => {
    expect(UpdateStateSchema.safeParse('idle').success).toBe(true);
    expect(UpdateStateSchema.safeParse('checking').success).toBe(true);
    expect(UpdateStateSchema.safeParse('available').success).toBe(true);
    expect(UpdateStateSchema.safeParse('downloading').success).toBe(true);
    expect(UpdateStateSchema.safeParse('downloaded').success).toBe(true);
    expect(UpdateStateSchema.safeParse('error').success).toBe(true);

    expect(UpdateStateSchema.safeParse('unknown_state').success).toBe(false);
  });

  it('validates download progress payloads and clamps percent between 0 and 100', () => {
    const validProgress = UpdateProgressSchema.safeParse({
      bytesPerSecond: 1048576,
      percent: 45.5,
      total: 50000000,
      transferred: 22750000
    });
    expect(validProgress.success).toBe(true);

    const invalidPercent = UpdateProgressSchema.safeParse({
      bytesPerSecond: 1000,
      percent: 150,
      total: 1000,
      transferred: 1000
    });
    expect(invalidPercent.success).toBe(false);
  });

  it('validates full update status response envelopes', () => {
    const validResponse = UpdateStatusResponseSchema.safeParse({
      state: 'available',
      currentVersion: '1.0.0',
      availableVersion: '1.1.0',
      progress: null,
      releaseNotes: 'Fixed offline PDF generation and added M-Pesa statements.',
      releaseDate: '2026-11-10T12:00:00.000Z',
      error: null,
      isStagedRollout: true,
      stagingPercentage: 25
    });
    expect(validResponse.success).toBe(true);
    if (validResponse.success) {
      expect(validResponse.data.stagingPercentage).toBe(25);
      expect(validResponse.data.isStagedRollout).toBe(true);
    }
  });

  it('validates check update options with defaults', () => {
    const parsedDefault = CheckUpdateOptionsSchema.safeParse({});
    expect(parsedDefault.success).toBe(true);
    if (parsedDefault.success) {
      expect(parsedDefault.data.forceCheck).toBe(false);
    }

    const parsedForced = CheckUpdateOptionsSchema.safeParse({ forceCheck: true });
    expect(parsedForced.success).toBe(true);
    if (parsedForced.success) {
      expect(parsedForced.data.forceCheck).toBe(true);
    }
  });

  it('parses update info metadata with release notes as string or array', () => {
    const withStringNotes = UpdateInfoSchema.safeParse({
      version: '1.2.0',
      releaseNotes: 'New feature release'
    });
    expect(withStringNotes.success).toBe(true);

    const withArrayNotes = UpdateInfoSchema.safeParse({
      version: '1.2.0',
      releaseNotes: [{ note: 'Item 1' }, { note: 'Item 2' }]
    });
    expect(withArrayNotes.success).toBe(true);
  });
});

