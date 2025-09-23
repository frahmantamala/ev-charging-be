import { eventBus } from '../core/events/event-bus';

export type ConnectorEvents =
  | 'connector.lookup.requested'
  | 'connector.lookup.resolved';

export interface ConnectorLookupRequestedPayload {
  stationId: string;
  connectorNo: number;
  type?: string;
  requestId: string;
}

export interface ConnectorLookupResolvedPayload {
  requestId: string;
  connectorUuid: string | null;
  error?: string;
}

export function emitConnectorLookupRequested(payload: ConnectorLookupRequestedPayload) {
  eventBus.next({ type: 'connector.lookup.requested', payload });
}

export function emitConnectorLookupResolved(payload: ConnectorLookupResolvedPayload) {
  eventBus.next({ type: 'connector.lookup.resolved', payload });
}
