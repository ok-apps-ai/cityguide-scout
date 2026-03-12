import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { EventEmitterModule } from "@nestjs/event-emitter";

import { InfrastructureModule } from "./infrastructure/infrastructure.module";
import { DatabaseOrmModule } from "./infrastructure/database/typeorm.module";
import { CityModule } from "./city/city.module";
import { PlaceModule } from "./place/place.module";
import { RouteModule } from "./route/route.module";
import { CollectorModule } from "./collector/collector.module";
import { GeneratorModule } from "./generator/generator.module";
import ormconfig from "./infrastructure/database/database.config";

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: `.env.${process.env.NODE_ENV!}`,
    }),
    EventEmitterModule.forRoot(),
    DatabaseOrmModule.forRoot(ormconfig),
    InfrastructureModule,
    CityModule,
    PlaceModule,
    RouteModule,
    CollectorModule,
    GeneratorModule,
  ],
})
export class AppModule {}
