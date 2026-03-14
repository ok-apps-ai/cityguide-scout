import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { CityModule } from "../city/city.module";
import { PlaceModule } from "../place/place.module";
import { RouteModule } from "../route/route.module";
import { GeneratorController } from "./generator.controller";
import { GeneratorService } from "./generator.service";

@Module({
  imports: [ConfigModule, CityModule, PlaceModule, RouteModule],
  controllers: [GeneratorController],
  providers: [GeneratorService],
  exports: [GeneratorService],
})
export class GeneratorModule {}
