import { eventBus } from '../core/events/event-bus';
import { Transaction } from '../core/datamodel/transaction.model';

// Event payloads
type TransactionStartedPayload = { transaction: Transaction };
type MeterValueReceivedPayload = { transactionId: string; valueWh: number; timestamp: string };
type TransactionStoppedPayload = { transaction: Transaction };

// Emitters (to be called by handler/service)
export function emitTransactionStarted(payload: TransactionStartedPayload) {
  eventBus.next({ type: 'transaction.started', payload });
}

export function emitMeterValueReceived(payload: MeterValueReceivedPayload) {
  eventBus.next({ type: 'transaction.meterValueReceived', payload });
}

export function emitTransactionStopped(payload: TransactionStoppedPayload) {
  eventBus.next({ type: 'transaction.stopped', payload });
}

