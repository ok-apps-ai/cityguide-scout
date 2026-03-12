import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { ConfigModule } from "@nestjs/config";

import { GooglePlacesFetcherService } from "./fetcher.service";

@Module({
  imports: [ConfigModule, HttpModule],
  providers: [GooglePlacesFetcherService],
  exports: [GooglePlacesFetcherService],
})
export class GooglePlacesFetcherModule {}
