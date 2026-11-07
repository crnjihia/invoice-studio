// path: src/main/ipc/registry.ts
import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { z } from 'zod';
import { createValidatedHandler } from './validator';
import { IpcResult } from '@shared/errors';

export type IpcHandlerFn<TInput, TOutput> = (
  input: TInput,
  event: IpcMainInvokeEvent
) => Promise<TOutput>;

class IpcRegistry {
  private registeredChannels = new Set<string>();

  /**
   * Registers a strongly-typed, schema-validated IPC channel handler.
   */
  public register<TInput, TOutput>(
    channel: string,
    schema: z.ZodSchema<TInput>,
    handler: IpcHandlerFn<TInput, TOutput>
  ): void {
    if (this.registeredChannels.has(channel)) {
      throw new Error(`IPC channel "${channel}" is already registered.`);
    }

    const validatedHandler = createValidatedHandler(schema, handler);
    ipcMain.handle(
      channel,
      (event: IpcMainInvokeEvent, rawInput: unknown): Promise<IpcResult<TOutput>> => {
        return validatedHandler(event, rawInput);
      }
    );

    this.registeredChannels.add(channel);
  }

  /**
   * Removes a registered handler (useful for testing or hot-reload).
   */
  public unregister(channel: string): void {
    if (this.registeredChannels.has(channel)) {
      ipcMain.removeHandler(channel);
      this.registeredChannels.delete(channel);
    }
  }

  /**
   * Clears all registered handlers.
   */
  public clear(): void {
    for (const channel of this.registeredChannels) {
      ipcMain.removeHandler(channel);
    }
    this.registeredChannels.clear();
  }
}

export const ipcRegistry = new IpcRegistry();
