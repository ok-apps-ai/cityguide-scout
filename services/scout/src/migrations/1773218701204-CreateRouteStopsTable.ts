import { MigrationInterface, QueryRunner } from "typeorm";

import { ns } from "../common/constants";

export class CreateRouteStopsTable1773218701204 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE ${ns}.route_stops (
        id                     UUID NOT NULL DEFAULT gen_random_uuid(),
        route_id               UUID NOT NULL,
        place_id               UUID NOT NULL,
        order_index            INTEGER NOT NULL,
        visit_duration_minutes INTEGER,
        CONSTRAINT pk_route_stops PRIMARY KEY (id),
        CONSTRAINT fk_route_stops_route FOREIGN KEY (route_id)
          REFERENCES ${ns}.routes (id) ON DELETE CASCADE,
        CONSTRAINT fk_route_stops_place FOREIGN KEY (place_id)
          REFERENCES ${ns}.places (id) ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX route_stops_route_id_idx ON ${ns}.route_stops (route_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX ${ns}.route_stops_route_id_idx`);
    await queryRunner.query(`DROP TABLE ${ns}.route_stops`);
  }
}
