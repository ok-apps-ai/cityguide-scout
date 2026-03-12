import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { PlaceModule } from "../../../place/place.module";
import { GooglePlacesFetcherModule } from "../fetcher/fetcher.module";
import { GooglePlaceMapperService } from "./place-mapper.service";
import { GooglePlacesService } from "./places.service";

@Module({
  imports: [ConfigModule, PlaceModule, GooglePlacesFetcherModule],
  providers: [GooglePlaceMapperService, GooglePlacesService],
  exports: [GooglePlacesService],
})
export class GooglePlacesModule {}
