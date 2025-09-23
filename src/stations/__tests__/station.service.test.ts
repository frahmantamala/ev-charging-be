import { StationService } from '../station.service';

describe('StationService', () => {
  it('should throw if station name is missing', async () => {
    const repo = { findByName: jest.fn(), create: jest.fn() };
    const service = new StationService(repo as any);
    await expect(service.createStation({ name: '' } as any)).rejects.toThrow('Station name is required');
  });

  it('should create station when name is unique', async () => {
    const repo: any = { findByName: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ id: 's-1', name: 'MyStation' }) };
    const svc = new StationService(repo);
    const created = await svc.createStation({ name: 'MyStation' } as any);
    expect(created.id).toBe('s-1');
    expect(repo.create).toHaveBeenCalled();
  });
});
