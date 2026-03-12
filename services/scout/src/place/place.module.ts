import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { HttpModule } from "@nestjs/axios";
import { ConfigModule } from "@nestjs/config";

import { GoogleModule } from "../collector/google/google.module";
import { PlaceEntity } from "./place.entity";
import { PlaceService } from "./place.service";
import { PlaceEnrichmentService } from "./place-enrichment.service";
import { PlaceOsmResolutionService } from "./place-osm-resolution.service";
import { GooglePlaceMediaUrlProvider } from "./google-place-media-url-provider.service";

@Module({
  imports: [ConfigModule, HttpModule, TypeOrmModule.forFeature([PlaceEntity]), forwardRef(() => GoogleModule)],
  providers: [
    PlaceService,
    PlaceEnrichmentService,
    PlaceOsmResolutionService,
    {
      provide: "IPlaceMediaUrlProvider",
      useClass: GooglePlaceMediaUrlProvider,
    },
  ],
  exports: [PlaceService, PlaceOsmResolutionService],
})
export class PlaceModule {}
