// path: src/shared/errors.ts
import { z } from 'zod';

export type IpcErrorCode =
  | 'UNAUTHORIZED_SENDER'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'DUPLICATE_RESOURCE'
  | 'DATABASE_ERROR'
  | 'INTERNAL_ERROR';

export interface IpcErrorDetail {
  code: IpcErrorCode;
  message: string;
  fieldErrors?: Record<string, string[]>;
}

export type IpcResult<T> = { success: true; data: T } | { success: false; error: IpcErrorDetail };

export function createIpcSuccess<T>(data: T): IpcResult<T> {
  return { success: true, data };
}

export function createIpcError(
  code: IpcErrorCode,
  message: string,
  fieldErrors?: Record<string, string[]>
): IpcResult<never> {
  return {
    success: false,
    error: {
      code,
      message,
      ...(fieldErrors ? { fieldErrors } : {})
    }
  };
}

export function serializeZodError(error: z.ZodError): IpcResult<never> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const path = issue.path.join('.') || 'root';
    if (!fieldErrors[path]) {
      fieldErrors[path] = [];
    }
    fieldErrors[path].push(issue.message);
  }

  return createIpcError('VALIDATION_ERROR', 'Input validation failed', fieldErrors);
}
