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
import { onEvent, emitAndWait } from '../core/events/event-bus';
import { emitConnectorLookupRequested, ConnectorLookupResolvedPayload } from '../connector/connector.events';
import { emitStatusNotificationReceived } from '../status_notification/status_notification.events';

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

export async function invalidateIdTagCache(idTag: string) {
  await redis.del(`idtag:status:${idTag}`);
}

export default function createStationHandlers(
  stationService: IStationService,
) {
  return {
    async handleAuthorize(payload: any, ws: WebSocket, uniqueId: string) {
      logger.info({ action: 'Authorize', payload: maskSensitive(payload) }, 'Received Authorize');
      if (!payload.idTag || typeof payload.idTag !== 'string' || !payload.idTag.trim()) {
        const response = [4, uniqueId, OCPP_ERRORS.ProtocolError.code, OCPP_ERRORS.ProtocolError.description + ' (idTag missing or invalid)'];
        try { ws.send(JSON.stringify(response)); } catch {}
        return;
      }

      try {
        let idTagInfo: any = { status: 'Blocked' };
        if ((stationService as any).authorizeIdTag) {
          idTagInfo = await (stationService as any).authorizeIdTag(payload.idTag);
        } else {

          const res = await emitAndWait<{ idTag: string; requestId?: string }, any>({
            requestType: 'idtag.authorize.requested',
            requestPayload: { idTag: payload.idTag },
            responseType: 'idtag.authorize.resolved',
            timeoutMs: 2000,
          });
          if (res && (res as any).status) {
            idTagInfo = { status: (res as any).status };
            if ((res as any).expiryDate) idTagInfo.expiryDate = (res as any).expiryDate;
            if ((res as any).parentIdTag) idTagInfo.parentIdTag = (res as any).parentIdTag;
          } else {
            idTagInfo = { status: 'Accepted' };
          }
        }

        const response = [3, uniqueId, { idTagInfo }];
        try { ws.send(JSON.stringify(response)); } catch {}
      } catch (err: any) {
        logger.error({ err, payload }, 'Failed to authorize idTag');
        const response = [4, uniqueId, OCPP_ERRORS.InternalError.code, OCPP_ERRORS.InternalError.description];
        try { ws.send(JSON.stringify(response)); } catch {}
      }
    },

    async lookupConnectorViaEvent(stationId: string, connectorNo: number): Promise<string | null> {
      const res = await emitAndWait<
        { stationId: string; connectorNo: number; requestId?: string },
        ConnectorLookupResolvedPayload
      >({
        requestType: 'connector.lookup.requested',
        requestPayload: { stationId, connectorNo },
        responseType: 'connector.lookup.resolved',
        timeoutMs: 2000,
      });
      if (!res) return null;
      if ((res as any).error) {
        logger.error({ err: (res as any).error, stationId, connectorNo }, 'Connector lookup error');
        return null;
      }
      return res.connectorUuid || null;
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
        let station: any = null;
        if ((stationService as any).findBySerial) {
          station = await (stationService as any).findBySerial(
            chargePointSerialNumber
          );
        } else {
          station = await stationService.getStationByName(
            chargePointSerialNumber
          );
        }

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
      
      let connectorUuid: string | null = null;
      try {
        const lookupFn = (this as any)?.lookupConnectorViaEvent || undefined;
        if (typeof lookupFn === 'function') {
          connectorUuid = await lookupFn.call(this, stationKey, connectorId);
        } else {
          logger.error({ stationKey, connectorId }, 'lookupConnectorViaEvent not available on handlers');
        }
      } catch (err: any) {
        logger.error({ err, stationKey, connectorId }, 'Error while looking up connector via event');
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
      const idempotencyKey = `status:${stationKey}:${connectorUuid}:${statusTime}`;
      const alreadyProcessed = await redis.get(idempotencyKey);
      if (alreadyProcessed) {
        ws.send(JSON.stringify([3, uniqueId, {}]));
        return;
      }

      try {
        if ((stationService as any).saveStatusNotification) {
          await (stationService as any).saveStatusNotification({
            time: statusTime,
            station_id: stationKey,
            connector_id: connectorUuid,
            status: data.status,
            error_code: data.error_code || null,
            info: data.info || null,
          });
        } else {
          emitStatusNotificationReceived({
            time: statusTime,
            station_id: stationKey,
            connector_id: connectorUuid,
            status: data.status,
            error_code: data.error_code || null,
            info: data.info || null,
          });
        }
      } catch (err: any) {
        logger.error({ err, stationKey, connectorId }, 'Failed to persist status notification');
      }
      const redisStatusKey = `status:latest:${stationKey}:${connectorUuid}`;
      await redis.set(
        redisStatusKey,
        JSON.stringify({
          time: statusTime,
          connector_id: connectorUuid,
          status: data.status,
          error_code: data.error_code,
          info: data.info,
        })
      );

      await redis.set(idempotencyKey, '1', 'EX', 86400);
      try {
        ws.send(JSON.stringify([3, uniqueId, {}]));
      } catch (err: any) {
        logger.error('Failed to send StatusNotification response:', err);
      }
    },
  };
}
