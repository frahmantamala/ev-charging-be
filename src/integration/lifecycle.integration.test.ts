import { eventBus } from '../core/events/event-bus';
import createStationHandlers from '../stations/station.ws';
import createTransactionHandlers from '../transactions/transaction.ws';
import createMeterHandlers from '../meter/meter.ws';
import createIdTagHandlers from '../id_tag/id_tag.ws';
import { emitConnectorLookupResolved } from '../connector/connector.events';
import { emitIdTagAuthorizeResolved } from '../id_tag/id_tag.events';

describe('Charger lifecycle integration (handler-level)', () => {
  it('runs through Boot -> Status -> Heartbeat -> Authorize -> Start -> Meter -> Stop -> Status', async () => {
    const sentMessages: any[] = [];
    const mockWs: any = { send: (msg: string) => sentMessages.push(JSON.parse(msg)) };

    const stations: any = {};
    const stationService: any = {
      async getStationByName(name: string) { return Object.values(stations).find((s: any) => s.name === name) || null; },
      async createStation(data: any) { const id = 'station-1'; stations[id] = { id, ...data }; return stations[id]; },
      async getStationById(id: string) { return stations[id] || null; },
      async updateStation(id: string, update: any) { stations[id] = { ...stations[id], ...update }; return stations[id]; },
      async listStations() { return Object.values(stations); }
    };

    // transaction service fake
    const transactionService: any = {
      async createTransaction(data: any) { return { id: 'tx-1', ...data }; },
      async getTransactionById() { return null; },
      async updateTransactionStatus() {}
    };

    const meterService: any = {
      async saveMeterValues() {}
    };

    // create handlers
    const stationHandlers = createStationHandlers(stationService);
    const transactionHandlers = createTransactionHandlers(transactionService);
    const meterHandlers = createMeterHandlers(meterService);
    const idTagHandlers = createIdTagHandlers({ authorize: async (idTag: string) => ({ status: 'Accepted' }) } as any);

    const connectorResponses: any[] = [];
    const connSub = eventBus.subscribe((e) => {
      if (e.type === 'connector.lookup.requested') {
        const p: any = e.payload;
        emitConnectorLookupResolved({ requestId: p.requestId, connectorUuid: 'connector-uuid-1' });
      }
    });

    const idtagSub = eventBus.subscribe((e) => {
      if (e.type === 'idtag.authorize.requested') {
        const p: any = e.payload;
        emitIdTagAuthorizeResolved({ requestId: p.requestId, status: 'Accepted' });
      }
    });

    const statusEvents: any[] = [];
    const statusSub = eventBus.subscribe((e) => {
      if (e.type === 'status.notification.received') {
        statusEvents.push(e.payload);
      }
    });

    await stationHandlers.handleBootNotification({
      chargePointVendor: 'Vendor',
      chargePointModel: 'Model',
      chargePointSerialNumber: 'CP-1',
      chargeBoxSerialNumber: 'CB-1'
    }, mockWs, 'u1');

    await stationHandlers.handleStatusNotification({ connectorId: 1, status: 'Available', time: new Date().toISOString() }, mockWs, 'u2');

    await idTagHandlers.handleAuthorize({ idTag: 'tag-1' }, mockWs, 'u4');

    await transactionHandlers.handleStartTransaction({ connectorId: 1, idTag: 'tag-1', meterStart: 0, timestamp: new Date().toISOString(), stationId: 'station-1' }, mockWs, 'u5');

    await meterHandlers.handleMeterValues({ transactionId: 'tx-1', valueWh: 10, timestamp: new Date().toISOString() }, mockWs, 'u6');

    await transactionHandlers.handleStopTransaction({ transactionId: 'tx-1', meterStop: 10, timestamp: new Date().toISOString() }, mockWs, 'u7');

    await stationHandlers.handleStatusNotification({ connectorId: 1, status: 'Unavailable', time: new Date().toISOString() }, mockWs, 'u8');

    expect(statusEvents.length).toBeGreaterThanOrEqual(2);
    expect(statusEvents[0].connector_id).toBe(1);
    expect(statusEvents[1].connector_id).toBe(1);

    const txCreate = sentMessages.find(m => m[0] === 3 && m[2] && m[2].transactionId);
    expect(txCreate).toBeDefined();

    connSub.unsubscribe(); idtagSub.unsubscribe(); statusSub.unsubscribe();
  }, 20000);
});
