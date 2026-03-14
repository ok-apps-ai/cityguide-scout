import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { ConfigModule } from "@nestjs/config";

import { CityModule } from "../../city/city.module";
import { GooglePlacesFetcherModule } from "../../collector/google/fetcher/fetcher.module";
import { PlaceCoreModule } from "../place-core.module";
import { PlaceDescriptionGeneratorService } from "./place-description-generator.service";
import { PlaceEnrichmentService } from "./place-enrichment.service";
import { GooglePlaceMediaUrlProvider } from "./google-place-media-url-provider.service";
import { ImageResolutionProcedure } from "./procedures/image-resolution.procedure";
import { DescriptionGenerationProcedure } from "./procedures/description-generation.procedure";

@Module({
  imports: [ConfigModule, HttpModule, CityModule, PlaceCoreModule, GooglePlacesFetcherModule],
  providers: [
    PlaceDescriptionGeneratorService,
    PlaceEnrichmentService,
    ImageResolutionProcedure,
    DescriptionGenerationProcedure,
    {
      provide: "IPlaceMediaUrlProvider",
      useClass: GooglePlaceMediaUrlProvider,
    },
    {
      provide: "ENRICHMENT_PROCEDURES",
      useFactory: (
        imageResolution: ImageResolutionProcedure,
        descriptionGeneration: DescriptionGenerationProcedure,
      ) => [imageResolution, descriptionGeneration],
      inject: [ImageResolutionProcedure, DescriptionGenerationProcedure],
    },
  ],
  exports: [PlaceEnrichmentService],
})
export class EnrichmentModule {}
