import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { PlaceModule } from "../place/place.module";
import { RouteModule } from "../route/route.module";
import { GeneratorController } from "./generator.controller";
import { GeneratorService } from "./generator.service";

@Module({
  imports: [ConfigModule, PlaceModule, RouteModule],
  controllers: [GeneratorController],
  providers: [GeneratorService],
  exports: [GeneratorService],
})
export class GeneratorModule {}
