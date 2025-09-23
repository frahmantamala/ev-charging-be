import { ConnectorLookupSchema } from '../core/common/validation';
import { WebSocket } from 'ws';

export interface IConnectorService {
  findOrCreateConnector(stationId: string, connectorNo: number, type?: string): Promise<string>;
}

export default function createConnectorHandlers(connectorService: IConnectorService) {
  return {
    async handleFindOrCreateConnector(payload: any, ws: WebSocket, uniqueId: string) {
      const validation = ConnectorLookupSchema.safeParse(payload);
      if (!validation.success) {
        const errorMsg = validation.error.issues.map((e: any) => e.message).join('; ');
        ws.send(JSON.stringify([
          4,
          uniqueId,
          'ConnectorValidationError',
          errorMsg,
        ]));
        return;
      }
      try {
        const connectorUuid = await connectorService.findOrCreateConnector(
          validation.data.stationId,
          validation.data.connectorNo,
          validation.data.type
        );
        ws.send(JSON.stringify([3, uniqueId, { connectorUuid }]));
      } catch (err: any) {
        ws.send(JSON.stringify([
          4,
          uniqueId,
          'ConnectorError',
          err.message || 'Failed to find or create connector',
        ]));
      }
    },
  };
}
