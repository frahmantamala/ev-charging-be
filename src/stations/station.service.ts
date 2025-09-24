import { Station } from '../core/datamodel/station.model';
import { emitStationCreated } from './station.events';
import { onEvent, emitAndWait } from '../core/events/event-bus';
import Redis from 'ioredis';
import { emitStatusNotificationReceived } from '../status_notification/status_notification.events';

interface IStationRepository {
  create(station: Omit<Station, 'id' | 'created_at' | 'updated_at'>): Promise<Station>;
  findById(id: string): Promise<Station | null>;
  findByName(name: string): Promise<Station | null>;
  findBySerial(serial: string): Promise<Station | null>;
  createOrUpdateBySerial(data: Omit<Station, 'id' | 'created_at' | 'updated_at'>): Promise<Station>;
  update(id: string, update: Partial<Omit<Station, 'id' | 'created_at' | 'updated_at'>>): Promise<Station>;
  list(): Promise<Station[]>;
}

export class StationService {
  private readonly redis: Redis;

  constructor(private readonly repo: IStationRepository) {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    onEvent<{ station: Station }>('station.created', ({ station }) => {
    });

    onEvent<{ station: Station }>('station.updated', ({ station }) => {
    });
  }

  async authorizeIdTag(idTag: string) {
    let idTagInfo: any = { status: 'Blocked' };
    try {
      const cached = await this.redis.get(`idtag:status:${idTag}`);
      if (cached) {
        idTagInfo = JSON.parse(cached);
        return idTagInfo;
      }

      const res = await emitAndWait<{ idTag: string; requestId?: string }, any>({
        requestType: 'idtag.authorize.requested',
        requestPayload: { idTag },
        responseType: 'idtag.authorize.resolved',
        timeoutMs: 2000,
      });
      if (res && (res as any).status) {
        idTagInfo = { status: (res as any).status };
        if ((res as any).expiryDate) idTagInfo.expiryDate = (res as any).expiryDate;
        if ((res as any).parentIdTag) idTagInfo.parentIdTag = (res as any).parentIdTag;
        // cache
        if (idTagInfo.status !== 'Accepted') {
          await this.redis.set(`idtag:status:${idTag}`, JSON.stringify(idTagInfo), 'EX', 60);
        } else {
          await this.redis.set(`idtag:status:${idTag}`, JSON.stringify(idTagInfo), 'EX', 3600);
        }
        return idTagInfo;
      }

      return idTagInfo;
    } catch (err) {
      return idTagInfo;
    }
  }

  async saveStatusNotification(payload: { time?: string; station_id?: string; connector_id: string; status: string; error_code?: string | null; info?: string | null; }) {
    try {
      emitStatusNotificationReceived({
        time: payload.time || new Date().toISOString(),
        station_id: payload.station_id || '',
        connector_id: payload.connector_id,
        status: payload.status,
        error_code: payload.error_code || null,
        info: payload.info || null,
      });

      const redisStatusKey = `status:latest:${payload.station_id}:${payload.connector_id}`;
      await this.redis.set(redisStatusKey, JSON.stringify({
        time: payload.time || new Date().toISOString(),
        connector_id: payload.connector_id,
        status: payload.status,
        error_code: payload.error_code || null,
        info: payload.info || null,
      }));
    } catch (err) {
    }
  }

  async createStation(data: Omit<Station, 'id' | 'created_at' | 'updated_at'>): Promise<Station> {
    if (!data.name || data.name.trim() === '') {
      throw new Error('Station name is required');
    }

    if (data.charge_point_serial_number && data.charge_point_serial_number.trim() !== '') {
      const station = await (this.repo as any).createOrUpdateBySerial(data);
      emitStationCreated({ station });
      return station;
    }

    const existing = await this.repo.findByName(data.name);
    if (existing) {
      throw new Error('Station name already exists');
    }
    const station = await this.repo.create(data);
    emitStationCreated({ station });
    return station;
  }

  async getStationById(id: string): Promise<Station | null> {
    return this.repo.findById(id);
  }

  async getStationByName(name: string): Promise<Station | null> {
    return this.repo.findByName(name);
  }

  async updateStation(id: string, update: Partial<Omit<Station, 'id' | 'created_at' | 'updated_at'>>): Promise<Station> {
    if (update.name && update.name.trim() !== '') {
      const existing = await this.repo.findByName(update.name);
      if (existing && existing.id !== id) {
        throw new Error('Station name already exists');
      }
    }
    const before = await this.repo.findById(id);
    const updated = await this.repo.update(id, update);
    if (before && (before.name !== updated.name || before.location !== updated.location || before.firmware !== updated.firmware)) {
      emitStationCreated({ station: updated });
    }
    return updated;
  }

  async listStations(): Promise<Station[]> {
    return this.repo.list();
  }
}
