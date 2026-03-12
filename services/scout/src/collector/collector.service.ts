import { Injectable, Logger } from "@nestjs/common";

import { CityEntity } from "../city/city.entity";
import { GooglePlacesService } from "./google/places/places.service";
import { OsmPlacesService } from "./osm/places/places.service";

@Injectable()
export class CollectorService {
  private readonly logger = new Logger(CollectorService.name);

  constructor(
    private readonly googlePlacesService: GooglePlacesService,
    private readonly osmPlacesService: OsmPlacesService,
  ) {}

  public async collectForCity(cityEntity: CityEntity): Promise<void> {
    await Promise.all([
      this.googlePlacesService.collectForCity(cityEntity),
      this.osmPlacesService.collectForCity(cityEntity),
    ]);
  }

}
