import { NestFactory } from "@nestjs/core";
import { Logger } from "@nestjs/common";
import { DataSource } from "typeorm";

import { AppModule } from "../src/app.module";
import { PlaceEnrichmentService } from "../src/place/place-enrichment.service";
import { ns } from "../src/common/constants";

const logger = new Logger("EnrichRouteStops");

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule);

  const placeEnrichmentService = app.get(PlaceEnrichmentService);
  const dataSource = app.get(DataSource);

  const rows = await dataSource.query<{ place_id: string }[]>(`SELECT DISTINCT place_id::text FROM ${ns}.route_stops`);
  const placeIds = rows.map(r => r.place_id);

  logger.log(`Found ${placeIds.length} distinct place(s) in route stops`);

  if (placeIds.length > 0) {
    await placeEnrichmentService.onPlaceAccepted({ placeIds });
  }

  await app.close();
}

void main().catch(err => {
  logger.error(err);
  throw err;
});
