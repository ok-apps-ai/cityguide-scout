import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";

import type { INearbyPlace } from "@framework/types";

import { ns } from "../../../common/constants";
import { PlaceEntity, PlaceSource } from "../../../place/place.entity";
import { PlaceService } from "../../../place/place.service";
import { CityEntity } from "../../../city/city.entity";
import { INCLUDED_SEARCH_TYPES, EXCLUDED_SEARCH_TYPES } from "../../../place/google-place-types";
import { GooglePlacesFetcherService } from "../fetcher/fetcher.service";
import { GooglePlaceMapperService } from "./place-mapper.service";
import { NEARBY_RADIUS_METERS } from "./constants";

@Injectable()
export class GooglePlacesService {
  private readonly logger = new Logger(GooglePlacesService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly placeService: PlaceService,
    private readonly googlePlacesFetcherService: GooglePlacesFetcherService,
    private readonly googlePlaceMapperService: GooglePlaceMapperService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  public async fetchPointsForCity(cityEntity: CityEntity, options: { limit?: number } = {}): Promise<INearbyPlace[]> {
    const gridPoints = await this.buildGrid(cityEntity);
    const results: INearbyPlace[] = [];
    let total = 0;

    outer: for (const [lat, lng] of gridPoints) {
      const places = await this.googlePlacesFetcherService.fetchNearbyPlaces({
        location: { lat, lng },
        includedTypes: INCLUDED_SEARCH_TYPES,
        excludedTypes: EXCLUDED_SEARCH_TYPES,
        radiusMeters: NEARBY_RADIUS_METERS,
      });

      for (const place of places) {
        if (options.limit !== undefined && total >= options.limit) break outer;
        results.push(place);
        total++;
      }
    }

    return results;
  }

  public async savePointsToDb(cityId: string, places: INearbyPlace[]): Promise<PlaceEntity[]> {
    const saved: PlaceEntity[] = [];
    for (const place of places) {
      const entity = await this.upsertPlace(cityId, place);
      if (entity) saved.push(entity);
    }
    return saved;
  }

  public async collectPointsForCity(cityEntity: CityEntity, options: { limit?: number } = {}): Promise<void> {
    this.logger.log(`Starting Google Places collection for city: ${cityEntity.name}`);
    const places = await this.fetchPointsForCity(cityEntity, options);
    this.logger.log(`Grid fetched ${places.length} places for city: ${cityEntity.name}`);
    await this.savePointsToDb(cityEntity.id, places);
    this.logger.log(`Collection complete for city: ${cityEntity.name} (${places.length} places upserted)`);
  }

  private async buildGrid(cityEntity: CityEntity): Promise<Array<[number, number]>> {
    const result = await this.dataSource.query(
      `SELECT ST_XMin(b) as min_lng, ST_YMin(b) as min_lat, ST_XMax(b) as max_lng, ST_YMax(b) as max_lat
       FROM (SELECT ST_Envelope(boundary::geometry) AS b FROM ${ns}.cities WHERE id = $1) t`,
      [cityEntity.id],
    );

    if (!result || result.length === 0) {
      return [];
    }

    const { min_lng, min_lat, max_lng, max_lat } = result[0];
    const points: Array<[number, number]> = [];

    const gridStep = this.configService.get<number>("GRID_STEP_DEGREES", 0.02);
    const half = gridStep / 2;

    for (let lat = Number(min_lat) + half; lat < Number(max_lat); lat += gridStep) {
      for (let lng = Number(min_lng) + half; lng < Number(max_lng); lng += gridStep) {
        points.push([lat, lng]);
      }
    }

    if (points.length === 0) {
      points.push([(Number(min_lat) + Number(max_lat)) / 2, (Number(min_lng) + Number(max_lng)) / 2]);
    }

    return points;
  }

  private async upsertPlace(cityId: string, place: INearbyPlace): Promise<PlaceEntity | null> {
    const category = this.googlePlaceMapperService.inferCategoryFromTypes(place);
    const geomType = this.googlePlaceMapperService.inferGeometryType(place);

    try {
      return await this.placeService.insertPlace({
        cityId,
        name: place.name,
        lat: place.geometry.location.lat,
        lng: place.geometry.location.lng,
        source: PlaceSource.GOOGLE,
        googlePlaceId: place.place_id,
        category,
        geomExpression: this.googlePlaceMapperService.buildGeomExpression(place, geomType),
        types: place.types,
        rating: place.rating ?? null,
        reviewCount: place.user_ratings_total ?? null,
        priceLevel: this.googlePlaceMapperService.toPriceLevel(place.price_level),
        visitDurationMinutes: this.googlePlaceMapperService.toVisitDurationMinutes(category),
      });
    } catch (error) {
      this.logger.warn(`Failed to insert place ${place.place_id}: ${(error as Error).message}`);
      return null;
    }
  }
}
