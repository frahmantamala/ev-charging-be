import { StatusNotificationService } from '../status_notification.service';
describe('StatusNotificationService', () => {
  it('should instantiate', () => {
    const service = new StatusNotificationService({} as any);
    expect(service).toBeDefined();
  });
});
