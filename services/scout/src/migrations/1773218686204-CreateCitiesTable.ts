import { MigrationInterface, QueryRunner } from "typeorm";

import { ns } from "../common/constants";

export class CreateCitiesTable1773218686204 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE ${ns}.cities (
        id         UUID NOT NULL DEFAULT gen_random_uuid(),
        name       VARCHAR(255) NOT NULL,
        boundary   GEOMETRY(POLYGON, 4326) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT pk_cities PRIMARY KEY (id)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX cities_boundary_idx ON ${ns}.cities USING GIST (boundary)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX ${ns}.cities_boundary_idx`);
    await queryRunner.query(`DROP TABLE ${ns}.cities`);
  }
}
