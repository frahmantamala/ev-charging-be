import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ name: 'stations' })
export class StationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  name!: string;


  @Column({ type: 'text', nullable: true })
  location?: string;

  @Column({ type: 'text', nullable: true })
  firmware?: string;

  @Column({ type: 'text', nullable: true })
  vendor?: string;

  @Column({ type: 'text', nullable: true })
  model?: string;

  @Column({ type: 'text', nullable: true })
  charge_point_serial_number?: string;

  @Column({ type: 'text', nullable: true })
  charge_box_serial_number?: string;

  @Column({ type: 'text', nullable: true })
  firmware_version?: string;

  @Column({ type: 'text', nullable: true })
  iccid?: string;

  @Column({ type: 'text', nullable: true })
  imsi?: string;

  @Column({ type: 'text', nullable: true })
  meter_type?: string;

  @Column({ type: 'text', nullable: true })
  meter_serial_number?: string;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  created_at!: Date;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  updated_at!: Date;
}
