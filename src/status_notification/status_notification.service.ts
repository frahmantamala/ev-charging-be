import { StatusNotification } from '../core/datamodel/status_notification.model';
import { StatusNotificationRepository } from '../status_notification/status_notification.repository';
import { onEvent } from '../core/events/event-bus';
import { StatusNotificationReceivedPayload } from './status_notification.events';
import logger from '../core/logger';

export class StatusNotificationService {
  constructor(private repo: StatusNotificationRepository) {
    try {
      onEvent<StatusNotificationReceivedPayload>('status.notification.received', async (payload) => {
        try {
          await this.repo.saveStatusNotification({
            time: payload.time,
            station_id: payload.station_id || undefined,
            connector_id: payload.connector_id,
            status: payload.status,
            error_code: payload.error_code || undefined,
            info: payload.info || undefined,
          });
        } catch (err: any) {
          logger.error({ err, payload }, 'Failed to persist status notification');
        }
      });
    } catch (err) {
      logger.error({ err }, 'Failed to subscribe to status.notification.received event');
    }
  }

  async saveStatusNotification(data: Omit<StatusNotification, 'created_at'>) {
    await this.repo.saveStatusNotification(data);
  }
}
