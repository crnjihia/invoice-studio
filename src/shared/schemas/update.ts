// path: src/shared/schemas/update.ts
import { z } from 'zod';

export const UpdateStateSchema = z.enum([
  'idle',
  'checking',
  'available',
  'not-available',
  'downloading',
  'downloaded',
  'error'
]);

export const UpdateProgressSchema = z.object({
  bytesPerSecond: z.number().nonnegative().default(0),
  percent: z.number().min(0).max(100).default(0),
  total: z.number().nonnegative().default(0),
  transferred: z.number().nonnegative().default(0)
});

export const UpdateInfoSchema = z.object({
  version: z.string(),
  releaseDate: z.string().optional(),
  releaseNotes: z.string().optional().or(z.array(z.any())).optional(),
  stagingPercentage: z.number().min(0).max(100).optional()
});

export const UpdateStatusResponseSchema = z.object({
  state: UpdateStateSchema,
  currentVersion: z.string(),
  availableVersion: z.string().nullable().optional(),
  progress: UpdateProgressSchema.nullable().optional(),
  releaseNotes: z.string().nullable().optional(),
  releaseDate: z.string().nullable().optional(),
  error: z.string().nullable().optional(),
  isStagedRollout: z.boolean().default(false),
  stagingPercentage: z.number().min(0).max(100).nullable().optional()
});

export const CheckUpdateOptionsSchema = z.object({
  forceCheck: z.boolean().default(false)
});

