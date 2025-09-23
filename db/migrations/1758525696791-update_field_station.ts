import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateFieldStation1758525696791 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE stations
        ADD COLUMN vendor TEXT,
        ADD COLUMN model TEXT,
        ADD COLUMN charge_point_serial_number TEXT,
        ADD COLUMN charge_box_serial_number TEXT,
        ADD COLUMN firmware_version TEXT,
        ADD COLUMN iccid TEXT,
        ADD COLUMN imsi TEXT,
        ADD COLUMN meter_type TEXT,
        ADD COLUMN meter_serial_number TEXT;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE stations
        DROP COLUMN IF EXISTS vendor,
        DROP COLUMN IF EXISTS model,
        DROP COLUMN IF EXISTS charge_point_serial_number,
        DROP COLUMN IF EXISTS charge_box_serial_number,
        DROP COLUMN IF EXISTS iccid,
        DROP COLUMN IF EXISTS imsi,
        DROP COLUMN IF EXISTS meter_type,
        DROP COLUMN IF EXISTS meter_serial_number;
    `);
  }

}
