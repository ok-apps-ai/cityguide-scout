import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { CityEntity } from "./city.entity";
import { CitySeedService } from "./city.seed.service";

@Module({
  imports: [TypeOrmModule.forFeature([CityEntity])],
  providers: [CitySeedService],
  exports: [CitySeedService],
})
export class CitySeedModule {}
