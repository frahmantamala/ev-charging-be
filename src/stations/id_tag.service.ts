import { IdTag } from '../core/datamodel/id_tag.model';
import { IdTagRepository } from './id_tag.repository';

export class IdTagService {
  constructor(private repo: IdTagRepository) {}

  async authorize(idTag: string): Promise<IdTag> {
    const found = await this.repo.findByIdTag(idTag);
    if (found && found.status === 'Accepted') {
      return found;
    }
    if (!found) {
      return await this.repo.createIdTag(idTag, 'Accepted');
    }

    return found;
  }
}
