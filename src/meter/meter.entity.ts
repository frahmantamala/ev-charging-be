import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ name: 'meter_values' })
export class MeterValueEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'timestamptz' })
  time!: Date;

  @Column({ type: 'uuid' })
  transaction_id!: string;

  @Column({ type: 'bigint' })
  value_wh!: number;

  @Column({ type: 'text', nullable: true })
  phase?: string;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  created_at!: Date;
}
