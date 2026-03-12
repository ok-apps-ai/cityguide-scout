import { MigrationInterface, QueryRunner } from "typeorm";

import { ns } from "../common/constants";

export class CreatePlacesTable1773218691204 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE ${ns}.place_category_enum AS ENUM (
        'museum',
        'tourist_attraction',
        'park',
        'shopping_mall',
        'store',
        'point_of_interest',
        'church',
        'place_of_worship',
        'natural_feature',
        'art_gallery',
        'amusement_park',
        'hiking_area',
        'route',
        'plaza',
        'scenic_spot',
        'monument'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE ${ns}.price_level_enum AS ENUM (
        'free', 'inexpensive', 'moderate', 'expensive', 'very_expensive'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE ${ns}.place_source_enum AS ENUM ('google', 'osm')
    `);

    await queryRunner.query(`
      CREATE TABLE ${ns}.places (
        id                     UUID NOT NULL DEFAULT gen_random_uuid(),
        city_id                UUID NOT NULL,
        name                   VARCHAR(512) NOT NULL,
        geom                   geometry(Geometry, 4326) NOT NULL,
        google_place_id        VARCHAR(255) NULL,
        source                 ${ns}.place_source_enum NOT NULL DEFAULT 'google',
        osm_id                 VARCHAR(64) NULL,
        category               ${ns}.place_category_enum NOT NULL,
        types                  TEXT[] NOT NULL DEFAULT '{}',
        description            TEXT,
        rating                 DECIMAL(3, 1),
        review_count           INTEGER,
        price_level            ${ns}.price_level_enum,
        visit_duration_minutes INTEGER,
        media_url              TEXT NULL,
        created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT pk_places PRIMARY KEY (id),
        CONSTRAINT uq_places_google_place_id UNIQUE (google_place_id),
        CONSTRAINT fk_places_city FOREIGN KEY (city_id)
          REFERENCES ${ns}.cities (id) ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX places_geom_idx ON ${ns}.places USING GIST (geom)
    `);

    await queryRunner.query(`
      CREATE INDEX places_city_id_idx ON ${ns}.places (city_id)
    `);

    await queryRunner.query(`
      CREATE INDEX places_types_idx ON ${ns}.places USING GIN (types)
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX uq_places_city_osm_id
      ON ${ns}.places (city_id, osm_id)
      WHERE osm_id IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS ${ns}.uq_places_city_osm_id`);
    await queryRunner.query(`DROP INDEX ${ns}.places_types_idx`);
    await queryRunner.query(`DROP INDEX ${ns}.places_city_id_idx`);
    await queryRunner.query(`DROP INDEX ${ns}.places_geom_idx`);
    await queryRunner.query(`DROP TABLE ${ns}.places`);
    await queryRunner.query(`DROP TYPE ${ns}.place_source_enum`);
    await queryRunner.query(`DROP TYPE ${ns}.price_level_enum`);
    await queryRunner.query(`DROP TYPE ${ns}.place_category_enum`);
  }
}
