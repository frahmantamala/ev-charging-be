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
    await this.repo.updateStatus(id, status, stopTime, stopMeter);
    const transaction = await this.repo.findById(id);
    if (transaction && status === 'stopped') {
      emitTransactionStopped({ transaction });
    }
  }

  async listTransactionsByConnector(connectorId: string): Promise<Transaction[]> {
    return this.repo.listByConnector(connectorId);
  }
}
