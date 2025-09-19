import { WebSocket } from 'ws';
import { Transaction } from '../core/datamodel/transaction.model';

// Define the interface for the service dependency
export interface ITransactionService {
  createTransaction(data: Omit<Transaction, 'id' | 'created_at'>): Promise<Transaction>;
  getTransactionById(id: string): Promise<Transaction | null>;
  updateTransactionStatus(id: string, status: Transaction['status'], stopTime?: string, stopMeter?: number): Promise<void>;
}

// Factory function to create handlers with injected service
export default function createTransactionHandlers(transactionService: ITransactionService) {
  return {
    async handleStartTransaction(payload: any, ws: WebSocket, uniqueId: string) {
      // Validate payload (add real validation as needed)
      const { connectorId, idTag, meterStart, timestamp } = payload;
      if (!connectorId || !idTag || meterStart == null || !timestamp) {
        const response = [4, uniqueId, 'ProtocolError', 'Missing required fields'];
        ws.send(JSON.stringify(response));
        return;
      }

      // Create transaction
      const transaction = await transactionService.createTransaction({
        connector_id: connectorId,
        start_time: timestamp,
        start_meter: meterStart,
        status: 'active',
        // Add other fields as needed
      });

      // Respond with OCPP StartTransactionResponse
      const response = [3, uniqueId, {
        transactionId: transaction.id,
        idTagInfo: { status: 'Accepted' }
      }];
      ws.send(JSON.stringify(response));
    },
    async handleStopTransaction(payload: any, ws: WebSocket, uniqueId: string) {
      // Validate payload (add real validation as needed)
      const { transactionId, meterStop, timestamp } = payload;
      if (!transactionId || meterStop == null || !timestamp) {
        const response = [4, uniqueId, 'ProtocolError', 'Missing required fields'];
        ws.send(JSON.stringify(response));
        return;
      }

      // Update transaction status
      await transactionService.updateTransactionStatus(transactionId, 'stopped', timestamp, meterStop);
      const transaction = await transactionService.getTransactionById(transactionId);

      // Respond with OCPP StopTransactionResponse
      const response = [3, uniqueId, {
        idTagInfo: { status: 'Accepted' }
      }];
      ws.send(JSON.stringify(response));
    }
  };
}
