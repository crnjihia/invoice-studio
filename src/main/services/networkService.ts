// path: src/main/services/networkService.ts
import { promises as dns } from 'dns';
import { NetworkStatus } from '@shared/types';

const DEFAULT_PROBE_HOST = 'dns.google';
const DEFAULT_PROBE_TIMEOUT_MS = 2500;

/**
 * Checks internet reachability using a non-blocking DNS query with a short timeout.
 * When completely offline, resolves within timeout to status: 'offline' without throwing.
 */
export async function checkNetworkStatus(
  probeHost = DEFAULT_PROBE_HOST,
  timeoutMs = DEFAULT_PROBE_TIMEOUT_MS
): Promise<NetworkStatus> {
  const now = new Date().toISOString();

  try {
    const lookupPromise = dns.lookup(probeHost);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('DNS probe timed out')), timeoutMs)
    );

    await Promise.race([lookupPromise, timeoutPromise]);

    return {
      isOnline: true,
      status: 'online',
      lastChecked: now,
      probeHost
    };
  } catch (err) {
    const isTimeout = err instanceof Error && err.message.includes('timed out');
    return {
      isOnline: false,
      status: isTimeout ? 'degraded' : 'offline',
      lastChecked: now,
      probeHost
    };
  }
}

export interface DegradationOptions {
  timeoutMs?: number;
  description?: string;
  allowExecutionWhenOffline?: boolean;
}

/**
 * Executes a network-dependent task with automated degradation and offline fallback.
 * Ensures the desktop application continues operating seamlessly with zero disruptions
 * even during intermittent coffee shop Wi-Fi or total network loss in Nairobi.
 */
export async function executeWithNetworkDegradation<T>(
  task: () => Promise<T>,
  fallback: T,
  options: DegradationOptions = {}
): Promise<{ result: T; isDegraded: boolean; error?: string }> {
  const { timeoutMs = 5000, description = 'network-task', allowExecutionWhenOffline = false } = options;

  if (!allowExecutionWhenOffline) {
    const initialStatus = await checkNetworkStatus();
    if (!initialStatus.isOnline) {
      return {
        result: fallback,
        isDegraded: true,
        error: `Skipped ${description}: Application is running in offline mode.`
      };
    }
  }

  try {
    const taskPromise = task();
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${description} timed out after ${timeoutMs}ms`)), timeoutMs)
    );

    const result = await Promise.race([taskPromise, timeoutPromise]);
    return { result, isDegraded: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      result: fallback,
      isDegraded: true,
      error: `Degraded ${description}: ${message}`
    };
  }
}

