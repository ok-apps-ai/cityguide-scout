import { MigrationInterface, QueryRunner } from "typeorm";

import { ns } from "../common/constants";

export class AddGenerationOptionsToRoutes1773218716204 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE ${ns}.routes
      ADD COLUMN generation_options JSONB
    `);
    await queryRunner.query(`
      UPDATE ${ns}.routes
      SET generation_options = '{}'::jsonb
      WHERE generation_options IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE ${ns}.routes
      ALTER COLUMN generation_options SET NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE ${ns}.routes
      DROP COLUMN generation_options
    `);
  }
}
