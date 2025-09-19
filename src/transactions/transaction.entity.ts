import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ name: 'transactions' })
export class TransactionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  connector_id!: string;

  @Column({ type: 'timestamptz' })
  start_time!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  stop_time?: Date;

  @Column({ type: 'integer' })
  start_meter!: number;

  @Column({ type: 'integer', nullable: true })
  stop_meter?: number;

  @Column({ type: 'text' })
  status!: 'active' | 'stopped' | 'error';

  @Column({ type: 'timestamptz', default: () => 'now()' })
  created_at!: Date;
}
