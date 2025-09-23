import { WebSocket } from 'ws';

export const wsStationMap = new Map<WebSocket, string>();
import { Station } from '../core/datamodel/station.model';
import { OCPP_ERRORS } from '../core/ocpp-errors';
import logger, { maskSensitive } from '../core/logger';

import Redis from 'ioredis';
import {
  StatusNotificationSchema,
  BootNotificationSchema,
} from '../core/common/validation';
import { StatusNotificationService } from './status_notification.service';
import { ConnectorRepository } from './connector.repository';
import { log } from 'console';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export async function invalidateConnectorStatusCache(connectorId: number) {
  const redisStatusKey = `status:latest:${connectorId}`;
  await redis.del(redisStatusKey);
}

export interface IStationService {
  createStation(
    data: Omit<Station, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Station>;
  getStationById(id: string): Promise<Station | null>;
  getStationByName(name: string): Promise<Station | null>;
  updateStation(
    id: string,
    update: Partial<Omit<Station, 'id' | 'created_at' | 'updated_at'>>
  ): Promise<Station>;
  listStations(): Promise<Station[]>;
}

import { IdTagService } from './id_tag.service';

export async function invalidateIdTagCache(idTag: string) {
  await redis.del(`idtag:status:${idTag}`);
}

export default function createStationHandlers(
  stationService: IStationService,
  statusNotificationService?: StatusNotificationService,
  idTagService?: IdTagService
) {
  const { AppDataSource } = require('../database/config');
  const connectorRepo = new ConnectorRepository(AppDataSource);
  return {
    async handleAuthorize(payload: any, ws: WebSocket, uniqueId: string) {
      logger.info(
        { action: 'Authorize', payload: maskSensitive(payload) },
        'Received Authorize'
      );
      if (
        !payload.idTag ||
        typeof payload.idTag !== 'string' ||
        !payload.idTag.trim()
      ) {
        const response = [
          4,
          uniqueId,
          OCPP_ERRORS.ProtocolError.code,
          OCPP_ERRORS.ProtocolError.description + ' (idTag missing or invalid)',
        ];
        try {
          ws.send(JSON.stringify(response));
        } catch {}
        return;
      }
      let idTagInfo: {
        status: string;
        expiryDate?: string;
        parentIdTag?: string;
      } = { status: 'Blocked' };
      if (idTagService) {
        try {
          const result = await idTagService.authorize(payload.idTag);
          idTagInfo = { status: result.status };
          if (result.expiryDate) idTagInfo.expiryDate = result.expiryDate;
          if (result.parentIdTag) idTagInfo.parentIdTag = result.parentIdTag;
          // Store idTag status in Redis for fast lookup (1 hour expiry)
          await redis.set(
            `idtag:status:${payload.idTag}`,
            JSON.stringify(idTagInfo),
            'EX',
            3600
          );
        } catch (err) {
          logger.error({ err, idTag: payload.idTag }, 'Authorize DB error');
        }
      } else {
        idTagInfo = { status: 'Accepted' };
      }
      const response = [3, uniqueId, { idTagInfo }];
      try {
        ws.send(JSON.stringify(response));
      } catch {}
    },
    async handleBootNotification(
      payload: any,
      ws: WebSocket,
      uniqueId: string
    ) {
      logger.info(
        { action: 'BootNotification', payload: payload },
        'Received BootNotification'
      );
      const validation = BootNotificationSchema.safeParse(payload);
      if (!validation.success) {
        const errorMsg = validation.error.issues
          .map((e: any) => e.message)
          .join('; ');
        const response = [
          4,
          uniqueId,
          OCPP_ERRORS.ProtocolError.code,
          OCPP_ERRORS.ProtocolError.description + ` (${errorMsg})`,
        ];
        try {
          ws.send(JSON.stringify(response));
        } catch {
          const { connectionManager } = require('../ws/connection.manager');
          if (payload.chargePointSerialNumber || payload.stationId) {
            connectionManager.queueMessage(
              payload.chargePointSerialNumber || payload.stationId,
              JSON.stringify(response)
            );
          }
        }
        return;
      }
      const {
        chargePointVendor,
        chargePointModel,
        chargePointSerialNumber,
        chargeBoxSerialNumber,
        firmwareVersion,
        iccid,
        imsi,
        meterType,
        meterSerialNumber,
      } = validation.data;
      try {
        let station = await stationService.getStationByName(
          chargePointSerialNumber
        );
        if (!station) {
          station = await stationService.createStation({
            name: chargePointVendor,
            charge_point_serial_number: chargePointSerialNumber,
            firmware: firmwareVersion,
            charge_box_serial_number: chargeBoxSerialNumber,
            model: chargePointModel,
            iccid: iccid,
            imsi: imsi,
            meter_type: meterType,
            meter_serial_number: meterSerialNumber,
          });
        }
        // Set station context in the map for future messages
        wsStationMap.set(ws, station.id);
        logger.info(
          { chargePointSerialNumber, stationId: station.id },
          'Station registered or already exists'
        );
        const response = [
          3,
          uniqueId,
          {
            currentTime: new Date().toISOString(),
            interval: 60,
            status: 'Accepted',
          },
        ];
        try {
          ws.send(JSON.stringify(response));
        } catch {
          const { connectionManager } = require('../ws/connection.manager');
          if (chargePointSerialNumber) {
            connectionManager.queueMessage(
              chargePointSerialNumber,
              JSON.stringify(response)
            );
          }
        }
      } catch (err: any) {
        logger.error(
          { err, action: 'BootNotification', payload: maskSensitive(payload) },
          'BootNotification error'
        );
        let errorCode = OCPP_ERRORS.ProtocolError.code;
        let errorDescription = OCPP_ERRORS.ProtocolError.description;
        if (typeof err.message === 'string') {
          if (err.message.includes('Station name already exists')) {
            errorCode = OCPP_ERRORS.TypeConstraintViolation.code;
            errorDescription =
              'Station name already exists. Please use a unique name.';
          } else if (err.message.includes('Station name is required')) {
            errorCode = OCPP_ERRORS.ProtocolError.code;
            errorDescription = 'Station name is required.';
          } else {
            errorDescription = err.message;
          }
        }
        const response = [4, uniqueId, errorCode, errorDescription];
        try {
          ws.send(JSON.stringify(response));
        } catch {
          const { connectionManager } = require('../ws/connection.manager');
          if (chargePointSerialNumber) {
            connectionManager.queueMessage(
              chargePointSerialNumber,
              JSON.stringify(response)
            );
          }
        }
      }
    },

    async handleStatusNotification(
      payload: any,
      ws: WebSocket,
      uniqueId: string
    ) {
      logger.info(
        { action: 'StatusNotification', payload: maskSensitive(payload) },
        'Received StatusNotification'
      );
      // Validate
      const validation = StatusNotificationSchema.safeParse(payload);
      if (!validation.success) {
        const errorMsg = validation.error.issues
          .map((e: any) => e.message)
          .join('; ');
        const response = [
          4,
          uniqueId,
          OCPP_ERRORS.ProtocolError.code,
          OCPP_ERRORS.ProtocolError.description + ` (${errorMsg})`,
        ];
        try {
          ws.send(JSON.stringify(response));
        } catch {}
        return;
      }
      const data = validation.data;
      const connectorId = data.connectorId || data.connector_id || 0;
      const statusTime = data.time || new Date().toISOString();
      // Use wsStationMap for secure station context
      const stationKey = wsStationMap.get(ws) || '';
      if (!connectorId || !stationKey) {
        logger.error(
          { data, stationKey },
          'Missing connectorId or stationKey in StatusNotification'
        );
        const response = [
          4,
          uniqueId,
          OCPP_ERRORS.ProtocolError.code,
          OCPP_ERRORS.ProtocolError.description +
            ' (Missing connectorId or stationKey)',
        ];
        try {
          ws.send(JSON.stringify(response));
        } catch {}
        return;
      }
      // Idempotency: avoid duplicate processing
      const idempotencyKey = `status:${stationKey}:${connectorId}:${statusTime}`;
      const alreadyProcessed = await redis.get(idempotencyKey);
      if (alreadyProcessed) {
        ws.send(JSON.stringify([3, uniqueId, {}]));
        return;
      }
      // Look up or auto-create connector UUID by station and connector number
      let connectorUuid: string | null = null;
      try {
        const stationObj =
          (await stationService.getStationByName(stationKey)) ||
          (await stationService.getStationById(stationKey));
        if (stationObj && stationObj.id) {
          connectorUuid = await connectorRepo.findOrCreateConnector(
            stationObj.id,
            connectorId
          );
        }
      } catch (err) {
        logger.error(
          { err, stationKey, connectorId },
          'Failed to look up or create connector UUID'
        );
      }
      if (!connectorUuid) {
        logger.error(
          { stationKey, connectorId },
          'Connector UUID not found or created for StatusNotification'
        );
        const response = [
          4,
          uniqueId,
          OCPP_ERRORS.ProtocolError.code,
          OCPP_ERRORS.ProtocolError.description +
            ' (Connector not found or created)',
        ];
        try {
          ws.send(JSON.stringify(response));
        } catch {}
        return;
      }
      // Save to DB
      if (statusNotificationService) {
        try {
          await statusNotificationService.saveStatusNotification({
            time: data.time || statusTime,
            station_id: stationKey,
            connector_id: connectorUuid,
            status: data.status,
            error_code: data.error_code,
            info: data.info,
          } as any);
        } catch (err) {
          logger.error(
            { err, payload: data },
            'Failed to persist StatusNotification'
          );
        }
      }
      // Cache latest status in Redis (for fast lookup)
      const redisStatusKey = `status:latest:${stationKey}:${connectorId}`;
      await redis.set(
        redisStatusKey,
        JSON.stringify({
          time: statusTime,
          connector_id: connectorId,
          status: data.status,
          error_code: data.error_code,
          info: data.info,
        })
      );
      // Set idempotency key (1 day expiry)
      await redis.set(idempotencyKey, '1', 'EX', 86400);
      // Respond to client
      try {
        ws.send(JSON.stringify([3, uniqueId, {}]));
      } catch (err: any) {
        logger.error('Failed to send StatusNotification response:', err);
      }
    },
  };
}
