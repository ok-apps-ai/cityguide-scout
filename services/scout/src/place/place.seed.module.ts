import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { PlaceEntity } from "./place.entity";
import { PlaceSeedService } from "./place.seed.service";

@Module({
  imports: [TypeOrmModule.forFeature([PlaceEntity])],
  providers: [PlaceSeedService],
  exports: [PlaceSeedService],
})
export class PlaceSeedModule {}
