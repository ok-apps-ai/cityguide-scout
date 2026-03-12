import { execSync } from "child_process";
import { resolve } from "path";

import { Test, TestingModule } from "@nestjs/testing";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { TypeOrmModule, getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { DEFAULT_ROUTE_GENERATION_OPTIONS } from "./generator.options";
import { GeneratorService } from "./generator.service";
import { GeneratorModule } from "./generator.module";
import { RouteEntity, RouteMode } from "../route/route.entity";
import { CityEntity } from "../city/city.entity";
import { PriceLevel } from "../place/place.entity";
import ormconfig from "../infrastructure/database/database.config";

// Marbella city ID from backup (scout-development-20260311-165321.sql)
const MARBELLA_CITY_ID = "1b2aa715-cedf-4479-b60a-6475a1a0c634";

describe("GeneratorService — route building (Marbella backup data)", () => {
  jest.setTimeout(180_000);

  beforeAll(() => {
    const repoRoot = resolve(__dirname, "../../../../");
    const backup = resolve(repoRoot, "backups/scout-development-20260311-165321.sql");
    execSync(`sh "${resolve(repoRoot, "scripts/restore-test-db.sh")}" "${backup}"`, {
      cwd: repoRoot,
      stdio: "pipe",
    });
  });

  let testModule: TestingModule;
  let generatorService: GeneratorService;
  let routeEntityRepository: Repository<RouteEntity>;
  let cityEntityRepository: Repository<CityEntity>;

  beforeAll(async () => {
    testModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          envFilePath: resolve(__dirname, "../..", ".env.test"),
        }),
        EventEmitterModule.forRoot(),
        TypeOrmModule.forRootAsync({
          imports: [ConfigModule],
          useFactory: (configService: ConfigService) => ({
            ...ormconfig,
            url: configService.get<string>("POSTGRES_URL"),
          }),
          inject: [ConfigService],
        }),
        TypeOrmModule.forFeature([CityEntity, RouteEntity]),
        GeneratorModule,
      ],
    }).compile();

    generatorService = testModule.get(GeneratorService);
    routeEntityRepository = testModule.get<Repository<RouteEntity>>(getRepositoryToken(RouteEntity));
    cityEntityRepository = testModule.get<Repository<CityEntity>>(getRepositoryToken(CityEntity));
  });

  afterAll(async () => {
    await testModule.close();
  });

  it("builds routes for Marbella using backup data", async () => {
    const city = await cityEntityRepository.findOne({ where: { id: MARBELLA_CITY_ID } });
    expect(city).toBeDefined();
    expect(city?.name).toBe("Marbella, Spain");

    const routeIds = await generatorService.generateForCity(MARBELLA_CITY_ID);

    expect(routeIds).toBeInstanceOf(Array);
    expect(routeIds.length).toBeGreaterThan(0);

    const routes = await routeEntityRepository.find({
      where: { cityId: MARBELLA_CITY_ID },
      relations: ["stops", "stops.place"],
      order: { createdAt: "ASC" },
    });

    expect(routes.length).toBeGreaterThan(0);

    expect(routeIds.length).toBe(routes.length);

    console.info(`\n  Routes claimed by generator: ${routeIds.length}`);
    console.info(`  Routes stored in DB: ${routes.length}`);

    const VALID_PRICE_LEVELS = [
      PriceLevel.FREE,
      PriceLevel.INEXPENSIVE,
      PriceLevel.MODERATE,
      PriceLevel.EXPENSIVE,
      PriceLevel.VERY_EXPENSIVE,
    ];

    for (const route of routes) {
      expect(route.name).toBeDefined();
      expect(route.theme).toBeDefined();
      expect(route.routeMode).toBeDefined();
      expect(route.stops.length).toBeGreaterThanOrEqual(1);

      // Time: duration stored in route table
      expect(route.durationMinutes).toBeGreaterThan(0);
      expect(Number.isInteger(route.durationMinutes)).toBe(true);

      // Distance: road distance stored in route table (km)
      expect(route.distanceKm).not.toBeNull();
      expect(Number(route.distanceKm)).toBeGreaterThanOrEqual(0);
      if (route.stops.length >= 2) {
        expect(Number(route.distanceKm)).toBeGreaterThan(0);
      }

      // Price: road price stored in route table
      expect(route.priceLevel).not.toBeNull();
      expect(VALID_PRICE_LEVELS).toContain(route.priceLevel);
    }

    console.info(`\n  Routes built: ${routes.length}`);
    routes.forEach(r => {
      console.info(
        `    ${r.name} (${r.theme}, ${r.routeMode}) — ${r.stops.length} stops, ${r.durationMinutes} min, ${r.distanceKm} km, ${r.priceLevel}`,
      );
    });
  });

  it("produces routes for WALKING, CYCLING, and DRIVING with duration presets 2h and 10h", async () => {
    const city = await cityEntityRepository.findOne({ where: { id: MARBELLA_CITY_ID } });
    expect(city).toBeDefined();

    await routeEntityRepository.delete({ cityId: MARBELLA_CITY_ID });

    const preset = {
      ...DEFAULT_ROUTE_GENERATION_OPTIONS,
      routeModes: [RouteMode.WALKING, RouteMode.CYCLING, RouteMode.DRIVING],
      durationPresetsMinutes: [120, 600],
    };
    const routeIds = await generatorService.generateForCity(MARBELLA_CITY_ID, preset);

    expect(routeIds).toBeInstanceOf(Array);
    expect(routeIds.length).toBeGreaterThan(0);

    const routes = await routeEntityRepository.find({
      where: { cityId: MARBELLA_CITY_ID },
      relations: ["stops", "stops.place"],
      order: { createdAt: "ASC" },
    });

    const byMode = {
      [RouteMode.WALKING]: routes.filter(r => r.routeMode === RouteMode.WALKING),
      [RouteMode.CYCLING]: routes.filter(r => r.routeMode === RouteMode.CYCLING),
      [RouteMode.DRIVING]: routes.filter(r => r.routeMode === RouteMode.DRIVING),
    };

    expect(byMode[RouteMode.WALKING].length).toBeGreaterThan(0);
    expect(byMode[RouteMode.CYCLING].length).toBeGreaterThan(0);
    expect(byMode[RouteMode.DRIVING].length).toBeGreaterThan(0);

    const DURATION_TOLERANCE = 60;
    const has2hRoute = routes.some(r => Math.abs(r.durationMinutes - 120) <= DURATION_TOLERANCE);
    const has10hRoute = routes.some(r => Math.abs(r.durationMinutes - 600) <= DURATION_TOLERANCE);
    expect(has2hRoute || has10hRoute).toBe(true);

    console.info("\n  Routes by mode:");
    for (const mode of [RouteMode.WALKING, RouteMode.CYCLING, RouteMode.DRIVING]) {
      console.info(`    ${mode}: ${byMode[mode].length} routes`);
      byMode[mode].slice(0, 3).forEach(r => {
        console.info(`      ${r.name} — ${r.durationMinutes} min, ${r.distanceKm} km`);
      });
    }
  });
});
