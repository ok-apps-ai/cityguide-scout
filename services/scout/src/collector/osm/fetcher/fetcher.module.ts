import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";

import { OsmOverpassFetcherService } from "./fetcher.service";

@Module({
  imports: [HttpModule],
  providers: [OsmOverpassFetcherService],
  exports: [OsmOverpassFetcherService],
})
export class OsmOverpassFetcherModule {}
