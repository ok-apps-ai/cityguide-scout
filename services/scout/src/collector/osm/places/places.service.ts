import { Injectable, Logger } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";

import { ns } from "../../../common/constants";
import { PlaceService } from "../../../place/place.service";
import { PlaceSource } from "../../../place/place.entity";
import { CityEntity } from "../../../city/city.entity";
import { OsmOverpassFetcherService } from "../fetcher/fetcher.service";
import type { IOverpassElement } from "../fetcher/types";
import { OsmPlaceMapperService } from "./place-mapper.service";

@Injectable()
export class OsmPlacesService {
  private readonly logger = new Logger(OsmPlacesService.name);

  constructor(
    private readonly placeService: PlaceService,
    private readonly osmOverpassFetcherService: OsmOverpassFetcherService,
    private readonly osmPlaceMapperService: OsmPlaceMapperService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  public async fetchPointsForCity(
    cityEntity: CityEntity,
    options: { limit?: number; tileSizeDeg?: number } = {},
  ): Promise<IOverpassElement[]> {
    const bbox = await this.getBbox(cityEntity.id);
    if (!bbox) return [];

    const elements = await this.osmOverpassFetcherService.fetchElements({
      bbox: { south: bbox.minLat, west: bbox.minLng, north: bbox.maxLat, east: bbox.maxLng },
      tileSizeDeg: options.tileSizeDeg,
    });

    const results: IOverpassElement[] = [];
    for (const el of elements) {
      if (options.limit !== undefined && results.length >= options.limit) break;
      const coords = this.osmPlaceMapperService.getLatLng(el);
      const name = this.osmPlaceMapperService.getName(el);
      if (!coords || name === "Unnamed") continue;
      results.push(el);
    }

    return results;
  }

  public async savePointsToDb(cityId: string, elements: IOverpassElement[]): Promise<void> {
    for (const el of elements) {
      await this.upsertPlace(cityId, el);
    }
  }

  public async collectPointsForCity(
    cityEntity: CityEntity,
    options: { limit?: number; tileSizeDeg?: number } = {},
  ): Promise<void> {
    this.logger.log(`Starting OSM collection for city: ${cityEntity.name}`);
    const elements = await this.fetchPointsForCity(cityEntity, options);
    this.logger.log(`Fetched ${elements.length} OSM elements for city: ${cityEntity.name}`);
    await this.savePointsToDb(cityEntity.id, elements);
    this.logger.log(`OSM collection complete for city: ${cityEntity.name} (${elements.length} places upserted)`);
  }

  private async getBbox(
    cityId: string,
  ): Promise<{ minLat: number; minLng: number; maxLat: number; maxLng: number } | null> {
    const result = await this.dataSource.query(
      `SELECT ST_YMin(b) as min_lat, ST_XMin(b) as min_lng, ST_YMax(b) as max_lat, ST_XMax(b) as max_lng
       FROM (SELECT ST_Envelope(boundary::geometry) AS b FROM ${ns}.cities WHERE id = $1) t`,
      [cityId],
    );
    if (!result || result.length === 0) return null;
    const r = result[0];
    return {
      minLat: Number(r.min_lat),
      minLng: Number(r.min_lng),
      maxLat: Number(r.max_lat),
      maxLng: Number(r.max_lng),
    };
  }

  private async upsertPlace(cityId: string, element: IOverpassElement): Promise<void> {
    const coords = this.osmPlaceMapperService.getLatLng(element);
    if (!coords) return;

    const category = this.osmPlaceMapperService.toPlaceCategory(element);
    const name = this.osmPlaceMapperService.getName(element);
    if (name === "Unnamed") return;

    try {
      await this.placeService.insertPlace({
        cityId,
        name,
        lat: coords.lat,
        lng: coords.lng,
        source: PlaceSource.OSM,
        osmId: `${element.type}:${element.id}`,
        category,
        types: this.osmPlaceMapperService.toTypes(element),
        visitDurationMinutes: this.osmPlaceMapperService.toVisitDurationMinutes(category),
      });
    } catch (error) {
      this.logger.warn(`Failed to insert OSM place ${element.type}/${element.id}: ${(error as Error).message}`);
    }
  }
}
