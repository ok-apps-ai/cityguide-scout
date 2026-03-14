import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { ConfigModule } from "@nestjs/config";

import { GooglePlacesFetcherModule } from "../collector/google/fetcher/fetcher.module";
import { PlaceCoreModule } from "./place-core.module";
import { PlaceEnrichmentService } from "./place-enrichment.service";
import { PlaceOsmResolutionService } from "./place-osm-resolution.service";
import { GooglePlaceMediaUrlProvider } from "./google-place-media-url-provider.service";

@Module({
  imports: [ConfigModule, HttpModule, PlaceCoreModule, GooglePlacesFetcherModule],
  providers: [
    PlaceEnrichmentService,
    PlaceOsmResolutionService,
    {
      provide: "IPlaceMediaUrlProvider",
      useClass: GooglePlaceMediaUrlProvider,
    },
  ],
  exports: [PlaceCoreModule, PlaceOsmResolutionService],
})
export class PlaceModule {}
