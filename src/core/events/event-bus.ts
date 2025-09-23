import { Subject } from 'rxjs';
import { filter } from 'rxjs/operators';

export interface DomainEvent<T = unknown> {
  type: string;
  payload: T;
}

export const eventBus = new Subject<DomainEvent>();

export function onEvent<T>(
  type: string,
  handler: (payload: T) => void
) {
  return eventBus
    .pipe(filter(e => e.type === type))
    .subscribe(e => handler(e.payload as T));
}

export function emitAndWait<Req = any, Res = any>(options: {
  requestType: string;
  requestPayload: Req & { requestId?: string };
  responseType: string;
  matcher?: (req: Req & { requestId?: string }, res: Res) => boolean;
  timeoutMs?: number;
}): Promise<Res | null> {
  const { requestType, requestPayload, responseType, matcher, timeoutMs } = options;
  const req = { ...requestPayload } as Req & { requestId?: string };
  if (!req.requestId) {
    req.requestId = `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
  }
  const mt = matcher || ((r: any, s: any) => (r.requestId && s.requestId && r.requestId === s.requestId));
  return new Promise((resolve) => {
    const sub = eventBus.pipe(filter(e => e.type === responseType)).subscribe(e => {
      try {
        if (mt(req, e.payload as Res)) {
          try { sub.unsubscribe(); } catch {}
          resolve(e.payload as Res);
        }
      } catch (err) {
        try { sub.unsubscribe(); } catch {}
        resolve(null);
      }
    });

    try {
      eventBus.next({ type: requestType, payload: req as unknown as Req });
    } catch (err) {
      try { sub.unsubscribe(); } catch {}
      resolve(null);
      return;
    }

    setTimeout(() => {
      try { sub.unsubscribe(); } catch {}
      resolve(null);
    }, timeoutMs || 2000);
  });
}
