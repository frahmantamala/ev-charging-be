import { Entity, Column, CreateDateColumn, PrimaryColumn } from 'typeorm';

@Entity({ name: 'status_notifications' })
export class StatusNotificationEntity {
  @PrimaryColumn({ type: 'timestamptz' })
  time!: Date;

  @PrimaryColumn({ type: 'uuid' })
  connector_id!: string;

  @Column({ type: 'uuid', nullable: true })
  station_id?: string;

  @Column({ type: 'text' })
  status!: string;

  @Column({ type: 'text', nullable: true })
  error_code?: string;

  @Column({ type: 'text', nullable: true })
  info?: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;
}
