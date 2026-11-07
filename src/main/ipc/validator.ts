// path: src/main/ipc/validator.ts
import { IpcMainInvokeEvent } from 'electron';
import { z } from 'zod';
import { createIpcError, createIpcSuccess, IpcResult, serializeZodError } from '@shared/errors';

/**
 * Validates whether the IPC invocation originated from an authorized top-level frame.
 * Blocks calls from external websites, injected frames, or subframes.
 */
export function validateSender(
  event: Pick<IpcMainInvokeEvent, 'senderFrame'>,
  customAllowedOrigin?: string
): boolean {
  if (!event || !event.senderFrame) {
    return false;
  }

  const { senderFrame } = event;

  // Reject any call coming from nested subframes
  if (senderFrame.parent !== null) {
    return false;
  }

  const rawUrl = senderFrame.url;
  if (!rawUrl || typeof rawUrl !== 'string') {
    return false;
  }

  try {
    const parsed = new URL(rawUrl);

    if (customAllowedOrigin) {
      return parsed.origin === customAllowedOrigin || rawUrl.startsWith(customAllowedOrigin);
    }

    // Dev environment check
    if (process.env.ELECTRON_RENDERER_URL) {
      const allowedDevUrl = new URL(process.env.ELECTRON_RENDERER_URL);
      return parsed.origin === allowedDevUrl.origin;
    }

    // Production environment check: must be file:// protocol from app directory
    if (parsed.protocol === 'file:') {
      return true;
    }

    // Default local dev fallback
    if (
      parsed.protocol === 'http:' &&
      (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')
    ) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Higher-order function that wraps an IPC handler with strict sender verification
 * and Zod input validation, returning a structured IpcResult<T>.
 */
export function createValidatedHandler<TInput, TOutput>(
  schema: z.ZodSchema<TInput>,
  handler: (input: TInput, event: IpcMainInvokeEvent) => Promise<TOutput>
): (event: IpcMainInvokeEvent, rawInput: unknown) => Promise<IpcResult<TOutput>> {
  return async (event: IpcMainInvokeEvent, rawInput: unknown): Promise<IpcResult<TOutput>> => {
    // 1. Verify caller origin and top-level frame identity
    if (!validateSender(event)) {
      console.warn('[Security] Unauthorized IPC call rejected from frame:', event.senderFrame?.url);
      return createIpcError(
        'UNAUTHORIZED_SENDER',
        'IPC invocation rejected: unauthorized sender frame or origin'
      );
    }

    // 2. Validate payload schema with Zod
    const parsed = schema.safeParse(rawInput);
    if (!parsed.success) {
      return serializeZodError(parsed.error);
    }

    // 3. Execute domain handler safely
    try {
      const result = await handler(parsed.data, event);
      return createIpcSuccess(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      console.error('[IPC Handler Error]:', message);
      return createIpcError('INTERNAL_ERROR', message);
    }
  };
}
