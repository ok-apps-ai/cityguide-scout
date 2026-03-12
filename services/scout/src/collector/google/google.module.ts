import { Module, forwardRef } from "@nestjs/common";

import { GooglePlacesFetcherModule } from "./fetcher/fetcher.module";
import { GooglePlacesModule } from "./places/places.module";

@Module({
  imports: [GooglePlacesFetcherModule, forwardRef(() => GooglePlacesModule)],
  exports: [GooglePlacesFetcherModule, forwardRef(() => GooglePlacesModule)],
})
export class GoogleModule {}
