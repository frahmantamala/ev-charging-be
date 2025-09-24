import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUniqueStationName1758713884891 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS ux_stations_name ON stations (name);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS ux_stations_name;`);
  }
}
