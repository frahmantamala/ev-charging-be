import { WebSocket } from 'ws';
import { Transaction } from '../core/datamodel/transaction.model';
import { OCPP_ERRORS } from '../core/ocpp-errors';
import logger, { maskSensitive } from '../core/logger';
import Redis from 'ioredis';
import { StartTransactionSchema, StopTransactionSchema } from '../core/common/validation';
import { wsStationMap } from '../stations/station.ws';

export interface ITransactionService {
  createTransaction(data: Omit<Transaction, 'id' | 'created_at'>): Promise<Transaction>;
  getTransactionById(id: string): Promise<Transaction | null>;
  updateTransactionStatus(id: string, status: Transaction['status'], stopTime?: string, stopMeter?: number): Promise<void>;
  startTransactionWithDependencies?: (params: any, deps: any) => Promise<{ transaction: Transaction; idTagInfo: any }>;
}

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export default function createTransactionHandlers(transactionService: ITransactionService) {
  return {
    async handleStartTransaction(payload: any, ws: WebSocket, uniqueId: string) {
      logger.info({ action: 'StartTransaction', payload: maskSensitive(payload) }, 'Received StartTransaction');
      const validation = StartTransactionSchema.safeParse(payload);
      if (!validation.success) {
        const errorMsg = validation.error.issues.map((e: any) => e.message).join('; ');
        const response = [4, uniqueId, OCPP_ERRORS.ProtocolError.code, OCPP_ERRORS.ProtocolError.description + ` (${errorMsg})`];
        try { ws.send(JSON.stringify(response)); } catch {
          const { connectionManager } = require('../ws/connection.manager');
          if (payload.stationId) connectionManager.queueMessage(payload.stationId, JSON.stringify(response));
        }
        return;
      }

      const { connectorId, idTag, meterStart, timestamp } = validation.data;
      const stationKey = wsStationMap.get(ws) || validation.data.stationId || undefined;
      if (!stationKey) {
        const response = [4, uniqueId, OCPP_ERRORS.ProtocolError.code, OCPP_ERRORS.ProtocolError.description + ' (Missing station context)'];
        try { ws.send(JSON.stringify(response)); } catch {
          const { connectionManager } = require('../ws/connection.manager');
          if (validation.data.stationId) connectionManager.queueMessage(validation.data.stationId, JSON.stringify(response));
        }
        return;
      }

      try {
        const svc: any = transactionService as any;
        const { transaction, idTagInfo } = await svc.startTransactionWithDependencies(
          { connectorId, idTag, meterStart, timestamp, stationId: stationKey },
          {
            idTagService: {
              authorize: async (t: string) => {
                const cached = await redis.get(`idtag:status:${t}`);
                if (cached) return JSON.parse(cached);
                const { IdTagService } = require('../id_tag/id_tag.service');
                const { AppDataSource } = require('../database/config');
                const { IdTagRepository } = require('../id_tag/id_tag.repository');
                const idTagSvc = new IdTagService(new IdTagRepository(AppDataSource));
                return await idTagSvc.authorize(t);
              }
            },
            connectorService: {
              findOrCreateConnector: async (stationKey: string, connNo: number) => {
                const { ConnectorService } = require('../connector/connector.service');
                const connectorService = new ConnectorService();
                return await connectorService.findOrCreateConnector(stationKey, connNo);
              }
            },
            redis,
          }
        );

        const response = [3, uniqueId, { transactionId: transaction.id, idTagInfo }];
        try { ws.send(JSON.stringify(response)); } catch {
          const { connectionManager } = require('../ws/connection.manager');
          if (payload.stationId) connectionManager.queueMessage(payload.stationId, JSON.stringify(response));
        }
      } catch (err: any) {
        logger.error({ err, action: 'StartTransaction', payload: maskSensitive(payload) }, 'StartTransaction error');
        let errorCode = OCPP_ERRORS.ProtocolError.code;
        let errorDescription = OCPP_ERRORS.ProtocolError.description;
        if (err && err.code === 'IDTAG_NOT_AUTHORIZED') {
          errorCode = OCPP_ERRORS.SecurityError.code;
          errorDescription = 'RFID tag not authorized or expired';
        } else if (err && err.message && err.message.includes('active transaction for this connector')) {
          errorCode = OCPP_ERRORS.TypeConstraintViolation.code;
          errorDescription = 'There is already an active transaction for this connector.';
        } else if (err && err.cause) {
          errorDescription = String(err.cause?.message || err.message || err);
        } else if (err && err.message) {
          errorDescription = err.message;
        }
        const response = [4, uniqueId, errorCode, errorDescription];
        try { ws.send(JSON.stringify(response)); } catch {
          const { connectionManager } = require('../ws/connection.manager');
          if (payload.stationId) connectionManager.queueMessage(payload.stationId, JSON.stringify(response));
        }
      }
    },

    async handleStopTransaction(payload: any, ws: WebSocket, uniqueId: string) {
      logger.info({ action: 'StopTransaction', payload: maskSensitive(payload) }, 'Received StopTransaction');
      const validation = StopTransactionSchema.safeParse(payload);
      if (!validation.success) {
        const errorMsg = validation.error.issues.map((e: any) => e.message).join('; ');
        const response = [4, uniqueId, OCPP_ERRORS.ProtocolError.code, OCPP_ERRORS.ProtocolError.description + ` (${errorMsg})`];
        try { ws.send(JSON.stringify(response)); } catch {
          const { connectionManager } = require('../ws/connection.manager');
          if (payload.stationId) connectionManager.queueMessage(payload.stationId, JSON.stringify(response));
        }
        return;
      }

      const { transactionId, meterStop, timestamp } = validation.data;

      try {
        await transactionService.updateTransactionStatus(transactionId, 'stopped', timestamp, meterStop);
        const transaction = await transactionService.getTransactionById(transactionId);
        logger.info({ transactionId }, 'Transaction stopped');
        const response = [3, uniqueId, { idTagInfo: { status: 'Accepted' } }];
        try { ws.send(JSON.stringify(response)); } catch {
          const { connectionManager } = require('../ws/connection.manager');
          if (payload.stationId) connectionManager.queueMessage(payload.stationId, JSON.stringify(response));
        }
      } catch (err: any) {
        logger.error({ err, action: 'StopTransaction', payload: maskSensitive(payload) }, 'StopTransaction error');
        let errorCode = OCPP_ERRORS.ProtocolError.code;
        let errorDescription = OCPP_ERRORS.ProtocolError.description;
        if (typeof err.message === 'string') {
          if (err.message.includes('Transaction not found')) {
            errorCode = OCPP_ERRORS.NotFound.code;
            errorDescription = 'Transaction does not exist.';
          } else if (err.message.includes('Only active transactions can be stopped')) {
            errorCode = OCPP_ERRORS.SecurityError.code;
            errorDescription = 'Only active transactions can be stopped.';
          } else if (err.message.includes('Stop meter value must be >= start meter value')) {
            errorCode = OCPP_ERRORS.TypeConstraintViolation.code;
            errorDescription = 'Stop meter value must be >= start meter value.';
          } else {
            errorDescription = err.message;
          }
        }
        const response = [4, uniqueId, errorCode, errorDescription];
        try { ws.send(JSON.stringify(response)); } catch {
          const { connectionManager } = require('../ws/connection.manager');
          if (payload.stationId) connectionManager.queueMessage(payload.stationId, JSON.stringify(response));
        }
      }
    },
  };
}
