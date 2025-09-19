import { eventBus } from '../core/events/event-bus';

export type MeterEvents = 'meter.valueReceived';

export type MeterValueReceivedPayload = {
  transactionId: string;
  valueWh: number;
  timestamp: string;
  phase?: string;
};

export function emitMeterValueReceived(payload: MeterValueReceivedPayload) {
  eventBus.next({ type: 'meter.valueReceived', payload });
}

