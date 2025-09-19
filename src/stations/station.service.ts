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
    return this.repo.update(id, update);
  }

  async listStations(): Promise<Station[]> {
    return this.repo.list();
  }
}
