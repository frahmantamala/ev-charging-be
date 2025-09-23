import { ConnectorRepository } from '../connector.repository';
describe('ConnectorRepository', () => {
  it('should instantiate', () => {
    const repo = new ConnectorRepository({} as any);
    expect(repo).toBeDefined();
  });
});
