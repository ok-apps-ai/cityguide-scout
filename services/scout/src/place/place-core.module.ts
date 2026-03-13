import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { PlaceEntity } from "./place.entity";
import { PlaceService } from "./place.service";

@Module({
  imports: [TypeOrmModule.forFeature([PlaceEntity])],
  providers: [PlaceService],
  exports: [PlaceService],
})
export class PlaceCoreModule {}
