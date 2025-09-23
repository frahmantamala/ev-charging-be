import { MigrationInterface, QueryRunner } from "typeorm";

export class AddStationIdToStatusNotifications1695473000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE status_notifications
      ADD COLUMN station_id UUID;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE status_notifications
      DROP COLUMN IF EXISTS station_id;
    `);
  }
}
