import { NestFactory } from "@nestjs/core";
import { Logger } from "@nestjs/common";
import { DataSource } from "typeorm";

import { AppModule } from "../src/app.module";
import { CityService } from "../src/city/city.service";
import type { PlaceEntity } from "../src/place/place.entity";
import { PlaceEnrichmentService } from "../src/place/enrichment/place-enrichment.service";
import { PlaceService } from "../src/place/place.service";
import { ns } from "../src/common/constants";

const logger = new Logger("EnrichRouteStops");

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule);

  const placeEnrichmentService = app.get(PlaceEnrichmentService);
  const placeService = app.get(PlaceService);
  const cityService = app.get(CityService);
  const dataSource = app.get(DataSource);

  const rows = await dataSource.query<{ place_id: string }[]>(`SELECT DISTINCT place_id::text FROM ${ns}.route_stops`);
  const placeIds = rows.map(r => r.place_id);

  logger.log(`Found ${placeIds.length} distinct place(s) in route stops`);

  if (placeIds.length > 0) {
    const places = await placeService.findByIds(placeIds);
    const byCityId = new Map<string, PlaceEntity[]>();
    for (const place of places) {
      const list = byCityId.get(place.cityId) ?? [];
      list.push(place);
      byCityId.set(place.cityId, list);
    }

    for (const [cityId, cityPlaces] of byCityId) {
      const cityEntity = await cityService.findOne(cityId);
      if (!cityEntity) {
        logger.warn(`City not found: ${cityId}`);
        continue;
      }
      await placeEnrichmentService.enrichPlaces(cityEntity, cityPlaces);
    }
  }

  await app.close();
}

void main().catch(err => {
  logger.error(err);
  throw err;
});
