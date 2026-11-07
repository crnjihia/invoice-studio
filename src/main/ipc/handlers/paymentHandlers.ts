// path: src/main/ipc/handlers/paymentHandlers.ts
import { ipcRegistry } from '../registry';
import { IPC_CHANNELS } from '@shared/channels';
import {
  DeletePaymentSchema,
  ListPaymentsSchema,
  RecordPaymentSchema
} from '@shared/schemas/payment';
import { getDatabase } from '../../db/connection';
import {
  deletePayment,
  listPaymentsByInvoice,
  recordPayment
} from '../../services/paymentService';

export function registerPaymentHandlers(): void {
  ipcRegistry.register(IPC_CHANNELS.PAYMENT.RECORD, RecordPaymentSchema, async input => {
    return recordPayment(getDatabase(), input);
  });

  ipcRegistry.register(IPC_CHANNELS.PAYMENT.LIST_BY_INVOICE, ListPaymentsSchema, async input => {
    return listPaymentsByInvoice(getDatabase(), input.invoiceId);
  });

  ipcRegistry.register(IPC_CHANNELS.PAYMENT.DELETE, DeletePaymentSchema, async input => {
    return deletePayment(getDatabase(), input.id);
  });
}

