import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateIdTagsTable1758525796791 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS id_tags (
        id_tag VARCHAR PRIMARY KEY,
        status VARCHAR NOT NULL,
        expiry_date TIMESTAMP,
        parent_id_tag VARCHAR
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS id_tags;
    `);
  }
}
