import { MeterValue } from '../core/datamodel/meter_value.model';
import { emitMeterValueReceived } from './meter.events';
import { onEvent } from '../core/events/event-bus';

interface IMeterRepository {
  create(meterValue: Omit<MeterValue, 'created_at'>): Promise<MeterValue>;
  listByTransaction(transactionId: string): Promise<MeterValue[]>;
}

type TxState = { status: string; start_meter: number };
const transactionState: Map<string, TxState> = new Map();

onEvent<{ transaction: { id: string; status: string; start_meter: number } }>('transaction.started', ({ transaction }) => {
  transactionState.set(transaction.id, { status: transaction.status, start_meter: transaction.start_meter });
});

onEvent<{ transaction: { id: string; status: string; start_meter: number } }>('transaction.stopped', ({ transaction }) => {
  transactionState.set(transaction.id, { status: transaction.status, start_meter: transaction.start_meter });
});

export class MeterService {
  constructor(private readonly repo: IMeterRepository) {}

  async createMeterValue(data: Omit<MeterValue, 'created_at'>): Promise<MeterValue> {
    const tx = transactionState.get(data.transaction_id);
    if (!tx) {
      throw new Error('Transaction not found');
    }
    if (tx.status !== 'active') {
      throw new Error('Transaction is not active');
    }

    const prev = await this.repo.listByTransaction(data.transaction_id);
    if (prev.length > 0) {
      const last = prev[prev.length - 1];
      if (data.value_wh < last.value_wh) {
        throw new Error('Meter value must not decrease');
      }
    } else if (data.value_wh < tx.start_meter) {
      throw new Error('Meter value must not be less than transaction start meter');
    }
    const meterValue = await this.repo.create(data);
    emitMeterValueReceived({
      transactionId: meterValue.transaction_id,
      valueWh: meterValue.value_wh,
      timestamp: meterValue.time,
      phase: meterValue.phase,
    });
    return meterValue;
  }

  async recordMeterValuesFromOcpp(payload: any) {
    const { transactionId, meterValue } = payload;
    if (transactionId === undefined || transactionId === null || !Array.isArray(meterValue) || meterValue.length === 0) {
      throw new Error('Missing transactionId or meterValue array');
    }

    for (const mv of meterValue) {
      const { timestamp, sampledValue } = mv;
      if (!timestamp || !Array.isArray(sampledValue)) continue;
      const whSample = sampledValue.find((s) => s.measurand === 'Energy.Active.Import.Register' && s.unit === 'Wh');
      if (!whSample) continue;
      const valueWh = Number(whSample.value);
      if (isNaN(valueWh)) continue;

      const phase = whSample.phase;

      const validationData: Omit<MeterValue, 'created_at'> = {
        transaction_id: transactionId,
        value_wh: valueWh,
        time: timestamp,
        phase,
      };

      await this.createMeterValue(validationData);
    }
    return;
  }

  async listMeterValuesByTransaction(transactionId: string): Promise<MeterValue[]> {
    return this.repo.listByTransaction(transactionId);
  }
}
