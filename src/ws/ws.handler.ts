export function getStationConnectionState(stationId: string) {
  return connectionManager.getConnection(stationId);
}
import { WebSocket } from 'ws';
import createStationHandlers, { IStationService } from '../stations/station.ws';
import createTransactionHandlers, { ITransactionService } from '../transactions/transaction.ws';
import createMeterHandlers, { IMeterService } from '../meter/meter.ws';
import { connectionManager } from './connection.manager';

export function setupWebSocketServer(
  server: any,
  deps: {
    stationService: IStationService,
    transactionService: ITransactionService,
    meterService: IMeterService,
  }
) {
  const wss = new WebSocket.Server({ server });

  // create handlers with injected services
  const stationHandlers = createStationHandlers(deps.stationService);
  const transactionHandlers = createTransactionHandlers(deps.transactionService);
  const meterHandlers = createMeterHandlers(deps.meterService);

  wss.on('connection', (ws: WebSocket, req) => {
    let stationId: string | null = null;

    ws.on('message', async (data) => {
      console.log('Received message:', data.toString());
      try {
        const msg = JSON.parse(data.toString());
        const [messageTypeId, uniqueId, action, payload] = msg;

        switch (action) {
          case 'BootNotification': {
            // extract stationId from payload (customize as needed)
            stationId = payload.chargePointSerialNumber || payload.stationId || null;
            if (stationId) {
              connectionManager.addConnection(stationId, ws);
            }
            await stationHandlers.handleBootNotification(payload, ws, uniqueId);
            break;
          }
          case 'StartTransaction':
            await transactionHandlers.handleStartTransaction(payload, ws, uniqueId);
            break;
          case 'StopTransaction':
            await transactionHandlers.handleStopTransaction(payload, ws, uniqueId);
            break;
          case 'MeterValues':
            await meterHandlers.handleMeterValues(payload, ws, uniqueId);
            break;
          default:
            break;
        }
      } catch (err) {
        console.error('Error handling message:', err);
      }
    });

    ws.on('close', () => {
      if (stationId) {
        connectionManager.removeConnection(stationId);
      }
    });
  });
}
