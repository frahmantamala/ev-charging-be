
import { DataSource } from 'typeorm';
import { ConnectorEntity } from './connector.entity';
import logger from '../core/logger';

export class ConnectorRepository {
  constructor(private dataSource: DataSource) {}

  async findOrCreateConnector(
    stationId: string,
    connectorNo: number,
    type: string = 'Type2'
  ): Promise<string> {
    try {
      const repo = this.dataSource.getRepository(ConnectorEntity);
      let connector = await repo.findOne({
        where: { station_id: stationId, connector_no: connectorNo },
      });
      if (connector) {
        return connector.id;
      }
      connector = repo.create({
        station_id: stationId,
        connector_no: connectorNo,
        type,
      });
      await repo.save(connector);
      logger.info(
        { stationId, connectorNo, type, connectorId: connector.id },
        'Created new connector'
      );
      return connector.id;
    } catch (error) {
      logger.error({ error, stationId, connectorNo, type }, 'Error in findOrCreateConnector');
      throw error;
    }
  }
}
