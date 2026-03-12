import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { GooglePlacesFetcherService } from "../collector/google/fetcher/fetcher.service";
import { ns } from "../common/constants";
import { PlaceService } from "../place/place.service";
import { RouteEntity } from "./route.entity";
import { RouteStopEntity } from "./route-stop.entity";
import type { ICreateRoutePayload } from "./types";

@Injectable()
export class RouteService {
  private readonly logger = new Logger(RouteService.name);

  constructor(
    @InjectRepository(RouteEntity)
    private readonly routeEntityRepository: Repository<RouteEntity>,
    @InjectRepository(RouteStopEntity)
    private readonly routeStopEntityRepository: Repository<RouteStopEntity>,
    private readonly placeService: PlaceService,
    private readonly placesFetcher: GooglePlacesFetcherService,
  ) {}

  public async create(payload: ICreateRoutePayload): Promise<RouteEntity> {
    const {
      cityId,
      name,
      theme,
      routeMode,
      durationMinutes,
      distanceKm,
      priceLevel,
      startPlaceId,
      routeGeometryWkt,
      stops,
    } = payload;

    const result: Array<{ id: string }> = await this.routeEntityRepository.query(
      `INSERT INTO ${ns}.routes
         (city_id, name, theme, route_mode, duration_minutes, distance_km, price_level, start_place_id, route_geometry)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, ST_GeomFromText($9, 4326))
       RETURNING id`,
      [cityId, name, theme, routeMode, durationMinutes, distanceKm, priceLevel, startPlaceId ?? null, routeGeometryWkt],
    );

    const routeId = result[0].id;

    if (stops.length > 0) {
      const stopEntities = stops.map(s =>
        this.routeStopEntityRepository.create({
          routeId,
          placeId: s.placeId,
          orderIndex: s.orderIndex,
          visitDurationMinutes: s.visitDurationMinutes ?? null,
        }),
      );
      await this.routeStopEntityRepository.save(stopEntities);
    }

    const saved = await this.routeEntityRepository.findOneOrFail({ where: { id: routeId } });
    this.logger.log(`Route saved: ${saved.id} — ${name} (${theme}, ${routeMode})`);
    return saved;
  }

  public findByCityId(cityId: string): Promise<RouteEntity[]> {
    return this.routeEntityRepository.find({
      where: { cityId },
      relations: ["stops", "stops.place"],
      order: { createdAt: "ASC" },
    });
  }

  public async findRoutesForApi(cityId: string, routeMode?: string): Promise<
    Array<{
      id: string;
      name: string;
      theme: string;
      routeMode: string;
      durationMinutes: number;
      distanceKm: number;
      priceLevel: string;
      routeGeometryWkt: string;
      stops: Array<{
        orderIndex: number;
        placeName: string;
        placeDescription: string | null;
        mediaUrl: string | null;
      }>;
    }>
  > {
    const rows = await this.routeEntityRepository.query(
      `SELECT id::text, name, theme::text, route_mode::text, duration_minutes, distance_km,
              price_level::text, ST_AsText(route_geometry) AS route_geometry_wkt
       FROM ${ns}.routes
       WHERE city_id = $1 AND ($2::text IS NULL OR route_mode = $2::${ns}.route_mode_enum)
       ORDER BY created_at ASC`,
      [cityId, routeMode ?? null],
    );

    const routeIds = (rows as Array<{ id: string }>).map(r => r.id);
    if (routeIds.length === 0) return [];

    const stopRows = await this.routeEntityRepository.query(
      `SELECT rs.route_id::text, rs.order_index, p.name AS place_name,
              p.description AS place_description, p.media_url AS place_media_url
       FROM ${ns}.route_stops rs
       JOIN ${ns}.places p ON p.id = rs.place_id
       WHERE rs.route_id = ANY($1::uuid[])
       ORDER BY rs.route_id, rs.order_index`,
      [routeIds],
    );

    const stopsByRoute = new Map<
      string,
      Array<{
        orderIndex: number;
        placeName: string;
        placeDescription: string | null;
        mediaUrl: string | null;
      }>
    >();

    for (const s of stopRows) {
      const list = stopsByRoute.get(s.route_id) ?? [];
      list.push({
        orderIndex: s.order_index,
        placeName: s.place_name,
        placeDescription: s.place_description,
        mediaUrl: s.place_media_url,
      });
      stopsByRoute.set(s.route_id, list);
    }

    interface IRouteRow {
      id: string;
      name: string;
      theme: string;
      route_mode: string;
      duration_minutes: number;
      distance_km: number;
      price_level: string;
      route_geometry_wkt: string;
    }
    return (rows as IRouteRow[]).map(r => ({
      id: r.id,
      name: r.name,
      theme: r.theme,
      routeMode: r.route_mode,
      durationMinutes: r.duration_minutes,
      distanceKm: Number(r.distance_km),
      priceLevel: r.price_level,
      routeGeometryWkt: r.route_geometry_wkt,
      stops: stopsByRoute.get(r.id) ?? [],
    }));
  }
}
