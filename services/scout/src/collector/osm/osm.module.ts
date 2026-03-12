import { Module } from "@nestjs/common";

import { OsmOverpassFetcherModule } from "./fetcher/fetcher.module";
import { OsmPlacesModule } from "./places/places.module";

@Module({
  imports: [OsmOverpassFetcherModule, OsmPlacesModule],
  exports: [OsmOverpassFetcherModule, OsmPlacesModule],
})
export class OsmModule {}
