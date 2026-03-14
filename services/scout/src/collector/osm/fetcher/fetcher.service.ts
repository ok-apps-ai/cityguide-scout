import { Injectable, Logger } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";

import { withRetry } from "../../../common/retry";
import type { IBbox, IOverpassElement, IOverpassFetcherOptions, IOverpassResponse } from "./types";
import { buildOverpassQuery } from "./overpass-query";
import { INCLUDED_OSM_TAG_KEYS } from "../places/osm-place-types";

const OVERPASS_BASE_URL = "https://overpass-api.de/api/interpreter";

function splitBbox(bbox: IBbox, nLat: number, nLng: number): IBbox[] {
  if (nLat <= 1 && nLng <= 1) return [bbox];
  const tiles: IBbox[] = [];
  const latStep = (bbox.north - bbox.south) / nLat;
  const lngStep = (bbox.east - bbox.west) / nLng;
  for (let i = 0; i < nLat; i++) {
    for (let j = 0; j < nLng; j++) {
      tiles.push({
        south: bbox.south + i * latStep,
        west: bbox.west + j * lngStep,
        north: bbox.south + (i + 1) * latStep,
        east: bbox.west + (j + 1) * lngStep,
      });
    }
  }
  return tiles;
}

@Injectable()
export class OsmOverpassFetcherService {
  private readonly logger = new Logger(OsmOverpassFetcherService.name);

  constructor(private readonly httpService: HttpService) {}

  public async fetchElements(options: IOverpassFetcherOptions): Promise<IOverpassElement[]> {
    const { bbox, query, tileSizeDeg } = options;
    const latSpan = bbox.north - bbox.south;
    const lngSpan = bbox.east - bbox.west;
    const nLat = tileSizeDeg != null && tileSizeDeg > 0 ? Math.ceil(latSpan / tileSizeDeg) : 1;
    const nLng = tileSizeDeg != null && tileSizeDeg > 0 ? Math.ceil(lngSpan / tileSizeDeg) : 1;
    const tiles = splitBbox(bbox, nLat, nLng);

    const seen = new Set<string>();
    const results: IOverpassElement[] = [];
    const progressInterval = Math.max(1, Math.floor(tiles.length / 10));

    for (let i = 0; i < tiles.length; i++) {
      if (i > 0 && i % progressInterval === 0) {
        console.info(`Overpass progress: ${i}/${tiles.length} tiles, ${results.length} elements so far`);
      }
      const elements = await this.fetchTile(tiles[i], query, i + 1, tiles.length);
      console.info(`Overpass tile ${i + 1}/${tiles.length} OK (${elements.length} elements)`);
      for (const el of elements) {
        const key = `${el.type}:${el.id}`;
        if (!seen.has(key)) {
          seen.add(key);
          results.push(el);
        }
      }
    }

    this.logger.debug(`Overpass returned ${results.length} elements (${tiles.length} tiles)`);
    return results;
  }

  private async fetchTile(
    bbox: IBbox,
    query?: string,
    tileIndex?: number,
    totalTiles?: number,
  ): Promise<IOverpassElement[]> {
    const q = query ?? buildOverpassQuery(bbox, INCLUDED_OSM_TAG_KEYS);
    const url = `${OVERPASS_BASE_URL}?data=${encodeURIComponent(q)}`;
    this.logger.debug(
      totalTiles != null && tileIndex != null
        ? `Fetching Overpass tile ${tileIndex}/${totalTiles}: bbox ${bbox.south},${bbox.west},${bbox.north},${bbox.east}`
        : `Fetching Overpass: bbox ${bbox.south},${bbox.west},${bbox.north},${bbox.east}`,
    );

    const response = await withRetry(
      async () =>
        firstValueFrom(
          this.httpService.get<IOverpassResponse>(url, {
            timeout: 30_000,
            headers: { Accept: "application/json" },
          }),
        ),
      {
        onRetry: (attempt, maxRetries, err) => {
          this.logger.warn(
            `Overpass retry ${attempt}/${maxRetries}${tileIndex != null && totalTiles != null ? ` (tile ${tileIndex}/${totalTiles})` : ""}: ${err instanceof Error ? err.message : String(err)}`,
          );
        },
      },
    );

    return response.data?.elements ?? [];
  }
}
