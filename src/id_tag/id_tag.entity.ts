import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity({ name: 'id_tags' })
export class IdTagEntity {
  @PrimaryColumn({ type: 'text' })
  id_tag!: string;

  @Column({ type: 'text' })
  status!: string;

  @Column({ type: 'timestamptz', nullable: true })
  expiry_date?: Date;

  @Column({ type: 'text', nullable: true })
  parent_id_tag?: string;
}
