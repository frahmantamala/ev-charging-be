import { WebSocket } from 'ws';
import createStationHandlers, { IStationService } from '../stations/station.ws';
import createTransactionHandlers, { ITransactionService } from '../transactions/transaction.ws';
import createMeterHandlers, { IMeterService } from '../meter/meter.ws';
// import other handlers as needed

export function setupWebSocketServer(
  server: any,
  deps: {
    stationService: IStationService,
    transactionService: ITransactionService,
    meterService: IMeterService,
  }
) {
  const wss = new WebSocket.Server({ server });

  // Create handlers with injected services
  const stationHandlers = createStationHandlers(deps.stationService);
  const transactionHandlers = createTransactionHandlers(deps.transactionService);
  const meterHandlers = createMeterHandlers(deps.meterService);

  wss.on('connection', (ws: WebSocket, req) => {
    ws.on('message', async (data) => {
      console.log('Received message:', data.toString());
      try {
        const msg = JSON.parse(data.toString());
        const [messageTypeId, uniqueId, action, payload] = msg;

        switch (action) {
          case 'BootNotification':
            await stationHandlers.handleBootNotification(payload, ws, uniqueId);
            break;
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
      // Handle disconnect, cleanup
    });
  });
}
