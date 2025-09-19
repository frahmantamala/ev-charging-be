import { MeterValue } from '../core/datamodel/meter_value.model';
import { MeterValueEntity } from './meter.entity';
import { Repository } from 'typeorm';

export class TypeOrmMeterRepository {
  constructor(private readonly repo: Repository<MeterValueEntity>) {}

  async create(meterValue: Omit<MeterValue, 'created_at'>): Promise<MeterValue> {
    const entity = this.repo.create({
      ...meterValue,
      time: new Date(meterValue.time),
      created_at: new Date(),
    });
    const saved = await this.repo.save(entity);
    return this.toModel(saved);
  }

  async listByTransaction(transactionId: string): Promise<MeterValue[]> {
    const found = await this.repo.find({
      where: { transaction_id: transactionId },
      order: { time: 'ASC' },
    });
    return found.map(this.toModel);
  }

  private toModel(entity: MeterValueEntity): MeterValue {
    return {
      time: entity.time.toISOString(),
      transaction_id: entity.transaction_id,
      value_wh: Number(entity.value_wh),
      phase: entity.phase,
      created_at: entity.created_at.toISOString(),
    };
  }
}

