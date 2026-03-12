import { MigrationInterface, QueryRunner } from "typeorm";

import { ns } from "../common/constants";

export class CreateRoutesTable1773218696204 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE ${ns}.route_theme_enum AS ENUM (
        'history', 'nature', 'viewpoints', 'shopping', 'evening', 'highlights'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE ${ns}.route_mode_enum AS ENUM ('walking', 'cycling', 'driving')
    `);

    await queryRunner.query(`
      CREATE TABLE ${ns}.routes (
        id               UUID NOT NULL DEFAULT gen_random_uuid(),
        city_id          UUID NOT NULL,
        name             VARCHAR(255) NOT NULL,
        theme            ${ns}.route_theme_enum NOT NULL,
        route_mode       ${ns}.route_mode_enum NOT NULL DEFAULT 'walking',
        duration_minutes INTEGER NOT NULL,
        distance_km      DECIMAL(6, 2) NOT NULL,
        price_level      ${ns}.price_level_enum NOT NULL,
        start_place_id   UUID,
        route_geometry   GEOMETRY(LINESTRING, 4326) NOT NULL,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT pk_routes PRIMARY KEY (id),
        CONSTRAINT fk_routes_city FOREIGN KEY (city_id)
          REFERENCES ${ns}.cities (id) ON DELETE CASCADE,
        CONSTRAINT fk_routes_start_place FOREIGN KEY (start_place_id)
          REFERENCES ${ns}.places (id) ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX routes_city_id_idx ON ${ns}.routes (city_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX ${ns}.routes_city_id_idx`);
    await queryRunner.query(`DROP TABLE ${ns}.routes`);
    await queryRunner.query(`DROP TYPE ${ns}.route_mode_enum`);
    await queryRunner.query(`DROP TYPE ${ns}.route_theme_enum`);
  }
}
