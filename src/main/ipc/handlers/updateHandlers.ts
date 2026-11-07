// path: src/main/ipc/handlers/updateHandlers.ts
import { z } from 'zod';
import { ipcRegistry } from '../registry';
import { IPC_CHANNELS } from '@shared/channels';
import { CheckUpdateOptionsSchema } from '@shared/schemas/update';
import { getDatabase } from '../../db/connection';
import { updateService } from '../../services/updateService';

export function registerUpdateHandlers(): void {
  // Check for updates against GitHub Releases
  ipcRegistry.register(
    IPC_CHANNELS.UPDATE.CHECK,
    CheckUpdateOptionsSchema.optional(),
    async input => {
      return updateService.checkForUpdates(input?.forceCheck);
    }
  );

  // Trigger download of available update
  ipcRegistry.register(
    IPC_CHANNELS.UPDATE.START_DOWNLOAD,
    z.unknown().optional(),
    async () => {
      return updateService.startDownload();
    }
  );

  // Trigger safe install on quit with pre-update DB snapshot
  ipcRegistry.register(
    IPC_CHANNELS.UPDATE.INSTALL,
    z.unknown().optional(),
    async () => {
      return updateService.quitAndInstall(getDatabase());
    }
  );

  // Query current update status
  ipcRegistry.register(
    IPC_CHANNELS.UPDATE.GET_STATUS,
    z.unknown().optional(),
    async () => {
      return updateService.getStatus();
    }
  );
}

