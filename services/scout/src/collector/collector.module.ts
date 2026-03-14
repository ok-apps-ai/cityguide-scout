import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { ConfigModule } from "@nestjs/config";

import { GoogleModule } from "./google/google.module";
import { OsmModule } from "./osm/osm.module";
import { CollectorService } from "./collector.service";

@Module({
  imports: [ConfigModule, HttpModule, GoogleModule, OsmModule],
  providers: [CollectorService],
  exports: [CollectorService, GoogleModule, OsmModule],
})
export class CollectorModule {}
