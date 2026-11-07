// path: src/shared/schemas/backup.ts
import { z } from 'zod';

export const BackupTypeSchema = z.enum([
  'manual',
  'scheduled',
  'on-exit',
  'pre-migration',
  'pre-restore',
  'pre-update'
]);

export const BackupInfoSchema = z.object({
  filename: z.string(),
  fullPath: z.string(),
  type: BackupTypeSchema,
  sizeBytes: z.number().int().min(0),
  createdAt: z.string(),
  isVerified: z.boolean()
});

export const BackupConfigSchema = z.object({
  customBackupFolder: z.string().optional().or(z.literal('')),
  keepDailyCount: z.number().int().min(1).max(30).default(7),
  keepWeeklyCount: z.number().int().min(1).max(52).default(4),
  backupOnExit: z.boolean().default(true),
  autoBackupIntervalHours: z.number().int().min(1).max(72).default(6)
});

export const RestorePreviewSchema = z.object({
  backupPath: z.string().min(1),
  createdAt: z.string(),
  sizeBytes: z.number().int(),
  isValid: z.boolean(),
  clientCount: z.number().int(),
  invoiceCount: z.number().int(),
  lastInvoiceDate: z.string().nullable()
});

export const TriggerBackupRequestSchema = z.object({
  type: BackupTypeSchema.default('manual')
});

export const RestoreRequestSchema = z.object({
  backupPath: z.string().min(1, 'Backup file path is required')
});

export const SetBackupFolderSchema = z.object({
  folderPath: z.string()
});
