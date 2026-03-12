import { Injectable, Logger } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { firstValueFrom } from "rxjs";

import { withRetry } from "../../../common/retry";
import type { INearbyPlace, IFetcherOptions, INewApiPlace, INewApiResponse } from "./types";
import { DEFAULT_RADIUS, NEW_API_BASE_URL, SEARCH_TEXT_URL, TYPES_BATCH_SIZE } from "./constants";

function chunk<T>(arr: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

function toPlace(p: INewApiPlace): INearbyPlace {
  const placeId = p.id?.replace(/^places\//, "") ?? "";
  const lat = p.location?.latitude ?? 0;
  const lng = p.location?.longitude ?? 0;
  const high = p.viewport?.high;
  const low = p.viewport?.low;
  return {
    place_id: placeId,
    name: p.displayName?.text ?? "",
    geometry: {
      location: { lat, lng },
      viewport:
        high != null && low != null
          ? {
              northeast: { lat: high.latitude ?? 0, lng: high.longitude ?? 0 },
              southwest: { lat: low.latitude ?? 0, lng: low.longitude ?? 0 },
            }
          : undefined,
    },
    types: p.types ?? [],
    rating: p.rating,
    user_ratings_total: p.userRatingCount,
    price_level: p.priceLevel === "PRICE_LEVEL_FREE" ? 0 : undefined,
  };
}

/**
 * Fetches nearby places from Google Places API (New) — places:searchNearby.
 * When >50 types, splits into batches of 50 (75→2 requests, 125→3 requests).
 * Deduplicates by place_id.
 */
@Injectable()
export class GooglePlacesFetcherService {
  private readonly logger = new Logger(GooglePlacesFetcherService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Fetches all nearby places for the given types using Places API (New).
   * When >50 types, splits into batches of 50. Deduplicates by place_id.
   */
  public async fetchNearbyPlaces(options: IFetcherOptions): Promise<INearbyPlace[]> {
    const {
      location,
      includedTypes,
      excludedTypes,
      radiusMeters = DEFAULT_RADIUS,
      apiKey = this.configService.get<string>("GOOGLE_API_KEY", ""),
    } = options;

    if (includedTypes.length === 0) {
      return [];
    }

    const seen = new Set<string>();
    const results: INearbyPlace[] = [];
    const typeBatches = chunk(includedTypes, TYPES_BATCH_SIZE);

    if (typeBatches.length > 1) {
      this.logger.debug(
        `Splitting ${includedTypes.length} types into ${typeBatches.length} batches of up to ${TYPES_BATCH_SIZE}`,
      );
    }

    for (const batch of typeBatches) {
      const batchPlaces = await this.fetchBatch({
        location,
        includedTypes: batch,
        excludedTypes,
        radiusMeters,
        apiKey,
      });
      for (const place of batchPlaces) {
        if (!seen.has(place.place_id)) {
          seen.add(place.place_id);
          results.push(place);
        }
      }
    }

    return results;
  }

  private async fetchBatch(params: {
    location: { lat: number; lng: number };
    includedTypes: string[];
    excludedTypes?: readonly string[];
    radiusMeters: number;
    apiKey: string;
  }): Promise<INearbyPlace[]> {
    const { location, includedTypes, excludedTypes, radiusMeters, apiKey } = params;

    const body: Record<string, unknown> = {
      maxResultCount: 20,
      locationRestriction: {
        circle: {
          center: { latitude: location.lat, longitude: location.lng },
          radius: radiusMeters,
        },
      },
    };
    if (includedTypes.length > 0) {
      body.includedTypes = includedTypes;
    }
    if (excludedTypes != null && excludedTypes.length > 0) {
      body.excludedTypes = excludedTypes;
    }

    const response = await withRetry(async () =>
      firstValueFrom(
        this.httpService.post<INewApiResponse>(NEW_API_BASE_URL, body, {
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask":
              "places.id,places.displayName,places.location,places.viewport,places.types,places.rating,places.userRatingCount,places.priceLevel",
          },
        }),
      ),
    );

    const places = response.data.places ?? [];
    return places.map(toPlace);
  }

  /**
   * Finds the nearest Google Place at the given coordinates.
   * Returns place_id or null if none found within radius.
   */
  public async findPlaceByLocation(lat: number, lng: number, radiusMeters = 50): Promise<string | null> {
    const apiKey = this.configService.get<string>("GOOGLE_API_KEY", "");
    if (!apiKey) return null;

    const places = await this.fetchBatch({
      location: { lat, lng },
      includedTypes: [],
      radiusMeters,
      apiKey,
    });

    return places.length > 0 ? places[0].place_id : null;
  }

  /**
   * Finds a Google Place by text search (place name) with location bias.
   * Uses places:searchText. Returns place_id or null if none found.
   */
  public async findPlaceByTextSearch(
    name: string,
    lat: number,
    lng: number,
    radiusMeters = 500,
  ): Promise<string | null> {
    const apiKey = this.configService.get<string>("GOOGLE_API_KEY", "");
    if (!apiKey || !name.trim()) return null;

    const response = await withRetry(async () =>
      firstValueFrom(
        this.httpService.post<INewApiResponse>(
          SEARCH_TEXT_URL,
          {
            textQuery: name.trim(),
            locationBias: {
              circle: {
                center: { latitude: lat, longitude: lng },
                radius: radiusMeters,
              },
            },
            rankPreference: "DISTANCE",
          },
          {
            headers: {
              "Content-Type": "application/json",
              "X-Goog-Api-Key": apiKey,
              "X-Goog-FieldMask":
                "places.id,places.displayName,places.location,places.viewport,places.types,places.rating,places.userRatingCount,places.priceLevel",
            },
          },
        ),
      ),
    );

    const places = response.data.places ?? [];
    return places.length > 0 ? toPlace(places[0]).place_id : null;
  }

  /**
   * Fetches Place Details (editorialSummary, photos) from Google Places API.
   * Name comes from initial collection; description and photoName used for enrichment.
   */
  public async getPlaceDetails(placeId: string): Promise<{ description: string | null; photoName: string | null }> {
    const apiKey = this.configService.get<string>("GOOGLE_API_KEY", "");
    if (!apiKey) return { description: null, photoName: null };

    const url = `https://places.googleapis.com/v1/places/${placeId}`;
    const response = await firstValueFrom(
      this.httpService.get<{
        editorialSummary?: { overview?: string };
        photos?: Array<{ name?: string }>;
      }>(url, {
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "editorialSummary,photos",
        },
      }),
    );

    const description = response.data.editorialSummary?.overview ?? null;
    const photoName = response.data.photos?.[0]?.name ?? null;
    return { description, photoName };
  }
}
