import { MigrationInterface, QueryRunner } from "typeorm";

export class CreatePostgisExtension1773218681204 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS postgis`);
  }

  // PostGIS extension cannot be dropped without dropping dependent objects
  public async down(_queryRunner: QueryRunner): Promise<void> {
    await Promise.resolve();
  }
}
