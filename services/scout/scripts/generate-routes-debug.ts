/**
 * Temporary script: generates routes from the current database.
 * Logs each step in detail and surfaces where it fails.
 *
 * Run: npx ts-node scripts/generate-routes-debug.ts [cityId]
 * Or:  npm run db:generate-routes-debug (from services/scout)
 *
 * If cityId omitted, uses first city from DB.
 * Requires: POSTGRES_URL, GOOGLE_API_KEY, OPENAI_API_KEY in env (e.g. from .env.development)
 */

import { resolve } from "path";
import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { DataSource } from "typeorm";

import { AppModule } from "../src/app.module";
import { GeneratorService } from "../src/generator/generator.service";
import { CityEntity } from "../src/city/city.entity";
import { PlaceEntity, PlaceSource } from "../src/place/place.entity";
import { DEFAULT_ROUTE_GENERATION_OPTIONS } from "../src/generator/generator.options";

const LOG = (step: string, data?: unknown): void => {
  const ts = new Date().toISOString();
  if (data !== undefined) {
    console.log(`[${ts}] ${step}`, typeof data === "object" ? JSON.stringify(data, null, 2) : data);
  } else {
    console.log(`[${ts}] ${step}`);
  }
};

const GRAPH_NODES = [
  "loadPoi",
  "populateCoordCache",
  "computeWeights",
  "spatialClustering",
  "selectCenters",
  "generateSeeds",
  "pickNextSeed",
  "candidateGeneration",
  "candidateGenerationCycling",
  "candidateGenerationDriving",
  "poiScoring",
  "routeOptimization",
  "durationLimiting",
  "costCalculation",
  "resolveOsmPlaces",
  "saveRoute",
];

async function main(): Promise<void> {
  LOG("STEP 0: Script started");

  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = "development";
    LOG("STEP 0: Set NODE_ENV=development for ConfigModule");
  }

  // Load env
  try {
    const dotenv = await import("dotenv");
    for (const name of [".env.development", ".env"]) {
      const envPath = resolve(__dirname, "..", name);
      const result = dotenv.config({ path: envPath });
      if (!result.error) {
        LOG("STEP 1 OK: Env loaded from " + name);
        break;
      }
    }
  } catch (err) {
    LOG("STEP 1 WARN: dotenv not available", { error: String(err) });
  }

  const postgresUrl = process.env.POSTGRES_URL;
  if (!postgresUrl) {
    LOG("STEP 2 FAIL: POSTGRES_URL not set");
    process.exit(1);
  }
  LOG("STEP 2 OK: POSTGRES_URL is set");

  const googleKey = process.env.GOOGLE_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  LOG("STEP 2: API keys", {
    GOOGLE_API_KEY: googleKey ? "set" : "MISSING",
    OPENAI_API_KEY: openaiKey ? "set" : "MISSING",
  });
  if (!googleKey) {
    LOG("STEP 2 FAIL: GOOGLE_API_KEY required for OSM place resolution");
    process.exit(1);
  }
  if (!openaiKey) {
    LOG("STEP 2 FAIL: OPENAI_API_KEY required for POI scoring");
    process.exit(1);
  }

  LOG("STEP 3: Bootstrapping NestJS app");
  let app;
  try {
    app = await NestFactory.create(AppModule, {
      logger: ["error", "warn", "log"],
    });
    LOG("STEP 3 OK: App created (not starting HTTP/microservices)");
    const configService = app.get(ConfigService);
    LOG("STEP 3: ConfigService check", {
      hasConfig: !!configService,
      openaiKey: configService.get("OPENAI_API_KEY") ? "set" : "missing",
    });
  } catch (err) {
    LOG("STEP 3 FAIL: Bootstrap failed", {
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    process.exit(1);
  }

  const dataSource = app.get(DataSource);
  const generatorService = app.get(GeneratorService);

  try {
    LOG("STEP 4: Fetching cities from database");
    const cityRepo = dataSource.getRepository(CityEntity);
    const cities = await cityRepo.find({ order: { createdAt: "ASC" } });
    LOG("STEP 4 OK", { cityCount: cities.length, cities: cities.map(c => ({ id: c.id, name: c.name })) });

    if (cities.length === 0) {
      LOG("STEP 4 FAIL: No cities in database");
      process.exit(1);
    }

    const cityIdArg = process.argv[2];
    const targetCity = cityIdArg
      ? cities.find(c => c.id === cityIdArg) ?? cities.find(c => c.name.toLowerCase().includes(cityIdArg.toLowerCase()))
      : cities[0];

    if (!targetCity) {
      LOG("STEP 4 FAIL: City not found", { arg: cityIdArg, available: cities.map(c => c.id) });
      process.exit(1);
    }

    LOG("STEP 4b: Pre-flight — place counts for city");
    const placeRepo = dataSource.getRepository(PlaceEntity);
    const [allPlaces, osmPlaces] = await Promise.all([
      placeRepo.count({ where: { cityId: targetCity.id } }),
      placeRepo.count({ where: { cityId: targetCity.id, source: PlaceSource.OSM } }),
    ]);
    LOG("STEP 4b OK", {
      cityId: targetCity.id,
      cityName: targetCity.name,
      totalPlaces: allPlaces,
      osmPlaces,
      googlePlaces: allPlaces - osmPlaces,
    });
    if (allPlaces === 0) {
      LOG("STEP 4b WARN: No places in city — route generation may produce no routes");
    }

    LOG("STEP 5: Starting route generation", {
      cityId: targetCity.id,
      cityName: targetCity.name,
      preset: DEFAULT_ROUTE_GENERATION_OPTIONS,
    });

    const startMs = Date.now();
    let routeIds: string[];

    try {
      routeIds = await generatorService.generateForCity(targetCity.id, DEFAULT_ROUTE_GENERATION_OPTIONS);
      const elapsed = ((Date.now() - startMs) / 1000).toFixed(1);
      LOG("STEP 5 OK: Route generation completed", {
        cityId: targetCity.id,
        cityName: targetCity.name,
        routeCount: routeIds.length,
        routeIds,
        elapsedSeconds: elapsed,
      });
    } catch (err) {
      const elapsed = ((Date.now() - startMs) / 1000).toFixed(1);
      LOG("STEP 5 FAIL: Route generation failed", {
        cityId: targetCity.id,
        cityName: targetCity.name,
        elapsedSeconds: elapsed,
        error: err instanceof Error ? err.message : String(err),
        errorName: err instanceof Error ? err.constructor.name : undefined,
      });
      LOG("STEP 5 FAIL: Full stack trace", {
        stack: err instanceof Error ? err.stack : undefined,
      });

      // Infer which graph node failed from stack trace
      const stack = err instanceof Error ? err.stack ?? "" : String(err);
      for (const node of GRAPH_NODES) {
        if (stack.includes(node)) {
          LOG("STEP 5 HINT: Failure likely in graph node", { node });
          break;
        }
      }

      process.exit(1);
    }

    LOG("STEP 6: Done");
  } finally {
    await app.close();
    LOG("App closed");
  }
}

main().catch(err => {
  console.error("[FATAL] Unhandled error:", err);
  process.exit(1);
});
