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
