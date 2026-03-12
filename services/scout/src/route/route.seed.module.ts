import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { RouteEntity } from "./route.entity";
import { RouteSeedService } from "./route.seed.service";

@Module({
  imports: [TypeOrmModule.forFeature([RouteEntity])],
  providers: [RouteSeedService],
  exports: [RouteSeedService],
})
export class RouteSeedModule {}
