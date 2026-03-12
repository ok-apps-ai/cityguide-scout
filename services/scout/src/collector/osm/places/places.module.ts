import { Module } from "@nestjs/common";

import { PlaceModule } from "../../../place/place.module";
import { OsmOverpassFetcherModule } from "../fetcher/fetcher.module";
import { OsmPlaceMapperService } from "./place-mapper.service";
import { OsmPlacesService } from "./places.service";

@Module({
  imports: [PlaceModule, OsmOverpassFetcherModule],
  providers: [OsmPlaceMapperService, OsmPlacesService],
  exports: [OsmPlacesService],
})
export class OsmPlacesModule {}
