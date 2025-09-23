import { DataSource } from 'typeorm';
import { StatusNotification } from '../core/datamodel/status_notification.model';
import { StatusNotificationEntity } from './status_notification.entity';
import logger from '../core/logger';

export class StatusNotificationRepository {
  private repo = this.dataSource.getRepository(StatusNotificationEntity);
  constructor(private dataSource: DataSource) {}

  async saveStatusNotification(data: Omit<StatusNotification, 'created_at'>): Promise<void> {
    const rec = this.repo.create({
      time: new Date(data.time),
      station_id: data.station_id || null,
      connector_id: data.connector_id,
      status: data.status,
      error_code: data.error_code || null,
      info: data.info || null,
    } as any);
    try {
      await this.repo.save(rec);
    } catch (err) {
      logger.error({ err }, 'Failed to save status notification');
    }
  }
}
