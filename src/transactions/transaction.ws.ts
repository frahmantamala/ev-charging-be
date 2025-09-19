import { WebSocket } from 'ws';
import { Transaction } from '../core/datamodel/transaction.model';

export interface ITransactionService {
  createTransaction(data: Omit<Transaction, 'id' | 'created_at'>): Promise<Transaction>;
  getTransactionById(id: string): Promise<Transaction | null>;
  updateTransactionStatus(id: string, status: Transaction['status'], stopTime?: string, stopMeter?: number): Promise<void>;
}

export default function createTransactionHandlers(transactionService: ITransactionService) {
  return {
    async handleStartTransaction(payload: any, ws: WebSocket, uniqueId: string) {
      const { connectorId, idTag, meterStart, timestamp } = payload;
      if (!connectorId || !idTag || meterStart == null || !timestamp) {
        const response = [4, uniqueId, 'ProtocolError', 'Missing required fields'];
        try {
          ws.send(JSON.stringify(response));
        } catch {
          const { connectionManager } = require('../ws/connection.manager');
          if (payload.stationId) {
            connectionManager.queueMessage(payload.stationId, JSON.stringify(response));
          }
        }
        return;
      }

      const transaction = await transactionService.createTransaction({
        connector_id: connectorId,
        start_time: timestamp,
        start_meter: meterStart,
        status: 'active',
      });

      const response = [3, uniqueId, {
        transactionId: transaction.id,
        idTagInfo: { status: 'Accepted' }
      }];
      try {
        ws.send(JSON.stringify(response));
      } catch {
        const { connectionManager } = require('../ws/connection.manager');
        if (payload.stationId) {
          connectionManager.queueMessage(payload.stationId, JSON.stringify(response));
        }
      }
    },
    async handleStopTransaction(payload: any, ws: WebSocket, uniqueId: string) {
      const { transactionId, meterStop, timestamp } = payload;
      if (!transactionId || meterStop == null || !timestamp) {
        const response = [4, uniqueId, 'ProtocolError', 'Missing required fields'];
        try {
          ws.send(JSON.stringify(response));
        } catch {
          const { connectionManager } = require('../ws/connection.manager');
          if (payload.stationId) {
            connectionManager.queueMessage(payload.stationId, JSON.stringify(response));
          }
        }
        return;
      }

      await transactionService.updateTransactionStatus(transactionId, 'stopped', timestamp, meterStop);
      const transaction = await transactionService.getTransactionById(transactionId);

      const response = [3, uniqueId, {
        idTagInfo: { status: 'Accepted' }
      }];
      try {
        ws.send(JSON.stringify(response));
      } catch {
        const { connectionManager } = require('../ws/connection.manager');
        if (payload.stationId) {
          connectionManager.queueMessage(payload.stationId, JSON.stringify(response));
        }
      }
    }
  };
}
