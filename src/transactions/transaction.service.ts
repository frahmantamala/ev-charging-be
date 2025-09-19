import { Transaction } from '../core/datamodel/transaction.model';
import { emitTransactionStarted, emitTransactionStopped } from './transaction.events';

export interface ITransactionRepository {
  create(transaction: Omit<Transaction, 'id' | 'created_at'>): Promise<Transaction>;
  findById(id: string): Promise<Transaction | null>;
  findActiveByConnector(connectorId: string): Promise<Transaction | null>;
  updateStatus(id: string, status: Transaction['status'], stopTime?: string, stopMeter?: number): Promise<void>;
  listByConnector(connectorId: string): Promise<Transaction[]>;
}

export class TransactionService {
  constructor(private readonly repo: ITransactionRepository) {}

  async createTransaction(data: Omit<Transaction, 'id' | 'created_at'>): Promise<Transaction> {
    const active = await this.repo.findActiveByConnector(data.connector_id);
    if (active) {
      throw new Error('There is already an active transaction for this connector');
    }

    if (data.start_meter < 0) {
      throw new Error('Start meter value must be >= 0');
    }
    const transaction = await this.repo.create(data);
    emitTransactionStarted({ transaction });
    return transaction;
  }

  async getTransactionById(id: string): Promise<Transaction | null> {
    return this.repo.findById(id);
  }

  async getActiveTransactionByConnector(connectorId: string): Promise<Transaction | null> {
    return this.repo.findActiveByConnector(connectorId);
  }

  async updateTransactionStatus(id: string, status: Transaction['status'], stopTime?: string, stopMeter?: number): Promise<void> {
    const transaction = await this.repo.findById(id);
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    if (status === 'stopped' && transaction.status !== 'active') {
      throw new Error('Only active transactions can be stopped');
    }
    
    if (status === 'stopped' && stopMeter != null && stopMeter < transaction.start_meter) {
      throw new Error('Stop meter value must be >= start meter value');
    }
    await this.repo.updateStatus(id, status, stopTime, stopMeter);
    const updated = await this.repo.findById(id);
    if (updated && status === 'stopped') {
      emitTransactionStopped({ transaction: updated });
    }
  }

  async listTransactionsByConnector(connectorId: string): Promise<Transaction[]> {
    return this.repo.listByConnector(connectorId);
  }
}
