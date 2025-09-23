import { DataSource } from 'typeorm';
import logger from '../core/logger';

export class ConnectorRepository {
  constructor(private dataSource: DataSource) {}

  async findOrCreateConnector(
    stationId: string,
    connectorNo: number,
    type: string = 'Type2'
  ): Promise<string> {
    try {
      const selectQuery = `
        SELECT id FROM connectors
        WHERE station_id = $1 AND connector_no = $2
        LIMIT 1
      `;
      const selectResult = await this.dataSource.query(selectQuery, [stationId, connectorNo]);

      if (selectResult?.[0]?.id) {
        return selectResult[0].id;
      }

      const insertQuery = `
        INSERT INTO connectors (station_id, connector_no, type)
        VALUES ($1, $2, $3)
        RETURNING id
      `;
      const insertResult = await this.dataSource.query(insertQuery, [stationId, connectorNo, type]);

      logger.info(
        { stationId, connectorNo, type, connectorId: insertResult?.[0]?.id },
        'Created new connector'
      );

      return insertResult[0].id;
    } catch (error) {
      logger.error({ error, stationId, connectorNo, type }, 'Error in findOrCreateConnector');
      throw error;
    }
  }
}
