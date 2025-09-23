import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';

@Entity({ name: 'connectors' })
export class ConnectorEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  station_id!: string;

  @Column({ type: 'int' })
  connector_no!: number;

  @Column({ type: 'text', default: 'Type2' })
  type!: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at!: Date;
}
