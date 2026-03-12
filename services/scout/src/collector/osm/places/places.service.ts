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
    private readonly fetcher: OsmOverpassFetcherService,
    private readonly mapper: OsmPlaceMapperService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  public async collectForCity(
    cityEntity: CityEntity,
    options: { limit?: number; tileSizeDeg?: number } = {},
  ): Promise<void> {
    this.logger.log(`Starting OSM collection for city: ${cityEntity.name}`);

    const bbox = await this.getBbox(cityEntity.id);
    if (!bbox) {
      this.logger.warn(`No boundary for city ${cityEntity.id}`);
      return;
    }

    const elements = await this.fetcher.fetchElements({
      bbox: { south: bbox.minLat, west: bbox.minLng, north: bbox.maxLat, east: bbox.maxLng },
      tileSizeDeg: options.tileSizeDeg,
    });

    let total = 0;
    for (const el of elements) {
      if (options.limit !== undefined && total >= options.limit) {
        this.logger.log(`Reached limit of ${options.limit} places, stopping collection`);
        break;
      }
      const coords = this.mapper.getLatLng(el);
      const name = this.mapper.getName(el);
      if (!coords || name === "Unnamed") continue;

      await this.upsertPlace(cityEntity.id, el);
      total++;
    }

    this.logger.log(`OSM collection complete for city: ${cityEntity.name} (${total} places upserted)`);
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
    const coords = this.mapper.getLatLng(element);
    if (!coords) return;

    const category = this.mapper.toPlaceCategory(element);
    const name = this.mapper.getName(element);
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
        visitDurationMinutes: this.mapper.toVisitDurationMinutes(category),
      });
    } catch (error) {
      this.logger.warn(`Failed to insert OSM place ${element.type}/${element.id}: ${(error as Error).message}`);
    }
  }
}
