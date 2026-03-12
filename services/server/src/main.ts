import { NestFactory } from "@nestjs/core";
import { Logger } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { ConfigService } from "@nestjs/config";

import { AppModule } from "./app.module";

const logger = new Logger("Bootstrap");

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.enableCors();

  const configService = app.get(ConfigService);

  const options = new DocumentBuilder()
    .setTitle("City Guide API")
    .setDescription("Gateway to the Scout microservice")
    .setVersion("1.0")
    .build();
  SwaggerModule.setup("swagger", app, SwaggerModule.createDocument(app, options));

  const host = configService.get<string>("HOST", "localhost");
  const port = configService.get<number>("PORT", 3001);

  await app.listen(port, host);
  logger.log(`Server is running on http://${host}:${port}`);
  logger.log(`Swagger at http://${host}:${port}/swagger`);
}

void bootstrap();
