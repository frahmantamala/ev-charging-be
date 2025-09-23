import { DataSource } from 'typeorm';
import { IdTag } from '../core/datamodel/id_tag.model';
import { IdTagEntity } from './id_tag.entity';

export class IdTagRepository {
  private repo = this.dataSource.getRepository(IdTagEntity);

  constructor(private dataSource: DataSource) {}

  async findByIdTag(idTag: string): Promise<IdTag | null> {
  const rec = await this.repo.findOne({ where: { id_tag: idTag } });
    if (!rec) return null;
    return {
      idTag: rec.id_tag,
      status: rec.status as IdTag['status'],
      expiryDate: rec.expiry_date ? rec.expiry_date.toISOString() : undefined,
      parentIdTag: rec.parent_id_tag || undefined,
    };
  }

  async createIdTag(idTag: string, status: string = 'Accepted'): Promise<IdTag> {
    const rec = this.repo.create({ id_tag: idTag, status });
    await this.repo.save(rec);
    return { idTag, status: status as IdTag['status'] };
  }
}
