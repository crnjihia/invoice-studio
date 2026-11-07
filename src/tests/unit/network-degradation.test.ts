// path: src/tests/unit/network-degradation.test.ts
import { describe, it, expect } from 'vitest';
import { checkNetworkStatus, executeWithNetworkDegradation } from '../../main/services/networkService';

describe('Offline-First & Graceful Network Degradation Unit Tests', () => {
  it('returns valid network status structure without throwing even for unreachable hosts', async () => {
    // Probe a non-routable / reserved test domain with a short 200ms timeout
    const status = await checkNetworkStatus('nonexistent-domain-test.local-invoice-studio-xyz', 200);

    expect(status).toHaveProperty('isOnline');
    expect(status).toHaveProperty('status');
    expect(status).toHaveProperty('lastChecked');
    expect(typeof status.isOnline).toBe('boolean');
    expect(['online', 'offline', 'degraded']).toContain(status.status);
  });

  it('executes a network task successfully when operational', async () => {
    const mockNetworkTask = async (): Promise<{ rates: Record<string, number> }> => {
      return { rates: { USD: 129.5, EUR: 139.8, GBP: 165.2 } };
    };

    const fallback = { rates: { USD: 130.0, EUR: 140.0, GBP: 165.0 } };

    const { result, isDegraded, error } = await executeWithNetworkDegradation(
      mockNetworkTask,
      fallback,
      {
        description: 'Mock Currency Rate Fetch',
        allowExecutionWhenOffline: true
      }
    );

    expect(isDegraded).toBe(false);
    expect(error).toBeUndefined();
    expect(result.rates.USD).toBe(129.5);
  });

  it('degrades gracefully with fallback when network task throws an error', async () => {
    const failingTask = async (): Promise<string> => {
      throw new Error('ENOTFOUND api.exchangerate-api.com');
    };

    const fallback = 'default-cached-rate-130.00';

    const { result, isDegraded, error } = await executeWithNetworkDegradation(
      failingTask,
      fallback,
      {
        description: 'Failed Exchange Rate Lookup',
        allowExecutionWhenOffline: true
      }
    );

    expect(isDegraded).toBe(true);
    expect(result).toBe(fallback);
    expect(error).toContain('Degraded Failed Exchange Rate Lookup');
    expect(error).toContain('ENOTFOUND');
  });

  it('degrades gracefully without hanging when task times out', async () => {
    // Task that hangs indefinitely
    const hangingTask = async (): Promise<string> => {
      return new Promise(resolve => {
        setTimeout(() => resolve('eventual-result'), 10000);
      });
    };

    const fallback = 'timeout-fallback';

    const startTime = Date.now();
    const { result, isDegraded, error } = await executeWithNetworkDegradation(
      hangingTask,
      fallback,
      {
        timeoutMs: 150, // Short 150ms timeout
        description: 'Update Check Probe',
        allowExecutionWhenOffline: true
      }
    );
    const elapsed = Date.now() - startTime;

    expect(elapsed).toBeLessThan(1000);
    expect(isDegraded).toBe(true);
    expect(result).toBe(fallback);
    expect(error).toContain('timed out after 150ms');
  });
});

