import { WebSocket } from 'ws';
import { MeterValue } from '../core/datamodel/meter_value.model';
import { OCPP_ERRORS } from '../core/ocpp-errors';
import logger, { maskSensitive } from '../core/logger';
import { MeterValuesSchema } from '../core/common/validation';

export interface IMeterService {
  createMeterValue(data: Omit<MeterValue, 'created_at'>): Promise<MeterValue>;
  listMeterValuesByTransaction(transactionId: string): Promise<MeterValue[]>;
}

export default function createMeterHandlers(meterService: IMeterService) {
  return {
    async handleMeterValues(payload: any, ws: WebSocket, uniqueId: string) {
      logger.info(
        { action: 'MeterValues', payload: maskSensitive(payload) },
        'Received MeterValues'
      );

      try {
        const { transactionId, meterValue } = payload;
        if (
          transactionId === undefined || transactionId === null ||
          !Array.isArray(meterValue) ||
          meterValue.length === 0
        ) {
          throw new Error('Missing transactionId or meterValue array');
        }

        for (const mv of meterValue) {
          const { timestamp, sampledValue } = mv;
          if (!timestamp || !Array.isArray(sampledValue)) continue;
          const whSample = sampledValue.find(
            (s) =>
              s.measurand === 'Energy.Active.Import.Register' && s.unit === 'Wh'
          );
          if (!whSample) continue;
          const valueWh = Number(whSample.value);
          if (isNaN(valueWh)) continue;

          const phase = whSample.phase;

          const validation = MeterValuesSchema.safeParse({
            transactionId,
            valueWh,
            timestamp,
            phase,
          });
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
            logger.error({ err: errorMsg, payload }, 'Validation failed for MeterValues');
            try {
              ws.send(JSON.stringify(response));
            } catch {
              logger.error({ err: errorMsg, payload }, 'Failed to send ProtocolError response');
              const { connectionManager } = require('../ws/connection.manager');
              if (payload.stationId) {
                connectionManager.queueMessage(
                  payload.stationId,
                  JSON.stringify(response)
                );
              }
            }
            return;
          }

          logger.info(
            { transactionId, valueWh, timestamp },
            'Recording meter value'
          );

          await meterService.createMeterValue({
            transaction_id: transactionId,
            value_wh: valueWh,
            time: timestamp,
            phase,
          });
          logger.info(
            { transactionId, valueWh, timestamp },
            'Meter value recorded'
          );
        }
        const response = [3, uniqueId, {}];
        try {
          ws.send(JSON.stringify(response));
        } catch {
          const { connectionManager } = require('../ws/connection.manager');
          if (payload.stationId) {
            connectionManager.queueMessage(
              payload.stationId,
              JSON.stringify(response)
            );
          }
        }
      } catch (err: any) {
        logger.error({ err, payload }, 'Failed to process MeterValues');
        const response = [
          4,
          uniqueId,
          OCPP_ERRORS.ProtocolError.code,
          OCPP_ERRORS.ProtocolError.description + ` (${err.message})`,
        ];
        try {
          ws.send(JSON.stringify(response));
        } catch {
          const { connectionManager } = require('../ws/connection.manager');
          if (payload.stationId) {
            connectionManager.queueMessage(
              payload.stationId,
              JSON.stringify(response)
            );
          }
        }
      }
    },
  };
}
