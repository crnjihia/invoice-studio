// path: src/main/ipc/handlers/backupHandlers.ts
import { dialog } from 'electron';
import { z } from 'zod';
import { ipcRegistry } from '../registry';
import { IPC_CHANNELS } from '@shared/channels';
import { RestoreRequestSchema, TriggerBackupRequestSchema } from '@shared/schemas/backup';
import { getDatabase } from '../../db/connection';
import { createOnlineBackup, listBackups } from '../../db/backup';
import { executeRestore, previewBackup } from '../../db/restore';
import { seedDatabase } from '../../db/seed';

export function registerBackupHandlers(): void {
  // Trigger backup
  ipcRegistry.register(IPC_CHANNELS.BACKUP.TRIGGER, TriggerBackupRequestSchema, async input => {
    const db = getDatabase();
    return await createOnlineBackup(db, input.type);
  });

  // List existing backups
  ipcRegistry.register(
    IPC_CHANNELS.BACKUP.LIST,
    z.object({ customFolder: z.string().optional() }),
    async input => {
      return listBackups(input.customFolder);
    }
  );

  // Folder selection dialog
  ipcRegistry.register(IPC_CHANNELS.BACKUP.SELECT_FOLDER, z.object({}), async () => {
    const result = await dialog.showOpenDialog({
      title: 'Select Backup Storage Directory',
      properties: ['openDirectory', 'createDirectory']
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    return result.filePaths[0];
  });

  // Preview backup metadata
  ipcRegistry.register(
    IPC_CHANNELS.BACKUP.PREVIEW,
    z.object({ backupPath: z.string().min(1) }),
    async input => {
      return previewBackup(input.backupPath);
    }
  );

  // Restore from backup
  ipcRegistry.register(IPC_CHANNELS.BACKUP.RESTORE, RestoreRequestSchema, async input => {
    return await executeRestore(input.backupPath);
  });

  // Seed rich demo data
  ipcRegistry.register(
    IPC_CHANNELS.BACKUP.SEED_DEMO_DATA,
    z.object({ forceReset: z.boolean().optional() }),
    async input => {
      const db = getDatabase();
      const result = seedDatabase(db, input.forceReset ?? true);
      return {
        success: true,
        ...result
      };
    }
  );
}
