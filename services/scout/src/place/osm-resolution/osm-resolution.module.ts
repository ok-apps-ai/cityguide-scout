import { Module } from "@nestjs/common";

import { GooglePlacesFetcherModule } from "../../collector/google/fetcher/fetcher.module";
import { PlaceCoreModule } from "../place-core.module";
import { PlaceOsmResolutionService } from "./place-osm-resolution.service";

@Module({
  imports: [PlaceCoreModule, GooglePlacesFetcherModule],
  providers: [PlaceOsmResolutionService],
  exports: [PlaceOsmResolutionService],
})
export class OsmResolutionModule {}
