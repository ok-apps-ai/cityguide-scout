import { Module } from "@nestjs/common";

import { PlaceCoreModule } from "./place-core.module";
import { EnrichmentModule } from "./enrichment/enrichment.module";
import { OsmResolutionModule } from "./osm-resolution/osm-resolution.module";

@Module({
  imports: [PlaceCoreModule, EnrichmentModule, OsmResolutionModule],
  exports: [PlaceCoreModule, EnrichmentModule, OsmResolutionModule],
})
export class PlaceModule {}
