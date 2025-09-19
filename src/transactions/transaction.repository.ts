import { Transaction } from '../core/datamodel/transaction.model';
import { TransactionEntity } from './transaction.entity';
import { Repository } from 'typeorm';

export class TypeOrmTransactionRepository {
  constructor(private readonly repo: Repository<TransactionEntity>) {}

  async create(transaction: Omit<Transaction, 'id' | 'created_at'>): Promise<Transaction> {
    const entity = this.repo.create({
      ...transaction,
      start_time: new Date(transaction.start_time),
      stop_time: transaction.stop_time ? new Date(transaction.stop_time) : undefined,
      created_at: new Date(),
    });
    const saved = await this.repo.save(entity);
    return this.toModel(saved);
  }

  async findById(id: string): Promise<Transaction | null> {
    const found = await this.repo.findOneBy({ id });
    return found ? this.toModel(found) : null;
  }

  async findActiveByConnector(connectorId: string): Promise<Transaction | null> {
    const found = await this.repo.findOneBy({ connector_id: connectorId, status: 'active' });
    return found ? this.toModel(found) : null;
  }

  async updateStatus(id: string, status: Transaction['status'], stopTime?: string, stopMeter?: number): Promise<void> {
    await this.repo.update(id, {
      status,
      stop_time: stopTime ? new Date(stopTime) : undefined,
      stop_meter: stopMeter,
    });
  }

  async listByConnector(connectorId: string): Promise<Transaction[]> {
    const found = await this.repo.find({
      where: { connector_id: connectorId },
      order: { start_time: 'DESC' },
    });
    return found.map(this.toModel);
  }

  private toModel(entity: TransactionEntity): Transaction {
    return {
      id: entity.id,
      connector_id: entity.connector_id,
      start_time: entity.start_time.toISOString(),
      stop_time: entity.stop_time ? entity.stop_time.toISOString() : undefined,
      start_meter: entity.start_meter,
      stop_meter: entity.stop_meter,
      status: entity.status,
      created_at: entity.created_at.toISOString(),
    };
  }
}
