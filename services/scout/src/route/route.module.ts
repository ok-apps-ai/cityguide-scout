import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { GoogleModule } from "../collector/google/google.module";
import { PlaceModule } from "../place/place.module";
import { RouteController } from "./route.controller";
import { RouteEntity } from "./route.entity";
import { RouteStopEntity } from "./route-stop.entity";
import { RouteService } from "./route.service";

@Module({
  imports: [TypeOrmModule.forFeature([RouteEntity, RouteStopEntity]), PlaceModule, GoogleModule],
  controllers: [RouteController],
  providers: [RouteService],
  exports: [RouteService],
})
export class RouteModule {}
