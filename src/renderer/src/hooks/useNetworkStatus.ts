// path: src/renderer/src/hooks/useNetworkStatus.ts
import { useEffect, useState } from 'react';
import { NetworkStatus } from '@shared/types';

export function useNetworkStatus(): {
  isOnline: boolean;
  status: 'online' | 'offline' | 'degraded';
  lastChecked: string;
  refreshStatus: () => Promise<void>;
} {
  const [networkState, setNetworkState] = useState<NetworkStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    status: typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'online',
    lastChecked: new Date().toISOString()
  });

  const refreshStatus = async (): Promise<void> => {
    try {
      if (window.api?.network?.getStatus) {
        const remoteStatus = await window.api.network.getStatus();
        setNetworkState(remoteStatus);
      } else {
        setNetworkState({
          isOnline: navigator.onLine,
          status: navigator.onLine ? 'online' : 'offline',
          lastChecked: new Date().toISOString()
        });
      }
    } catch {
      setNetworkState(prev => ({
        ...prev,
        isOnline: navigator.onLine,
        status: navigator.onLine ? 'degraded' : 'offline',
        lastChecked: new Date().toISOString()
      }));
    }
  };

  useEffect(() => {
    const handleOnline = (): void => {
      void refreshStatus();
    };

    const handleOffline = (): void => {
      setNetworkState({
        isOnline: false,
        status: 'offline',
        lastChecked: new Date().toISOString()
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    void refreshStatus();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    isOnline: networkState.isOnline,
    status: networkState.status,
    lastChecked: networkState.lastChecked,
    refreshStatus
  };
}

