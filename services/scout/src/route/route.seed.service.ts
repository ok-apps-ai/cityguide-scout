import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { ns } from "../common/constants";
import { RouteEntity, RouteMode, RouteTheme } from "./route.entity";
import { PriceLevel } from "../place/place.entity";

@Injectable()
export class RouteSeedService {
  constructor(
    @InjectRepository(RouteEntity)
    private readonly routeEntityRepository: Repository<RouteEntity>,
  ) {}

  public async seedRoute(
    overrides: {
      cityId?: string;
      name?: string;
      theme?: RouteTheme;
      routeMode?: RouteMode;
      durationMinutes?: number;
      distanceKm?: number;
      priceLevel?: PriceLevel;
    } = {},
  ): Promise<RouteEntity> {
    const cityId = overrides.cityId;
    if (!cityId) {
      throw new Error("cityId is required for seedRoute");
    }
    const name = overrides.name ?? "Test Route";
    const theme = overrides.theme ?? RouteTheme.HIGHLIGHTS;
    const routeMode = overrides.routeMode ?? RouteMode.WALKING;
    const durationMinutes = overrides.durationMinutes ?? 60;
    const distanceKm = overrides.distanceKm ?? 5;
    const priceLevel = overrides.priceLevel ?? PriceLevel.FREE;

    const result = await this.routeEntityRepository.manager.query(
      `INSERT INTO ${ns}.routes (city_id, name, theme, route_mode, duration_minutes, distance_km, price_level, route_geometry)
       VALUES ($1, $2, $3::${ns}.route_theme_enum, $4::${ns}.route_mode_enum, $5, $6, $7::${ns}.price_level_enum, ST_GeomFromText('LINESTRING(12.45 41.90, 12.46 41.91)', 4326))
       RETURNING id`,
      [cityId, name, theme, routeMode, durationMinutes, distanceKm, priceLevel],
    );

    return this.routeEntityRepository.findOneOrFail({ where: { id: result[0].id } });
  }
}
