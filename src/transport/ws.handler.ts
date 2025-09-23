export function getStationConnectionState(stationId: string) {
  return connectionManager.getConnection(stationId);
}
import { WebSocket } from 'ws';
import createStationHandlers, { IStationService } from '../stations/station.ws';
import { StatusNotificationRepository } from '../stations/status_notification.repository';
import { StatusNotificationService } from '../stations/status_notification.service';
import { AppDataSource } from '../database/config';
import createTransactionHandlers, {
  ITransactionService,
} from '../transactions/transaction.ws';
import createMeterHandlers, { IMeterService } from '../meter/meter.ws';
import { connectionManager } from './connection.manager';
import logger, { maskSensitive } from '../core/logger';

export function setupWebSocketServer(
  server: any,
  deps: {
    stationService: IStationService;
    transactionService: ITransactionService;
    meterService: IMeterService;
  }
) {
  const wss = new WebSocket.Server({ server });

  // create status notification service for DB persistence
  const statusNotificationRepo = new StatusNotificationRepository(AppDataSource);
  const statusNotificationService = new StatusNotificationService(statusNotificationRepo);

  // create handlers with injected services
  const stationHandlers = createStationHandlers(
    deps.stationService,
    statusNotificationService
  );
  const transactionHandlers = createTransactionHandlers(
    deps.transactionService
  );
  const meterHandlers = createMeterHandlers(deps.meterService);

  wss.on('connection', (ws: WebSocket, req) => {
  let stationId: string | null = null;
    logger.info(
      { remoteAddress: req.socket?.remoteAddress },
      'WebSocket connection established'
    );

    ws.on('message', async (data) => {
      logger.info({ raw: data.toString() }, 'Received raw WebSocket message');
      try {
        const msg = JSON.parse(data.toString());
        const [messageTypeId, uniqueId, action, payload] = msg;

        logger.info(
          { action, uniqueId, payload: maskSensitive(payload) },
          'Dispatching OCPP message'
        );
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
          case 'Heartbeat': {
            const response = [
              3,
              uniqueId,
              { currentTime: new Date().toISOString() },
            ];
            ws.send(JSON.stringify(response));
            break;
          }
          case 'StatusNotification':
            await stationHandlers.handleStatusNotification(payload, ws, uniqueId);
            break;
            break;
          case 'Authorize':
            await stationHandlers.handleAuthorize(payload, ws, uniqueId);
            break;
          case 'StartTransaction':
            await transactionHandlers.handleStartTransaction(
              payload,
              ws,
              uniqueId
            );
            break;
          case 'StopTransaction':
            await transactionHandlers.handleStopTransaction(
              payload,
              ws,
              uniqueId
            );
            break;
          case 'MeterValues':
            await meterHandlers.handleMeterValues(payload, ws, uniqueId);
            break;
          default:
            logger.warn({ action }, 'Unknown OCPP action received');
            break;
        }
      } catch (err) {
        logger.error(
          { err, raw: data.toString() },
          'Error handling WebSocket message'
        );
      }
    });

    ws.on('close', () => {
      logger.info({ stationId }, 'WebSocket connection closed');
      if (stationId) {
        connectionManager.removeConnection(stationId);
      }
    });
  });
}
