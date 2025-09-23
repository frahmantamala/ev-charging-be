import { eventBus } from '../core/events/event-bus';

export type StatusNotificationEvents = 'status.notification.received';

export interface StatusNotificationReceivedPayload {
  time: string;
  station_id?: string | null;
  connector_id: string;
  status: string;
  error_code?: string | null;
  info?: string | null;
}

export function emitStatusNotificationReceived(payload: StatusNotificationReceivedPayload) {
  eventBus.next({ type: 'status.notification.received', payload });
}
