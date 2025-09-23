import { eventBus } from '../../core/events/event-bus';
import { emitConnectorLookupRequested, emitConnectorLookupResolved } from '../connector.events';

describe('Connector Events', () => {
  it('should emit and receive connector.lookup.requested', (done) => {
    const payload = { stationId: 's1', connectorNo: 1, requestId: 'req1' };
    const sub = eventBus.subscribe((event) => {
      if (event.type === 'connector.lookup.requested') {
        expect(event.payload).toEqual(payload);
        sub.unsubscribe();
        done();
      }
    });
    emitConnectorLookupRequested(payload);
  });

  it('should emit and receive connector.lookup.resolved', (done) => {
    const payload = { requestId: 'req1', connectorUuid: 'uuid-123' };
    const sub = eventBus.subscribe((event) => {
      if (event.type === 'connector.lookup.resolved') {
        expect(event.payload).toEqual(payload);
        sub.unsubscribe();
        done();
      }
    });
    emitConnectorLookupResolved(payload);
  });
});
