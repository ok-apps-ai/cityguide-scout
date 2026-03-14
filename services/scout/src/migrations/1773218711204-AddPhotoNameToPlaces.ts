import { MigrationInterface, QueryRunner } from "typeorm";

import { ns } from "../common/constants";

export class AddPhotoNameToPlaces1773218711204 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE ${ns}.places ADD COLUMN photo_name TEXT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE ${ns}.places DROP COLUMN photo_name
    `);
  }
}
