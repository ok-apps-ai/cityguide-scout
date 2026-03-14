import { Injectable, Logger } from "@nestjs/common";

import type { IEnrichmentContext, IEnrichmentProcedure } from "../interfaces";
import type { PlaceEntity } from "../../place.entity";
import { PlaceDescriptionGeneratorService } from "../place-description-generator.service";

@Injectable()
export class DescriptionGenerationProcedure implements IEnrichmentProcedure {
  private readonly logger = new Logger(DescriptionGenerationProcedure.name);

  constructor(private readonly placeDescriptionGeneratorService: PlaceDescriptionGeneratorService) {}

  public shouldRun(place: PlaceEntity): boolean {
    return place.description == null;
  }

  public async run(
    place: PlaceEntity,
    context: IEnrichmentContext,
  ): Promise<Partial<Pick<PlaceEntity, "description" | "mediaUrl">>> {
    const location = context.cityEntity.name;
    const description = await this.placeDescriptionGeneratorService.generate(location, place.name);
    return description != null ? { description } : {};
  }
}
