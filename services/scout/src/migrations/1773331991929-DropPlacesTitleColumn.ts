import { MigrationInterface, QueryRunner } from "typeorm";

import { ns } from "../common/constants";

export class DropPlacesTitleColumn1773331991929 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE ${ns}.places DROP COLUMN IF EXISTS title`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE ${ns}.places ADD COLUMN title VARCHAR(512) NULL`,
    );
  }
}
