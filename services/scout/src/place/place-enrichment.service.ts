import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { OnEvent } from "@nestjs/event-emitter";

import { GooglePlacesFetcherService } from "../collector/google";
import { sleep, withRetry } from "../common/retry";
import type { IPlaceMediaUrlProvider } from "./types";
import { PlaceService } from "./place.service";
import { PLACE_ACCEPTED } from "./place.patterns";

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_DELAY_MS = 300;

@Injectable()
export class PlaceEnrichmentService {
  private readonly logger = new Logger(PlaceEnrichmentService.name);

  constructor(
    private readonly placesFetcher: GooglePlacesFetcherService,
    @Inject("IPlaceMediaUrlProvider") private readonly mediaUrlProvider: IPlaceMediaUrlProvider,
    private readonly placeService: PlaceService,
    private readonly configService: ConfigService,
  ) {}

  @OnEvent(PLACE_ACCEPTED, { async: true, promisify: true })
  public async onPlaceAccepted(payload: { placeIds: string[] }): Promise<void> {
    const { placeIds } = payload;
    if (placeIds.length === 0) return;

    const maxRetries = this.configService.get<number>("ENRICHMENT_MAX_RETRIES", DEFAULT_MAX_RETRIES);
    const delayMs = this.configService.get<number>("ENRICHMENT_DELAY_BETWEEN_PLACES_MS", DEFAULT_DELAY_MS);

    const uniqueIds = [...new Set(placeIds)];

    for (const placeId of uniqueIds) {
      try {
        const place = await this.placeService.findById(placeId);
        if (!place) {
          this.logger.warn(`Place not found: ${placeId}`);
          continue;
        }
        if (place.description != null) {
          continue;
        }
        const googlePlaceId = place.googlePlaceId;
        if (googlePlaceId == null) {
          continue;
        }

        const details = await withRetry(() => this.placesFetcher.getPlaceDetails(googlePlaceId), { maxRetries });

        let mediaUrl: string | null = null;
        if (details.photoName) {
          mediaUrl = await withRetry(() => this.mediaUrlProvider.getPlaceMediaUrl(details.photoName!), { maxRetries });
        }

        await this.placeService.updateEnrichment(placeId, {
          description: details.description,
          mediaUrl,
        });

        this.logger.debug(`Enriched place ${placeId}`);
      } catch (err) {
        this.logger.warn(`Failed to enrich place ${placeId}: ${err}`);
      }

      await sleep(delayMs);
    }
  }
}
