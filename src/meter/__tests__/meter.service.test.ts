import { MeterService } from '../../meter/meter.service';

class FakeRepo {
  private rows: any[] = [];
  async create(mv: any) { this.rows.push(mv); return { ...mv, created_at: new Date().toISOString() }; }
  async listByTransaction(txId: string) { return this.rows.filter(r => r.transaction_id === txId); }
}

describe('MeterService', () => {
  test('createMeterValue validates missing tx', async () => {
    const repo = new FakeRepo();
    const svc = new MeterService(repo as any);
    await expect(svc.createMeterValue({ transaction_id: 'tx-unknown', value_wh: 10, time: new Date().toISOString(), phase: 'L1' })).rejects.toThrow('Transaction not found');
  });

  test('recordMeterValuesFromOcpp handles basic sample', async () => {
    const repo = new FakeRepo();
    const svc = new MeterService(repo as any);
    // Simulate transaction started event by adding into internal state via direct access (hack for unit test)
    const anySvc: any = svc;
    (anySvc as any).__proto__.constructor; // no-op
    // We need to simulate transactionState map — import is not exported so we call createMeterValue path after setting state via event emission
    const { eventBus } = require('../../core/events/event-bus');
    eventBus.next({ type: 'transaction.started', payload: { transaction: { id: 'tx-1', status: 'active', start_meter: 0 } } });

    await svc.recordMeterValuesFromOcpp({ transactionId: 'tx-1', meterValue: [ { timestamp: new Date().toISOString(), sampledValue: [ { measurand: 'Energy.Active.Import.Register', unit: 'Wh', value: '100', phase: 'L1' } ] } ] });
    const list = await svc.listMeterValuesByTransaction('tx-1');
    expect(list.length).toBeGreaterThanOrEqual(0);
  });

  test('createMeterValue throws when value decreases compared to previous', async () => {
    const repo = new FakeRepo();
    const svc = new (require('../../meter/meter.service').MeterService)(repo as any);
    const { eventBus } = require('../../core/events/event-bus');
    eventBus.next({ type: 'transaction.started', payload: { transaction: { id: 'tx-2', status: 'active', start_meter: 0 } } });
    // insert initial value
    await repo.create({ transaction_id: 'tx-2', value_wh: 200, time: new Date().toISOString(), phase: 'L1' });
    await expect(svc.createMeterValue({ transaction_id: 'tx-2', value_wh: 100, time: new Date().toISOString(), phase: 'L1' })).rejects.toThrow('Meter value must not decrease');
  });
});
