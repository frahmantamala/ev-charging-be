import { StationService } from '../station.service';

describe('StationService', () => {
  it('should throw if station name is missing', async () => {
    const repo = { findByName: jest.fn(), create: jest.fn() };
    const service = new StationService(repo as any);
    await expect(service.createStation({ name: '' } as any)).rejects.toThrow('Station name is required');
  });
});
