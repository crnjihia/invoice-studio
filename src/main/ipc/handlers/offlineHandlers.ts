// path: src/main/ipc/handlers/offlineHandlers.ts
import { z } from 'zod';
import { ipcRegistry } from '../registry';
import { IPC_CHANNELS } from '@shared/channels';
import { DiscardDraftSnapshotSchema, SaveDraftSnapshotSchema } from '@shared/schemas/draft';
import { getDatabase } from '../../db/connection';
import {
  discardDraftSnapshot,
  listRecoverableDrafts,
  saveDraftSnapshot
} from '../../services/draftRecoveryService';
import { checkNetworkStatus } from '../../services/networkService';

export function registerOfflineHandlers(): void {
  // Save active draft snapshot atomically
  ipcRegistry.register(
    IPC_CHANNELS.DRAFT.SAVE_SNAPSHOT,
    SaveDraftSnapshotSchema,
    async input => {
      return saveDraftSnapshot(input);
    }
  );

  // List all recoverable drafts
  ipcRegistry.register(
    IPC_CHANNELS.DRAFT.LIST_RECOVERABLE,
    z.unknown().optional(),
    async () => {
      return listRecoverableDrafts(getDatabase());
    }
  );

  // Discard a draft snapshot after user confirms recovery or discard
  ipcRegistry.register(
    IPC_CHANNELS.DRAFT.DISCARD_SNAPSHOT,
    DiscardDraftSnapshotSchema,
    async input => {
      const removed = discardDraftSnapshot(input.draftId);
      return { success: removed };
    }
  );

  // Get current network reachability status
  ipcRegistry.register(
    IPC_CHANNELS.NETWORK.GET_STATUS,
    z.unknown().optional(),
    async () => {
      return checkNetworkStatus();
    }
  );
}
