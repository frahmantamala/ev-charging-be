import { WebSocket } from 'ws';
import { Transaction } from '../core/datamodel/transaction.model';
import { OCPP_ERRORS } from '../core/ocpp-errors';
import logger, { maskSensitive } from '../core/logger';
import {
  StartTransactionSchema,
  StopTransactionSchema,
} from '../core/common/validation';
import Redis from 'ioredis';
import { wsStationMap } from '../stations/station.ws';
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export interface ITransactionService {
  createTransaction(
    data: Omit<Transaction, 'id' | 'created_at'>
  ): Promise<Transaction>;
  getTransactionById(id: string): Promise<Transaction | null>;
  updateTransactionStatus(
    id: string,
    status: Transaction['status'],
    stopTime?: string,
    stopMeter?: number
  ): Promise<void>;
}

export default function createTransactionHandlers(
  transactionService: ITransactionService
) {
  return {
    async handleStartTransaction(
      payload: any,
      ws: WebSocket,
      uniqueId: string
    ) {
      logger.info(
        { action: 'StartTransaction', payload: maskSensitive(payload) },
        'Received StartTransaction'
      );
      const validation = StartTransactionSchema.safeParse(payload);
      logger.info({ validation }, 'Validation result');
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
        } catch (err: any) {
          logger.error(
            { err },
            'Failed to send StartTransaction error response'
          );
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
      const { connectorId, idTag, meterStart, timestamp } = validation.data;
      // Validate idTag from Redis (fast path)
      let idTagInfo: {
        status: string;
        expiryDate?: string;
        parentIdTag?: string;
      } = { status: 'Blocked' };
      try {
        const cached = await redis.get(`idtag:status:${idTag}`);
        if (cached) {
          logger.info({ idTag }, 'idTag status found in cache');
          idTagInfo = JSON.parse(cached);
        } else {
          logger.info(
            { idTag },
            'idTag status not in cache, querying DB/service'
          );
          const { IdTagService } = require('../stations/id_tag.service');
          const { AppDataSource } = require('../database/config');
          const { IdTagRepository } = require('../stations/id_tag.repository');
          const idTagService = new IdTagService(
            new IdTagRepository(AppDataSource)
          );
          const result = await idTagService.authorize(idTag);
          idTagInfo = { status: result.status };
          if (result.expiryDate) idTagInfo.expiryDate = result.expiryDate;
          if (result.parentIdTag) idTagInfo.parentIdTag = result.parentIdTag;
          // Cache for next time
          await redis.set(
            `idtag:status:${idTag}`,
            JSON.stringify(idTagInfo),
            'EX',
            3600
          );
        }
      } catch (err) {
        logger.error(
          { err, idTag },
          'Failed to validate idTag for StartTransaction'
        );
      }
      logger.info({ idTag, idTagInfo }, 'idTag validation result');
      if (idTagInfo.status !== 'Accepted') {
        const response = [
          4,
          uniqueId,
          OCPP_ERRORS.SecurityError.code,
          'RFID tag not authorized or expired',
        ];
        try {
          ws.send(JSON.stringify(response));
        } catch {}
        return;
      }

      // Map connectorId (number) to connector UUID using station context
      let connectorUuid: string | null = null;
      try {
        const stationKey = wsStationMap.get(ws) || payload.stationId || '';
        if (!stationKey) {
          logger.error(
            { connectorId, idTag },
            'Missing station context for StartTransaction'
          );
          const response = [
            4,
            uniqueId,
            OCPP_ERRORS.ProtocolError.code,
            OCPP_ERRORS.ProtocolError.description +
              ' (Missing station context)',
          ];
          try {
            ws.send(JSON.stringify(response));
          } catch {}
          return;
        }
        const {
          ConnectorRepository,
        } = require('../stations/connector.repository');
        const { AppDataSource } = require('../database/config');
        const connectorRepo = new ConnectorRepository(AppDataSource);
        connectorUuid = await connectorRepo.findOrCreateConnector(
          stationKey,
          connectorId
        );
      } catch (err) {
        logger.error(
          { err, connectorId },
          'Failed to look up or create connector UUID for StartTransaction'
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
      if (!connectorUuid) {
        logger.error(
          { connectorId },
          'Connector UUID not found or created for StartTransaction'
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
      try {
        const transaction = await transactionService.createTransaction({
          connector_id: connectorUuid,
          start_time: timestamp,
          start_meter: meterStart,
          status: 'active',
        });
        logger.info(
          { connectorId, transactionId: transaction.id },
          'Transaction started'
        );
        const response = [
          3,
          uniqueId,
          { transactionId: transaction.id, idTagInfo },
        ];
        try {
          ws.send(JSON.stringify(response));
        } catch {}
      } catch (err: any) {
        logger.error(
          { err, action: 'StartTransaction', payload: maskSensitive(payload) },
          'StartTransaction error'
        );
        let errorCode = OCPP_ERRORS.ProtocolError.code;
        let errorDescription = OCPP_ERRORS.ProtocolError.description;
        if (typeof err.message === 'string') {
          if (err.message.includes('active transaction for this connector')) {
            errorCode = OCPP_ERRORS.TypeConstraintViolation.code;
            errorDescription =
              'There is already an active transaction for this connector.';
          } else if (err.message.includes('Start meter value must be >= 0')) {
            errorCode = OCPP_ERRORS.TypeConstraintViolation.code;
            errorDescription = 'Start meter value must be >= 0.';
          } else {
            errorDescription = err.message;
          }
        }
        const response = [4, uniqueId, errorCode, errorDescription];
        try {
          ws.send(JSON.stringify(response));
        } catch {}
      }
    },
    async handleStopTransaction(payload: any, ws: WebSocket, uniqueId: string) {
      logger.info(
        { action: 'StopTransaction', payload: maskSensitive(payload) },
        'Received StopTransaction'
      );
      const validation = StopTransactionSchema.safeParse(payload);
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
          if (payload.stationId) {
            connectionManager.queueMessage(
              payload.stationId,
              JSON.stringify(response)
            );
          }
        }
        return;
      }
      const { transactionId, meterStop, timestamp } = validation.data;

      try {
        await transactionService.updateTransactionStatus(
          transactionId,
          'stopped',
          timestamp,
          meterStop
        );
        const transaction = await transactionService.getTransactionById(
          transactionId
        );
        logger.info({ transactionId }, 'Transaction stopped');
        const response = [
          3,
          uniqueId,
          {
            idTagInfo: { status: 'Accepted' },
          },
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
      } catch (err: any) {
        logger.error(
          { err, action: 'StopTransaction', payload: maskSensitive(payload) },
          'StopTransaction error'
        );
        let errorCode = OCPP_ERRORS.ProtocolError.code;
        let errorDescription = OCPP_ERRORS.ProtocolError.description;
        if (typeof err.message === 'string') {
          if (err.message.includes('Transaction not found')) {
            errorCode = OCPP_ERRORS.NotFound.code;
            errorDescription = 'Transaction does not exist.';
          } else if (
            err.message.includes('Only active transactions can be stopped')
          ) {
            errorCode = OCPP_ERRORS.SecurityError.code;
            errorDescription = 'Only active transactions can be stopped.';
          } else if (
            err.message.includes(
              'Stop meter value must be >= start meter value'
            )
          ) {
            errorCode = OCPP_ERRORS.TypeConstraintViolation.code;
            errorDescription = 'Stop meter value must be >= start meter value.';
          } else {
            errorDescription = err.message;
          }
        }
        const response = [4, uniqueId, errorCode, errorDescription];
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
