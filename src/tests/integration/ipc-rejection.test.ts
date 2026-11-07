// path: src/tests/integration/ipc-rejection.test.ts
import { describe, it, expect, vi } from 'vitest';
import { IpcMainInvokeEvent } from 'electron';
import { z } from 'zod';
import { createValidatedHandler, validateSender } from '../../main/ipc/validator';

describe('IPC Security & Rejection Integration Tests', () => {
  const TestSchema = z.object({
    clientId: z.string().min(1),
    amountMinor: z.number().int().positive()
  });

  const mockHandler = vi
    .fn()
    .mockImplementation(async (input: { clientId: string; amountMinor: number }) => {
      return { status: 'processed', id: input.clientId, total: input.amountMinor };
    });

  function createMockEvent(url: string, isSubframe = false): IpcMainInvokeEvent {
    return {
      senderFrame: {
        url,
        parent: isSubframe ? ({} as unknown) : null
      }
    } as unknown as IpcMainInvokeEvent;
  }

  describe('validateSender', () => {
    it('accepts legitimate local app file URL in production', () => {
      const event = createMockEvent('file:///C:/Users/app/resources/app.asar/renderer/index.html');
      expect(validateSender(event)).toBe(true);
    });

    it('accepts localhost in dev environment', () => {
      const event = createMockEvent('http://localhost:5173/index.html');
      expect(validateSender(event)).toBe(true);
    });

    it('rejects calls originating from external websites', () => {
      const event = createMockEvent('https://malicious-phishing.com/evil.html');
      expect(validateSender(event)).toBe(false);
    });

    it('rejects calls originating from subframes / iframes', () => {
      const event = createMockEvent('http://localhost:5173/index.html', true);
      expect(validateSender(event)).toBe(false);
    });

    it('rejects calls with missing or malformed senderFrame', () => {
      const emptyEvent = {} as IpcMainInvokeEvent;
      expect(validateSender(emptyEvent)).toBe(false);
    });
  });

  describe('createValidatedHandler rejection behavior', () => {
    it('rejects unauthorized caller without executing handler', async () => {
      const handler = createValidatedHandler(TestSchema, mockHandler);
      const rogueEvent = createMockEvent('https://unauthorized-origin.org');

      const response = await handler(rogueEvent, { clientId: 'client-1', amountMinor: 5000 });

      expect(response.success).toBe(false);
      if (!response.success) {
        expect(response.error.code).toBe('UNAUTHORIZED_SENDER');
        expect(response.error.message).toContain('unauthorized sender frame');
      }
      expect(mockHandler).not.toHaveBeenCalled();
    });

    it('rejects malformed payload with VALIDATION_ERROR and field details', async () => {
      const handler = createValidatedHandler(TestSchema, mockHandler);
      const validEvent = createMockEvent('http://localhost:5173');

      // Invalid: missing clientId, negative amountMinor
      const malformedPayload = { amountMinor: -100 };
      const response = await handler(validEvent, malformedPayload);

      expect(response.success).toBe(false);
      if (!response.success) {
        expect(response.error.code).toBe('VALIDATION_ERROR');
        expect(response.error.fieldErrors?.clientId).toBeDefined();
        expect(response.error.fieldErrors?.amountMinor).toBeDefined();
      }
      expect(mockHandler).not.toHaveBeenCalled();
    });

    it('permits authorized calls with valid payload and executes domain handler', async () => {
      const handler = createValidatedHandler(TestSchema, mockHandler);
      const validEvent = createMockEvent('http://localhost:5173');

      const validPayload = { clientId: 'client-kenya-01', amountMinor: 250000 };
      const response = await handler(validEvent, validPayload);

      expect(response.success).toBe(true);
      if (response.success) {
        expect(response.data).toEqual({
          status: 'processed',
          id: 'client-kenya-01',
          total: 250000
        });
      }
      expect(mockHandler).toHaveBeenCalledWith(validPayload, validEvent);
    });
  });
});
