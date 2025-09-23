import { WebSocket } from 'ws';
import { StatusNotificationService } from './status_notification.service';
import { StatusNotificationSchema } from '../core/common/validation';
import { OCPP_ERRORS } from '../core/ocpp-errors';
import logger, { maskSensitive } from '../core/logger';
import { wsStationMap } from '../stations/station.ws';
import { emitAndWait } from '../core/events/event-bus';

export default function createStatusNotificationHandlers(
  statusNotificationService: StatusNotificationService
) {
  return {
    async handleSaveStatusNotification(
      payload: any,
      ws: WebSocket,
      uniqueId: string
    ) {
      logger.info(
        { action: 'StatusNotification', payload: maskSensitive(payload) },
        'Received StatusNotification (ws handler)'
      );
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
      try {
        const stationKey = wsStationMap.get(ws) || data.stationId || '';
        if (!stationKey) {
          const response = [4, uniqueId, OCPP_ERRORS.ProtocolError.code, OCPP_ERRORS.ProtocolError.description + ' (Missing station context)'];
          try { ws.send(JSON.stringify(response)); } catch {}
          return;
        }

        const connectorNo = data.connectorId ?? data.connector_id;
        if (connectorNo == null) {
          const response = [4, uniqueId, OCPP_ERRORS.ProtocolError.code, OCPP_ERRORS.ProtocolError.description + ' (Missing connectorId)'];
          try { ws.send(JSON.stringify(response)); } catch {}
          return;
        }

        const res = await emitAndWait<{ stationId: string; connectorNo: number; requestId?: string }, any>({
          requestType: 'connector.lookup.requested',
          requestPayload: { stationId: stationKey, connectorNo: Number(connectorNo) },
          responseType: 'connector.lookup.resolved',
          timeoutMs: 2000,
        });

        const connectorUuid = res?.connectorUuid || null;
        if (!connectorUuid) {
          const response = [4, uniqueId, OCPP_ERRORS.ProtocolError.code, OCPP_ERRORS.ProtocolError.description + ' (Connector lookup failed)'];
          try { ws.send(JSON.stringify(response)); } catch {}
          return;
        }

        await statusNotificationService.saveStatusNotification({
          time: data.time || new Date().toISOString(),
          station_id: stationKey,
          connector_id: connectorUuid,
          status: data.status,
          error_code: data.error_code || undefined,
          info: data.info || undefined,
        });
        try {
          ws.send(JSON.stringify([3, uniqueId, {}]));
        } catch {}
      } catch (err: any) {
        logger.error(
          { err, payload },
          'Failed to save status notification via service'
        );
        const response = [
          4,
          uniqueId,
          OCPP_ERRORS.InternalError.code,
          OCPP_ERRORS.InternalError.description,
        ];
        try {
          ws.send(JSON.stringify(response));
        } catch {}
      }
    },
  };
}
