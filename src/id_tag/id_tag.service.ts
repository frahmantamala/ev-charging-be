import { IdTag } from '../core/datamodel/id_tag.model';
import { IdTagRepository } from '../id_tag/id_tag.repository';
import { onEvent } from '../core/events/event-bus';
import { IdTagAuthorizeRequestedPayload, emitIdTagAuthorizeResolved } from './id_tag.events';

export class IdTagService {
  constructor(private repo: IdTagRepository) {
    try {
      onEvent<IdTagAuthorizeRequestedPayload>('idtag.authorize.requested', async (payload) => {
        try {
          const result = await this.authorize(payload.idTag);
          emitIdTagAuthorizeResolved({
            requestId: payload.requestId,
            status: result.status,
            expiryDate: (result as any).expiryDate || null,
            parentIdTag: (result as any).parentIdTag || null,
          });
        } catch (err: any) {
          emitIdTagAuthorizeResolved({ requestId: payload.requestId, error: err?.message || String(err) });
        }
      });
    } catch {}
  }

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
