import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { CollectorModule } from "../collector/collector.module";
import { CityEntity } from "./city.entity";
import { CityController } from "./city.controller";
import { CityService } from "./city.service";

@Module({
  imports: [TypeOrmModule.forFeature([CityEntity]), CollectorModule],
  controllers: [CityController],
  providers: [CityService],
  exports: [CityService],
})
export class CityModule {}
