import { Module } from "@nestjs/common";

import { PlaceCoreModule } from "../../../place/place-core.module";
import { OsmOverpassFetcherModule } from "../fetcher";
import { OsmPlaceMapperService } from "./place-mapper.service";
import { OsmPlacesService } from "./places.service";

@Module({
  imports: [PlaceCoreModule, OsmOverpassFetcherModule],
  providers: [OsmPlaceMapperService, OsmPlacesService],
  exports: [OsmPlacesService],
})
export class OsmPlacesModule {}
