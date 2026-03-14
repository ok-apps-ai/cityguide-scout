import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { PlaceCategory, PlaceSource } from "@framework/types";

import { PlaceEntity } from "./place.entity";

/** Tight cluster (~200m) for DBSCAN with clusterRadiusMeters 500. Use when seeding multiple places. */
export const DEFAULT_PLACE_COORDS: Array<{ lat: number; lng: number }> = [
  { lat: 41.9, lng: 12.45 },
  { lat: 41.9005, lng: 12.4505 },
  { lat: 41.8995, lng: 12.4495 },
  { lat: 41.901, lng: 12.451 },
  { lat: 41.899, lng: 12.449 },
];

const defaultValues = {
  name: "Test Place",
  geom: (() => "ST_GeomFromText('POINT(12.45 41.9)', 4326)") as unknown as () => string,
  source: PlaceSource.GOOGLE,
  category: PlaceCategory.PARK,
  types: [] as string[],
};

@Injectable()
export class PlaceSeedService {
  constructor(
    @InjectRepository(PlaceEntity)
    private readonly placeEntityRepository: Repository<PlaceEntity>,
  ) {}

  public async seedPlace(overrides: Partial<PlaceEntity> & Pick<PlaceEntity, "cityId">): Promise<PlaceEntity> {
    const values = Object.assign({}, defaultValues, overrides);

    const result = await this.placeEntityRepository
      .createQueryBuilder()
      .insert()
      .into(PlaceEntity)
      .values(values)
      .execute();

    const id = result.identifiers[0]?.id ?? (result as { raw?: Array<{ id: string }> }).raw?.[0]?.id;
    if (!id) {
      throw new Error("Place insert did not return identifier");
    }
    return this.placeEntityRepository.findOneOrFail({ where: { id } });
  }
}
