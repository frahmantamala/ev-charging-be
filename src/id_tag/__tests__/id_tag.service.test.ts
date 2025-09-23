import { IdTagService } from '../id_tag.service';
describe('IdTagService', () => {
  it('should instantiate', () => {
    const service = new IdTagService({} as any);
    expect(service).toBeDefined();
  });

  it('authorize should create idTag when not found', async () => {
    const repo: any = { findByIdTag: jest.fn().mockResolvedValue(null), createIdTag: jest.fn().mockResolvedValue({ idTag: 'X', status: 'Accepted' }) };
    const svc = new IdTagService(repo);
    const res = await svc.authorize('X');
    expect(res.status).toBe('Accepted');
    expect(repo.createIdTag).toHaveBeenCalledWith('X', 'Accepted');
  });
});
