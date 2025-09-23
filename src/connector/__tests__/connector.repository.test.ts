import { ConnectorRepository } from '../connector.repository';
describe('ConnectorRepository', () => {
  it('should instantiate', () => {
    const repo = new ConnectorRepository({} as any);
    expect(repo).toBeDefined();
  });

  it('findOrCreateConnector creates connector when not exists', async () => {
    const fakeRepo: any = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockReturnValue({ station_id: 's1', connector_no: 1, type: 'Type2' }),
      save: jest.fn().mockImplementation(async (c: any) => { c.id = 'c-1'; return c; }),
    };
    const ds: any = { getRepository: () => fakeRepo };
    const repo = new ConnectorRepository(ds);
    const id = await repo.findOrCreateConnector('s1', 1);
    expect(id).toBe('c-1');
    expect(fakeRepo.create).toHaveBeenCalled();
  });
});
