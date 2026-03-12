/**
 * Temporary script: creates a city (triggers POI collection + route generation).
 * Logs each step and surfaces errors.
 *
 * Run: npx ts-node --transpile-only scripts/create-city-debug.ts
 */

import { resolve } from "path";
import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { DataSource } from "typeorm";

import { AppModule } from "../src/app.module";
import { CityService } from "../src/city/city.service";
import { CityEntity } from "../src/city/city.entity";

const LOG = (step: string, data?: unknown): void => {
  const ts = new Date().toISOString();
  if (data !== undefined) {
    console.log(`[${ts}] ${step}`, typeof data === "object" ? JSON.stringify(data, null, 2) : data);
  } else {
    console.log(`[${ts}] ${step}`);
  }
};

async function main(): Promise<void> {
  LOG("STEP 0: Script started");

  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = "development";
  }

  const dotenv = await import("dotenv");
  for (const name of [".env.development", ".env"]) {
    const envPath = resolve(__dirname, "..", name);
    const result = dotenv.config({ path: envPath });
    if (!result.error) {
      LOG("STEP 1 OK: Env loaded from " + name);
      break;
    }
  }

  const postgresUrl = process.env.POSTGRES_URL;
  if (!postgresUrl) {
    LOG("STEP 2 FAIL: POSTGRES_URL not set");
    process.exit(1);
  }

  LOG("STEP 3: Bootstrapping NestJS app");
  const app = await NestFactory.create(AppModule, {
    logger: ["error", "warn", "log"],
  });

  const cityService = app.get(CityService);
  const dataSource = app.get(DataSource);

  const payload = {
    name: "Marbella, Spain",
    northeast: { lat: 36.53, lng: -4.73 },
    southwest: { lat: 36.47, lng: -4.99 },
  };

  LOG("STEP 4: Creating city", payload);

  try {
    const { id } = await cityService.create(payload);
    LOG("STEP 4 OK: City created", { id });

    const cityRepo = dataSource.getRepository(CityEntity);
    const city = await cityRepo.findOneOrFail({ where: { id } });
    LOG("STEP 5: City in DB", { id: city.id, name: city.name });
  } catch (err) {
    const axiosErr = err as { response?: { status?: number; data?: unknown } };
    LOG("STEP 4 FAIL", {
      error: err instanceof Error ? err.message : String(err),
      name: err instanceof Error ? err.constructor.name : undefined,
      status: axiosErr.response?.status,
      responseData: axiosErr.response?.data,
    });
    LOG("STEP 4 FAIL: Stack", { stack: err instanceof Error ? err.stack : undefined });
    process.exit(1);
  } finally {
    await app.close();
  }

  LOG("STEP 6: Done");
}

main().catch(err => {
  console.error("[FATAL]", err);
  process.exit(1);
});
