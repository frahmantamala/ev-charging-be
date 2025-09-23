import { StatusNotificationService } from '../status_notification.service';
import { eventBus } from '../../core/events/event-bus';
describe('StatusNotificationService', () => {
  it('should instantiate', () => {
    const service = new StatusNotificationService({} as any);
    expect(service).toBeDefined();
  });

  it('should call repository save when saveStatusNotification is called', async () => {
    const repo: any = { saveStatusNotification: jest.fn().mockResolvedValue(undefined) };
    const svc = new StatusNotificationService(repo);
    const payload = { time: new Date().toISOString(), station_id: 's1', connector_id: 'c1', status: 'Available' };
    await svc.saveStatusNotification(payload as any);
    expect(repo.saveStatusNotification).toHaveBeenCalled();
  });
});
