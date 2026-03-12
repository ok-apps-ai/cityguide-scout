import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ClientsModule, Transport } from "@nestjs/microservices";

import { CityController } from "./city.controller";
import { SCOUT_SERVICE } from "./city.constants";

@Module({
  imports: [
    ClientsModule.registerAsync({
      clients: [
        {
          name: SCOUT_SERVICE,
          imports: [ConfigModule],
          useFactory: (configService: ConfigService) => ({
            transport: Transport.TCP,
            options: {
              host: configService.get<string>("SCOUT_HOST", "localhost"),
              port: configService.get<number>("SCOUT_PORT", 3010),
            },
          }),
          inject: [ConfigService],
        },
      ],
    }),
  ],
  controllers: [CityController],
})
export class CityModule {}
