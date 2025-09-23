import { StatusNotification } from '../core/datamodel/status_notification.model';
import { StatusNotificationRepository } from './status_notification.repository';

export class StatusNotificationService {
  constructor(private repo: StatusNotificationRepository) {}

  async saveStatusNotification(data: Omit<StatusNotification, 'created_at'>) {
    await this.repo.saveStatusNotification(data);
  }
}
