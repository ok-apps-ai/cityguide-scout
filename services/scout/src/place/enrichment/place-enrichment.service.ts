import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { OnEvent } from "@nestjs/event-emitter";

import { CityEntity } from "../../city/city.entity";
import { CityService } from "../../city/city.service";
import { sleep } from "../../common/retry";
import type { IEnrichmentProcedure } from "./interfaces";
import { PlaceEntity } from "../place.entity";
import { PlaceService } from "../place.service";
import { PLACE_ACCEPTED } from "../place.patterns";

const DEFAULT_DELAY_MS = 300;

@Injectable()
export class PlaceEnrichmentService {
  private readonly logger = new Logger(PlaceEnrichmentService.name);

  constructor(
    @Inject("ENRICHMENT_PROCEDURES") private readonly procedures: IEnrichmentProcedure[],
    private readonly placeService: PlaceService,
    private readonly cityService: CityService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Enriches places for a city. For each place, runs procedures where shouldRun is true,
   * merges results, and updates the place. Skips places where all conditions are met.
   */
  public async enrichPlaces(cityEntity: CityEntity, placeEntities: PlaceEntity[]): Promise<void> {
    const delayMs = this.configService.get<number>("ENRICHMENT_DELAY_BETWEEN_PLACES_MS", DEFAULT_DELAY_MS);

    for (const place of placeEntities) {
      try {
        const toRun = this.procedures.filter(p => p.shouldRun(place));
        if (toRun.length === 0) {
          continue;
        }

        const context = { cityEntity };
        const merged: Partial<Pick<PlaceEntity, "description" | "mediaUrl">> = {};

        for (const procedure of toRun) {
          const result = await procedure.run(place, context);
          Object.assign(merged, result);
        }

        if (Object.keys(merged).length > 0) {
          await this.placeService.updateEnrichment(place.id, merged);
          this.logger.debug(`Enriched place ${place.id}`);
        }
      } catch (err) {
        this.logger.warn(`Failed to enrich place ${place.id}: ${err}`);
      }

      await sleep(delayMs);
    }
  }

  @OnEvent(PLACE_ACCEPTED, { async: true, promisify: true })
  public async onPlaceAccepted(payload: { placeIds: string[] }): Promise<void> {
    const { placeIds } = payload;
    if (placeIds.length === 0) return;

    const uniqueIds = [...new Set(placeIds)];
    const places = await this.placeService.findByIds(uniqueIds);
    if (places.length === 0) return;

    const byCityId = new Map<string, PlaceEntity[]>();
    for (const place of places) {
      const list = byCityId.get(place.cityId) ?? [];
      list.push(place);
      byCityId.set(place.cityId, list);
    }

    for (const [cityId, cityPlaces] of byCityId) {
      const cityEntity = await this.cityService.findOne(cityId);
      if (!cityEntity) {
        this.logger.warn(`City not found: ${cityId}`);
        continue;
      }
      await this.enrichPlaces(cityEntity, cityPlaces);
    }
  }
}
