import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitDb1758245720956 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS timescaledb;`);

    // ----- Stations -----
    await queryRunner.query(`
      CREATE TABLE stations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        location TEXT,
        firmware TEXT,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );
    `);

    // ----- Connectors -----
    await queryRunner.query(`
      CREATE TABLE connectors (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        station_id UUID REFERENCES stations(id) ON DELETE CASCADE,
        connector_no SMALLINT NOT NULL,
        type TEXT,
        created_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE(station_id, connector_no)
      );
    `);

    // ----- Transactions -----
    await queryRunner.query(`
      CREATE TABLE transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        connector_id UUID REFERENCES connectors(id) ON DELETE CASCADE,
        start_time TIMESTAMPTZ NOT NULL,
        stop_time TIMESTAMPTZ,
        start_meter INTEGER NOT NULL,
        stop_meter INTEGER,
        status TEXT CHECK (status IN ('active','stopped','error')),
        created_at TIMESTAMPTZ DEFAULT now()
      );
    `);

    // ----- Meter Values (Timescale hypertable) -----
    await queryRunner.query(`
      CREATE TABLE meter_values (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        time TIMESTAMPTZ NOT NULL,
        transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
        value_wh BIGINT NOT NULL,
        phase TEXT,
        created_at TIMESTAMPTZ DEFAULT now()
      );
    `);
    await queryRunner.query(`SELECT create_hypertable('meter_values', 'time', if_not_exists => TRUE);`);
    await queryRunner.query(`
      CREATE INDEX idx_meter_values_tx_time
      ON meter_values (transaction_id, time DESC);
    `);

    // ----- Status Notifications (Timescale hypertable) -----
    await queryRunner.query(`
      CREATE TABLE status_notifications (
        time TIMESTAMPTZ NOT NULL,
        connector_id UUID REFERENCES connectors(id) ON DELETE CASCADE,
        status TEXT NOT NULL,
        error_code TEXT,
        info TEXT,
        created_at TIMESTAMPTZ DEFAULT now()
      );
    `);
    await queryRunner.query(`SELECT create_hypertable('status_notifications', 'time', if_not_exists => TRUE);`);
    await queryRunner.query(`
      CREATE INDEX idx_status_connector_time
      ON status_notifications (connector_id, time DESC);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop child tables first, then parents
    await queryRunner.query(`DROP TABLE IF EXISTS status_notifications CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS meter_values CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS transactions CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS connectors CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS stations CASCADE;`);
  }
}