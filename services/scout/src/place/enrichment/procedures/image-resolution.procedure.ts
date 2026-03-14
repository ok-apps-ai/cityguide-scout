import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { PlaceEntity, PlaceSource } from "../../place.entity";
import { GooglePlacesFetcherService } from "../../../collector/google/fetcher/fetcher.service";
import { withRetry } from "../../../common/retry";
import type { IEnrichmentContext, IEnrichmentProcedure, IPlaceMediaUrlProvider } from "../interfaces";

const DEFAULT_MAX_RETRIES = 3;

@Injectable()
export class ImageResolutionProcedure implements IEnrichmentProcedure {
  private readonly logger = new Logger(ImageResolutionProcedure.name);

  constructor(
    private readonly googlePlacesFetcherService: GooglePlacesFetcherService,
    @Inject("IPlaceMediaUrlProvider") private readonly mediaUrlProvider: IPlaceMediaUrlProvider,
    private readonly configService: ConfigService,
  ) {}

  public shouldRun(place: PlaceEntity): boolean {
    return (
      place.mediaUrl == null &&
      place.source === PlaceSource.GOOGLE &&
      (place.photoName != null || place.googlePlaceId != null)
    );
  }

  public async run(
    place: PlaceEntity,
    _context: IEnrichmentContext,
  ): Promise<Partial<Pick<PlaceEntity, "description" | "mediaUrl">>> {
    const maxRetries = this.configService.get<number>("ENRICHMENT_MAX_RETRIES", DEFAULT_MAX_RETRIES);

    let photoName = place.photoName;
    if (photoName == null && place.googlePlaceId != null) {
      const details = await withRetry(() => this.googlePlacesFetcherService.getPlaceDetails(place.googlePlaceId!), {
        maxRetries,
      });
      photoName = details.photoName ?? null;
    }

    if (photoName == null) {
      return {};
    }

    const name = photoName;
    const mediaUrl = await withRetry(() => this.mediaUrlProvider.getPlaceMediaUrl(name), { maxRetries });
    return mediaUrl != null ? { mediaUrl } : {};
  }
}
