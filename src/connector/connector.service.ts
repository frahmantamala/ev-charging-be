import { ConnectorRepository } from './connector.repository';
import { onEvent } from '../core/events/event-bus';
import {
  ConnectorLookupRequestedPayload,
  emitConnectorLookupResolved,
} from './connector.events';
import { AppDataSource } from '../database/config';

export class ConnectorService {
  private repo: ConnectorRepository;
  constructor() {
    this.repo = new ConnectorRepository(AppDataSource);
    this.registerEventListeners();
  }

  async findOrCreateConnector(stationId: string, connectorNo: number, type?: string): Promise<string> {
    return this.repo.findOrCreateConnector(stationId, connectorNo, type);
  }

  private registerEventListeners() {
    onEvent<ConnectorLookupRequestedPayload>('connector.lookup.requested', async (payload) => {
      try {
        const connectorUuid = await this.repo.findOrCreateConnector(
          payload.stationId,
          payload.connectorNo,
          payload.type
        );
        emitConnectorLookupResolved({
          requestId: payload.requestId,
          connectorUuid,
        });
      } catch (err: any) {
        emitConnectorLookupResolved({
          requestId: payload.requestId,
          connectorUuid: null,
          error: err.message,
        });
      }
    });
  }
}
