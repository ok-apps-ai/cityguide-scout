import { APP_FILTER, APP_PIPE } from "@nestjs/core";
import { Logger, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { AppController } from "./app.controller";
import { HttpExceptionFilter } from "./common/filters/http";
import { ValidationExceptionFilter } from "./common/filters/validation";
import { HttpValidationPipe } from "./common/pipes/validation.http";
import { CityModule } from "./city/city.module";

@Module({
  providers: [
    Logger,
    {
      provide: APP_PIPE,
      useClass: HttpValidationPipe,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_FILTER,
      useClass: ValidationExceptionFilter,
    },
  ],
  imports: [
    ConfigModule.forRoot({
      envFilePath: `.env.${process.env.NODE_ENV}`,
    }),
    CityModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
