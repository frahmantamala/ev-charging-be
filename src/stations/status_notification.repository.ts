import { DataSource } from 'typeorm';
import { StatusNotification } from '../core/datamodel/status_notification.model';

export class StatusNotificationRepository {
  constructor(private dataSource: DataSource) {}

  async saveStatusNotification(data: Omit<StatusNotification, 'created_at'>): Promise<void> {
    await this.dataSource.query(
      `INSERT INTO status_notifications (time, station_id, connector_id, status, error_code, info, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, now())
       ON CONFLICT DO NOTHING`,
      [
        data.time,
        data.station_id,
        data.connector_id,
        data.status,
        data.error_code || null,
        data.info || null,
      ]
    );
  }
}
