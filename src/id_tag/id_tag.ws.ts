import { WebSocket } from 'ws';
import { IdTagService } from './id_tag.service';
import logger, { maskSensitive } from '../core/logger';
import { OCPP_ERRORS } from '../core/ocpp-errors';

export default function createIdTagHandlers(idTagService: IdTagService) {
  return {
    async handleAuthorize(payload: any, ws: WebSocket, uniqueId: string) {
      logger.info({ action: 'Authorize', payload: maskSensitive(payload) }, 'Received Authorize (id_tag handler)');
      if (!payload || typeof payload.idTag !== 'string' || !payload.idTag.trim()) {
        const response = [4, uniqueId, OCPP_ERRORS.ProtocolError.code, OCPP_ERRORS.ProtocolError.description + ' (idTag missing or invalid)'];
        try { ws.send(JSON.stringify(response)); } catch {}
        return;
      }
      try {
        const result = await idTagService.authorize(payload.idTag);
        const idTagInfo = { status: result.status } as any;
        if ((result as any).expiryDate) idTagInfo.expiryDate = (result as any).expiryDate;
        if ((result as any).parentIdTag) idTagInfo.parentIdTag = (result as any).parentIdTag;
        try { ws.send(JSON.stringify([3, uniqueId, { idTagInfo }])); } catch {}
      } catch (err: any) {
        logger.error({ err, payload }, 'Failed to authorize idTag');
        const response = [4, uniqueId, OCPP_ERRORS.InternalError.code, OCPP_ERRORS.InternalError.description];
        try { ws.send(JSON.stringify(response)); } catch {}
      }
    }
  };
}
