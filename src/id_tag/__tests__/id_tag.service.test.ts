import { IdTagService } from '../id_tag.service';
describe('IdTagService', () => {
  it('should instantiate', () => {
    const service = new IdTagService({} as any);
    expect(service).toBeDefined();
  });
});
