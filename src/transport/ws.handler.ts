export function getStationConnectionState(stationId: string) {
  return connectionManager.getConnection(stationId);
}
import { WebSocket } from 'ws';
import createStationHandlers, { IStationService } from '../stations/station.ws';
import createConnectorHandlers, {
} from '../connector/connector.ws';
import { ConnectorService } from '../connector/connector.service';
import { StatusNotificationRepository } from '../status_notification/status_notification.repository';
import { StatusNotificationService } from '../status_notification/status_notification.service';
import createStatusNotificationHandlers from '../status_notification/status_notification.ws';
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

  const statusNotificationRepo = new StatusNotificationRepository(
    AppDataSource
  );
  const statusNotificationService = new StatusNotificationService(
    statusNotificationRepo
  );

  const { IdTagRepository } = require('../id_tag/id_tag.repository');
  const { IdTagService } = require('../id_tag/id_tag.service');
  const idTagService = new IdTagService(new IdTagRepository(AppDataSource));
  const idTagHandlers = require('../id_tag/id_tag.ws').default(idTagService);

  const stationHandlers = createStationHandlers(deps.stationService);
  const transactionHandlers = createTransactionHandlers(
    deps.transactionService
  );
  const meterHandlers = createMeterHandlers(deps.meterService);

  const connectorService = new ConnectorService();
  const connectorHandlers = createConnectorHandlers(connectorService);

  const statusNotificationHandlers = createStatusNotificationHandlers(
    statusNotificationService
  );

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
          case 'ConnectorLookup':
            await connectorHandlers.handleFindOrCreateConnector(
              payload,
              ws,
              uniqueId
            );
            break;
          case 'BootNotification': {
            stationId =
              payload.chargePointSerialNumber || payload.stationId || null;
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
            await statusNotificationHandlers.handleSaveStatusNotification(
              payload,
              ws,
              uniqueId
            );
            break;
          case 'Authorize':
            await idTagHandlers.handleAuthorize(payload, ws, uniqueId);
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
