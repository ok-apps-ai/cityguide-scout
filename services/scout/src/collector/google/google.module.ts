import { Module } from "@nestjs/common";

import { GooglePlacesFetcherModule } from "./fetcher/fetcher.module";
import { GooglePlacesModule } from "./places/places.module";

@Module({
  imports: [GooglePlacesFetcherModule, GooglePlacesModule],
  exports: [GooglePlacesFetcherModule, GooglePlacesModule],
})
export class GoogleModule {}
