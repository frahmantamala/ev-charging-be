import { eventBus } from '../core/events/event-bus';
import { Station } from '../core/datamodel/station.model';

type StationEvents =
  | 'station.created'
  | 'station.updated';

type StationCreatedPayload = { station: Station };
type StationUpdatedPayload = { station: Station };

export function emitStationCreated(payload: StationCreatedPayload) {
  eventBus.next({ type: 'station.created', payload });
}

export function emitStationUpdated(payload: StationUpdatedPayload) {
  eventBus.next({ type: 'station.updated', payload });
}
