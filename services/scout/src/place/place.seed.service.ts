import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { PlaceCategory, PlaceSource } from "@framework/types";

import { ns } from "../common/constants";
import { PlaceEntity } from "./place.entity";

export interface ISeedPlaceOverrides {
  cityId?: string;
  name?: string;
  lat?: number;
  lng?: number;
  category?: PlaceCategory;
}

/** Tight cluster (~200m) for DBSCAN with clusterRadiusMeters 500 */
const DEFAULT_COORDS: Array<{ lat: number; lng: number }> = [
  { lat: 41.9, lng: 12.45 },
  { lat: 41.9005, lng: 12.4505 },
  { lat: 41.8995, lng: 12.4495 },
  { lat: 41.901, lng: 12.451 },
  { lat: 41.899, lng: 12.449 },
];

@Injectable()
export class PlaceSeedService {
  constructor(
    @InjectRepository(PlaceEntity)
    private readonly placeEntityRepository: Repository<PlaceEntity>,
  ) {}

  public async seedPlaces(cityId: string, overrides: ISeedPlaceOverrides = {}): Promise<PlaceEntity[]> {
    const { name: nameOverride, category: categoryOverride } = overrides;
    const coords =
      overrides.lat != null && overrides.lng != null ? [{ lat: overrides.lat, lng: overrides.lng }] : DEFAULT_COORDS;

    const results: PlaceEntity[] = [];

    for (let i = 0; i < coords.length; i++) {
      const { lat, lng } = coords[i];
      const name = nameOverride ?? `Test Place ${i + 1}`;
      const category = categoryOverride ?? PlaceCategory.PARK;

      const result = await this.placeEntityRepository.manager.query(
        `INSERT INTO ${ns}.places (city_id, name, geom, source, category, types)
         VALUES ($1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326), $5::${ns}.place_source_enum, $6::${ns}.place_category_enum, '{}')
         RETURNING id`,
        [cityId, name, lng, lat, PlaceSource.GOOGLE, category],
      );

      const entity = await this.placeEntityRepository.findOneOrFail({
        where: { id: result[0].id },
      });
      results.push(entity);
    }

    return results;
  }
}
