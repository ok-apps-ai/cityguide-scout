import { Injectable, Logger } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { firstValueFrom } from "rxjs";

import type { IPlaceMediaUrlProvider } from "./types";

const MEDIA_BASE_URL = "https://places.googleapis.com/v1";
const DEFAULT_MAX_WIDTH = 800;

@Injectable()
export class GooglePlaceMediaUrlProvider implements IPlaceMediaUrlProvider {
  private readonly logger = new Logger(GooglePlaceMediaUrlProvider.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Fetches media URL from Google Place Photos getMedia.
   * photoName format: places/{placeId}/photos/{photoId}
   */
  public async getPlaceMediaUrl(photoName: string): Promise<string | null> {
    const apiKey = this.configService.get<string>("GOOGLE_API_KEY", "");
    if (!apiKey) return null;

    const url = `${MEDIA_BASE_URL}/${photoName}/media`;
    try {
      const response = await firstValueFrom(
        this.httpService.get<{ photoUri?: string }>(url, {
          params: {
            maxWidthPx: DEFAULT_MAX_WIDTH,
            skipHttpRedirect: true,
          },
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": apiKey,
          },
        }),
      );
      return response.data.photoUri ?? null;
    } catch (err) {
      this.logger.warn(`Failed to fetch media URL for ${photoName}: ${err}`);
      return null;
    }
  }
}
