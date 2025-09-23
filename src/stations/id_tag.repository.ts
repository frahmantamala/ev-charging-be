import { DataSource } from 'typeorm';
import { IdTag } from '../core/datamodel/id_tag.model';

export class IdTagRepository {
  constructor(private dataSource: DataSource) {}

  async findByIdTag(idTag: string): Promise<IdTag | null> {
    const result = await this.dataSource.query(
      `SELECT id_tag as "idTag", status, expiry_date as "expiryDate", parent_id_tag as "parentIdTag" FROM id_tags WHERE id_tag = $1 LIMIT 1`,
      [idTag]
    );
    return result[0] || null;
  }
  
  async createIdTag(idTag: string, status: string = 'Accepted'): Promise<IdTag> {
    await this.dataSource.query(
      `INSERT INTO id_tags (id_tag, status) VALUES ($1, $2) ON CONFLICT (id_tag) DO NOTHING`,
      [idTag, status]
    );
    return {
      idTag,
      status: status as IdTag['status'],
    };
  }
}
