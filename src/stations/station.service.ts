import { Station } from '../core/datamodel/station.model';
import { emitStationCreated } from './station.events';

interface IStationRepository {
  create(station: Omit<Station, 'id' | 'created_at' | 'updated_at'>): Promise<Station>;
  findById(id: string): Promise<Station | null>;
  findByName(name: string): Promise<Station | null>;
  update(id: string, update: Partial<Omit<Station, 'id' | 'created_at' | 'updated_at'>>): Promise<Station>;
  list(): Promise<Station[]>;
}

export class StationService {
  constructor(private readonly repo: IStationRepository) {}

  async createStation(data: Omit<Station, 'id' | 'created_at' | 'updated_at'>): Promise<Station> {
    if (!data.name || data.name.trim() === '') {
      throw new Error('Station name is required');
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
