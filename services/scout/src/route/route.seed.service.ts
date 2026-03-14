import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { RouteMode, RouteTheme } from "@framework/types";

import { RouteEntity } from "./route.entity";
import { PriceLevel } from "../place/place.entity";

const defaultValues = {
  name: "Test Route",
  theme: RouteTheme.HIGHLIGHTS,
  routeMode: RouteMode.WALKING,
  durationMinutes: 60,
  distanceKm: 5,
  priceLevel: PriceLevel.FREE,
  startPlaceId: null as string | null,
  routeGeometry: (() => "ST_GeomFromText('LINESTRING(12.45 41.90, 12.46 41.91)', 4326)") as () => string,
  generationOptions: {} as RouteEntity["generationOptions"],
};

@Injectable()
export class RouteSeedService {
  constructor(
    @InjectRepository(RouteEntity)
    private readonly routeEntityRepository: Repository<RouteEntity>,
  ) {}

  public async seedRoute(overrides: Partial<RouteEntity> & Pick<RouteEntity, "cityId">): Promise<RouteEntity> {
    const values = Object.assign({}, defaultValues, overrides);

    const result = await this.routeEntityRepository
      .createQueryBuilder()
      .insert()
      .into(RouteEntity)
      .values(values)
      .execute();

    const id = result.identifiers[0]?.id ?? (result as { raw?: Array<{ id: string }> }).raw?.[0]?.id;
    if (!id) {
      throw new Error("Route insert did not return identifier");
    }
    return this.routeEntityRepository.findOneOrFail({ where: { id } });
  }
}
