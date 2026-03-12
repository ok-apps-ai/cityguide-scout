import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";

import { ns } from "../../../common/constants";
import { PlaceService } from "../../../place/place.service";
import { PlaceSource } from "../../../place/place.entity";
import { CityEntity } from "../../../city/city.entity";
import { INCLUDED_SEARCH_TYPES, EXCLUDED_SEARCH_TYPES } from "../../../place/google-place-types";
import { GooglePlacesFetcherService } from "../fetcher/fetcher.service";
import type { INearbyPlace } from "../fetcher/types";
import { GooglePlaceMapperService } from "./place-mapper.service";
import { NEARBY_RADIUS_METERS } from "./constants";

@Injectable()
export class GooglePlacesService {
  private readonly logger = new Logger(GooglePlacesService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly placeService: PlaceService,
    private readonly fetcher: GooglePlacesFetcherService,
    private readonly mapper: GooglePlaceMapperService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  public async collectForCity(cityEntity: CityEntity, options: { limit?: number } = {}): Promise<void> {
    this.logger.log(`Starting Google Places collection for city: ${cityEntity.name}`);

    const gridPoints = await this.buildGrid(cityEntity);
    this.logger.log(`Grid has ${gridPoints.length} points for city: ${cityEntity.name}`);

    let total = 0;

    outer: for (const [lat, lng] of gridPoints) {
      const places = await this.fetcher.fetchNearbyPlaces({
        location: { lat, lng },
        includedTypes: INCLUDED_SEARCH_TYPES,
        excludedTypes: EXCLUDED_SEARCH_TYPES,
        radiusMeters: NEARBY_RADIUS_METERS,
      });

      for (const place of places) {
        if (options.limit !== undefined && total >= options.limit) {
          this.logger.log(`Reached limit of ${options.limit} places, stopping collection`);
          break outer;
        }
        await this.upsertPlace(cityEntity.id, place);
        total++;
      }
    }

    this.logger.log(`Collection complete for city: ${cityEntity.name} (${total} places upserted)`);
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

  private async upsertPlace(cityId: string, place: INearbyPlace): Promise<void> {
    const category = this.mapper.inferCategoryFromTypes(place);
    const geomType = this.mapper.inferGeometryType(place);

    try {
      await this.placeService.insertPlace({
        cityId,
        name: place.name,
        lat: place.geometry.location.lat,
        lng: place.geometry.location.lng,
        source: PlaceSource.GOOGLE,
        googlePlaceId: place.place_id,
        category,
        geomExpression: this.mapper.buildGeomExpression(place, geomType),
        types: place.types,
        rating: place.rating ?? null,
        reviewCount: place.user_ratings_total ?? null,
        priceLevel: this.mapper.toPriceLevel(place.price_level),
        visitDurationMinutes: this.mapper.toVisitDurationMinutes(category),
      });
    } catch (error) {
      this.logger.warn(`Failed to insert place ${place.place_id}: ${(error as Error).message}`);
    }
  }
}
