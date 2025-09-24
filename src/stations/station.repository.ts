import { Station } from '../core/datamodel/station.model';
import { StationEntity } from './station.entity';
import { Repository } from 'typeorm';

export class TypeOrmStationRepository {
  constructor(private readonly repo: Repository<StationEntity>) {}

  async create(station: Omit<Station, 'id' | 'created_at' | 'updated_at'>): Promise<Station> {
    const entity = this.repo.create({
      ...station,
      created_at: new Date(),
      updated_at: new Date(),
    });
    const saved = await this.repo.save(entity);
    return this.toModel(saved);
  }

  async findById(id: string): Promise<Station | null> {
    const found = await this.repo.findOneBy({ id });
    return found ? this.toModel(found) : null;
  }

  async findByName(name: string): Promise<Station | null> {
    const found = await this.repo.findOneBy({ name });
    return found ? this.toModel(found) : null;
  }

  async findBySerial(serial: string): Promise<Station | null> {
    if (!serial) return null;
    const found = await this.repo.findOne({ where: { charge_point_serial_number: serial } });
    return found ? this.toModel(found) : null;
  }

  async createOrUpdateBySerial(data: Omit<Station, 'id' | 'created_at' | 'updated_at'>): Promise<Station> {
    if (!data.charge_point_serial_number) {
      return this.create(data);
    }
    const serial = data.charge_point_serial_number;
    const existing = await this.repo.findOne({ where: { charge_point_serial_number: serial } });
    if (existing) {
      await this.repo.update(existing.id, { ...data, updated_at: new Date() });
      const updated = await this.repo.findOneBy({ id: existing.id });
      return this.toModel(updated!);
    }
    try {
      return await this.create(data);
    } catch (err: any) {
      // another process created concurrently, return the existing row
      if (err && err.code && (err.code === '23505' || err.code === 'SQLITE_CONSTRAINT')) {
        const re = await this.repo.findOne({ where: { charge_point_serial_number: serial } });
        if (re) return this.toModel(re);
      }
      throw err;
    }
  }

  async update(id: string, update: Partial<Omit<Station, 'id' | 'created_at' | 'updated_at'>>): Promise<Station> {
    await this.repo.update(id, { ...update, updated_at: new Date() });
    const updated = await this.repo.findOneBy({ id });
    if (!updated) throw new Error('Station not found');
    return this.toModel(updated);
  }

  async list(): Promise<Station[]> {
    const found = await this.repo.find({ order: { name: 'ASC' } });
    return found.map(this.toModel);
  }

  private toModel(entity: StationEntity): Station {
    return {
      id: entity.id,
      name: entity.name,
      location: entity.location,
      firmware: entity.firmware,
      charge_point_serial_number: entity.charge_point_serial_number ?? '',
      charge_box_serial_number: entity.charge_box_serial_number ?? '',
      created_at: entity.created_at.toISOString(),
      updated_at: entity.updated_at.toISOString(),
    };
  }
}
