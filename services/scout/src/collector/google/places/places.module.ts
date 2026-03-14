import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { PlaceCoreModule } from "../../../place/place-core.module";
import { GooglePlacesFetcherModule } from "../fetcher/fetcher.module";
import { GooglePlaceMapperService } from "./place-mapper.service";
import { GooglePlacesService } from "./places.service";

@Module({
  imports: [ConfigModule, PlaceCoreModule, GooglePlacesFetcherModule],
  providers: [GooglePlaceMapperService, GooglePlacesService],
  exports: [GooglePlacesService],
})
export class GooglePlacesModule {}
