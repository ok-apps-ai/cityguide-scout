import { NestFactory } from "@nestjs/core";
import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MicroserviceOptions, Transport } from "@nestjs/microservices";

import { AppModule } from "./app.module";

const logger = new Logger("Bootstrap");

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  const host = configService.get<string>("HOST", "localhost");
  const scoutPort = configService.get<number>("SCOUT_PORT", 3010);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: { host, port: scoutPort },
  });

  await app.startAllMicroservices();
  logger.log(`Scout microservice is listening on tcp://${host}:${scoutPort}`);
}

void bootstrap();
