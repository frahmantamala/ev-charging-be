import { MeterValue } from '../core/datamodel/meter_value.model';
import { emitMeterValueReceived } from './meter.events';

interface IMeterRepository {
  create(meterValue: Omit<MeterValue, 'created_at'>): Promise<MeterValue>;
  listByTransaction(transactionId: string): Promise<MeterValue[]>;
}

export class MeterService {
  constructor(private readonly repo: IMeterRepository) {}

  async createMeterValue(data: Omit<MeterValue, 'created_at'>): Promise<MeterValue> {
    const meterValue = await this.repo.create(data);
    emitMeterValueReceived({
      transactionId: meterValue.transaction_id,
      valueWh: meterValue.value_wh,
      timestamp: meterValue.time,
      phase: meterValue.phase,
    });
    return meterValue;
  }

  async listMeterValuesByTransaction(transactionId: string): Promise<MeterValue[]> {
    return this.repo.listByTransaction(transactionId);
  }
}
