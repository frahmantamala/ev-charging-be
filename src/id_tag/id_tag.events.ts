import { eventBus } from '../core/events/event-bus';

export type IdTagEvents = 'idtag.authorize.requested' | 'idtag.authorize.resolved';

export interface IdTagAuthorizeRequestedPayload {
  idTag: string;
  requestId: string;
  stationId?: string;
}

export interface IdTagAuthorizeResolvedPayload {
  requestId: string;
  status?: 'Accepted' | 'Blocked' | string;
  expiryDate?: string | null;
  parentIdTag?: string | null;
  error?: string;
}

export function emitIdTagAuthorizeRequested(payload: IdTagAuthorizeRequestedPayload) {
  eventBus.next({ type: 'idtag.authorize.requested', payload });
}

export function emitIdTagAuthorizeResolved(payload: IdTagAuthorizeResolvedPayload) {
  eventBus.next({ type: 'idtag.authorize.resolved', payload });
}
