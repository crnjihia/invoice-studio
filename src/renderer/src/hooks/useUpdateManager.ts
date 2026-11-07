// path: src/renderer/src/hooks/useUpdateManager.ts
import { useCallback, useEffect, useState } from 'react';
import { UpdateStatusResponse } from '@shared/types';

export function useUpdateManager(): {
  updateStatus: UpdateStatusResponse;
  isChecking: boolean;
  isDownloading: boolean;
  showNotesModal: boolean;
  setShowNotesModal: (show: boolean) => void;
  checkForUpdates: (force?: boolean) => Promise<void>;
  startDownload: () => Promise<void>;
  installAndRestart: () => Promise<void>;
} {
  const [updateStatus, setUpdateStatus] = useState<UpdateStatusResponse>({
    state: 'idle',
    currentVersion: '0.1.0',
    availableVersion: null,
    progress: null,
    releaseNotes: null,
    releaseDate: null,
    error: null,
    isStagedRollout: false,
    stagingPercentage: null
  });

  const [isChecking, setIsChecking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      if (window.api?.updates?.getStatus) {
        const current = await window.api.updates.getStatus();
        setUpdateStatus(current);
        setIsDownloading(current.state === 'downloading');
        setIsChecking(current.state === 'checking');
      }
    } catch (err) {
      console.warn('[UpdateManager] Failed to fetch update status:', err);
    }
  }, []);

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  const checkForUpdates = async (force = false): Promise<void> => {
    setIsChecking(true);
    try {
      if (window.api?.updates?.check) {
        const result = await window.api.updates.check({ forceCheck: force });
        setUpdateStatus(result);
        if (result.state === 'available') {
          setShowNotesModal(true);
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setUpdateStatus(prev => ({
        ...prev,
        state: 'error',
        error: message
      }));
    } finally {
      setIsChecking(false);
    }
  };

  const startDownload = async (): Promise<void> => {
    setIsDownloading(true);
    try {
      if (window.api?.updates?.startDownload) {
        const result = await window.api.updates.startDownload();
        setUpdateStatus(result);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setUpdateStatus(prev => ({
        ...prev,
        state: 'error',
        error: message
      }));
    } finally {
      setIsDownloading(false);
    }
  };

  const installAndRestart = async (): Promise<void> => {
    try {
      if (window.api?.updates?.install) {
        await window.api.updates.install();
      }
    } catch (err) {
      console.error('[UpdateManager] Failed to install update:', err);
    }
  };

  return {
    updateStatus,
    isChecking,
    isDownloading,
    showNotesModal,
    setShowNotesModal,
    checkForUpdates,
    startDownload,
    installAndRestart
  };
}

