import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSerialUniqueIndex1758625794792 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE stations ADD COLUMN IF NOT EXISTS charge_point_serial_number TEXT;`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS ux_stations_charge_point_serial_number ON stations (charge_point_serial_number);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS ux_stations_charge_point_serial_number;`);
  }
}
