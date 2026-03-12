import { Injectable, Logger } from "@nestjs/common";

import { GooglePlacesFetcherService } from "../collector/google/fetcher/fetcher.service";
import { PlaceEntity, PlaceSource } from "./place.entity";
import { PlaceService } from "./place.service";

@Injectable()
export class PlaceOsmResolutionService {
  private readonly logger = new Logger(PlaceOsmResolutionService.name);

  constructor(
    private readonly googlePlacesFetcher: GooglePlacesFetcherService,
    private readonly placeService: PlaceService,
  ) {}

  /**
   * Resolves an OSM place to a Google Place ID.
   * Tries text search (place name) first, then falls back to coordinate-based nearby search.
   * Returns the place (updated or merged) or null if not resolvable.
   */
  public async resolveOsmPlaceToGoogle(place: PlaceEntity): Promise<PlaceEntity | null> {
    if (place.source !== PlaceSource.OSM) {
      return place;
    }

    const coords = await this.placeService.getPlaceCoordinates(place.id);
    if (!coords) {
      this.logger.warn(`Could not get coordinates for OSM place ${place.id}`);
      return null;
    }

    let googlePlaceId = await this.googlePlacesFetcher.findPlaceByTextSearch(
      place.name,
      coords.lat,
      coords.lng,
    );
    if (!googlePlaceId) {
      googlePlaceId = await this.googlePlacesFetcher.findPlaceByLocation(
        coords.lat,
        coords.lng,
        50,
      );
    }
    if (!googlePlaceId) {
      return null;
    }

    const existing = await this.placeService.findByGooglePlaceIdAndCity(googlePlaceId, place.cityId);
    if (existing) {
      return existing;
    }

    await this.placeService.updateGooglePlaceId(place.id, googlePlaceId);
    return this.placeService.findById(place.id);
  }
}
