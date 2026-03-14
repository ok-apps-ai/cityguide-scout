import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import type { IUpsertPlacePayload } from "@framework/types";

import { ns } from "../common/constants";
import { PlaceEntity, PlaceSource } from "./place.entity";

@Injectable()
export class PlaceService {
  private readonly logger = new Logger(PlaceService.name);

  constructor(
    @InjectRepository(PlaceEntity)
    private readonly placeEntityRepository: Repository<PlaceEntity>,
  ) {}

  /**
   * Inserts a place. If it already exists (by google_place_id or city_id+osm_id), returns the existing one.
   * Returns the saved (or existing) place entity.
   */
  public async insertPlace(payload: IUpsertPlacePayload): Promise<PlaceEntity | null> {
    const { lat, lng, geomExpression, source, types, ...rest } = payload;
    const geom = geomExpression ?? `ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)`;

    const values: Record<string, unknown> = {
      ...rest,
      geom: () => geom,
      types: types ?? [],
      source,
      googlePlaceId: source === PlaceSource.GOOGLE ? payload.googlePlaceId : null,
      osmId: source === PlaceSource.OSM ? payload.osmId : null,
    };

    try {
      await this.placeEntityRepository.createQueryBuilder().insert().into(PlaceEntity).values(values).execute();

      if (source === PlaceSource.GOOGLE && payload.googlePlaceId) {
        return this.findByGooglePlaceIdAndCity(payload.googlePlaceId, payload.cityId);
      }
      if (source === PlaceSource.OSM && payload.osmId) {
        return this.placeEntityRepository.findOne({
          where: { cityId: payload.cityId, osmId: payload.osmId },
        });
      }
      return null;
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === "23505") {
        if (source === PlaceSource.GOOGLE && payload.googlePlaceId) {
          return this.findByGooglePlaceIdAndCity(payload.googlePlaceId, payload.cityId);
        }
        if (source === PlaceSource.OSM && payload.osmId) {
          return this.placeEntityRepository.findOne({
            where: { cityId: payload.cityId, osmId: payload.osmId },
          });
        }
        return null;
      }
      throw err;
    }
  }

  public async updateGooglePlaceId(placeId: string, googlePlaceId: string): Promise<void> {
    await this.placeEntityRepository.update({ id: placeId }, { googlePlaceId, updatedAt: new Date() });
  }

  public async updateDescription(googlePlaceId: string, description: string | null): Promise<void> {
    await this.placeEntityRepository.update({ googlePlaceId }, { description, updatedAt: new Date() });
  }

  public async updateEnrichment(
    placeId: string,
    data: { description?: string | null; mediaUrl?: string | null },
  ): Promise<void> {
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (data.description !== undefined) updates.description = data.description;
    if (data.mediaUrl !== undefined) updates.mediaUrl = data.mediaUrl;
    if (Object.keys(updates).length <= 1) return;
    await this.placeEntityRepository.update({ id: placeId }, updates);
  }

  public findById(id: string): Promise<PlaceEntity | null> {
    return this.placeEntityRepository.findOne({ where: { id } });
  }

  public async getPlaceCoordinates(placeId: string): Promise<{ lat: number; lng: number } | null> {
    const rows = await this.placeEntityRepository.manager.query<Array<{ lat: string; lng: string }>>(
      `SELECT ST_Y(ST_Centroid(geom::geometry)) as lat, ST_X(ST_Centroid(geom::geometry)) as lng FROM ${ns}.places WHERE id = $1`,
      [placeId],
    );
    if (!rows || rows.length === 0) return null;
    return { lat: Number(rows[0].lat), lng: Number(rows[0].lng) };
  }

  public findByGooglePlaceIdAndCity(googlePlaceId: string, cityId: string): Promise<PlaceEntity | null> {
    return this.placeEntityRepository.findOne({ where: { googlePlaceId, cityId } });
  }

  public findByCityId(cityId: string): Promise<PlaceEntity[]> {
    return this.placeEntityRepository.find({ where: { cityId } });
  }
}
