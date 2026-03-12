import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { ConfigModule } from "@nestjs/config";

import { PlaceModule } from "../place/place.module";
import { GoogleModule } from "./google/google.module";
import { OsmModule } from "./osm/osm.module";
import { CollectorService } from "./collector.service";

@Module({
  imports: [ConfigModule, HttpModule, PlaceModule, GoogleModule, OsmModule],
  providers: [CollectorService],
  exports: [CollectorService, GoogleModule, OsmModule],
})
export class CollectorModule {}
