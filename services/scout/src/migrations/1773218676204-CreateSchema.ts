import { MigrationInterface, QueryRunner } from "typeorm";

import { ns } from "../common/constants";

export class CreateSchema1773218676204 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createSchema(ns, true);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropSchema(ns);
  }
}
