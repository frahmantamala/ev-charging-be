import { TransactionService } from '../../transactions/transaction.service';

// Minimal fake repo to test createTransaction and startTransactionWithDependencies orchestration
class FakeTxRepo {
  private rows: any[] = [];
  async create(tx: any) {
    const created = { id: 'tx-1', ...tx, created_at: new Date().toISOString() };
    this.rows.push(created);
    return created;
  }
  async findById(id: string) { return this.rows.find(r => r.id === id) || null; }
  async findActiveByConnector(connectorId: string) { return null; }
  async updateStatus() { }
  async listByConnector() { return []; }
}

describe('TransactionService', () => {
  test('startTransactionWithDependencies rejects unauthorized idTag', async () => {
    const repo = new FakeTxRepo();
    const svc = new TransactionService(repo as any);
    // idTagService.authorize will return Blocked
    await expect(svc.startTransactionWithDependencies({ connectorId: 1, idTag: 'BAD', meterStart: 0, timestamp: new Date().toISOString() }, {
      idTagService: { authorize: async (t: string) => ({ status: 'Blocked' }) },
      connectorService: { findOrCreateConnector: async () => 'connector-uuid' },
    })).rejects.toMatchObject({ code: 'IDTAG_NOT_AUTHORIZED' });
  });

  test('startTransactionWithDependencies creates transaction when idTag accepted', async () => {
    const repo = new FakeTxRepo();
    const svc = new TransactionService(repo as any);
    const result = await svc.startTransactionWithDependencies({ connectorId: 1, idTag: 'GOOD', meterStart: 0, timestamp: new Date().toISOString() }, {
      idTagService: { authorize: async (t: string) => ({ status: 'Accepted' }) },
      connectorService: { findOrCreateConnector: async () => 'connector-uuid' },
    });
    expect(result.transaction).toBeDefined();
    expect(result.idTagInfo.status).toBe('Accepted');
  });

  test('createTransaction throws when active transaction exists for connector', async () => {
    const repo = new FakeTxRepo();
    // override findActiveByConnector to simulate active
  (repo as any).findActiveByConnector = async (c: string) => ({ id: 'active-1', connector_id: c, status: 'active', start_meter: 0 });
    const svc = new (require('../../transactions/transaction.service').TransactionService)(repo as any);
    await expect(svc.createTransaction({ connector_id: 'c-1', start_time: new Date().toISOString(), start_meter: 0, status: 'active' })).rejects.toThrow('There is already an active transaction for this connector');
  });
});
