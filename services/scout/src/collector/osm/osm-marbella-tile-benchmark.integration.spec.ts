import { resolve } from "path";

import { Test, TestingModule } from "@nestjs/testing";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { TypeOrmModule, getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { OsmPlacesService } from "./places/places.service";
import { OsmPlacesModule } from "./places/places.module";
import { PlaceEntity } from "../../place/place.entity";
import { CityEntity } from "../../city/city.entity";
import { CitySeedModule } from "../../city/city.seed.module";
import { CitySeedService } from "../../city/city.seed.service";
import { PlaceModule } from "../../place/place.module";
import ormconfig from "../../infrastructure/database/database.config";

const MARBELLA = {
  name: "Marbella, Spain",
  swLng: -4.997958053312195,
  swLat: 36.46925543705756,
  neLng: -4.732026189448817,
  neLat: 36.53244634433455,
};

const MARBELLA_LAT_SPAN = MARBELLA.neLat - MARBELLA.swLat;
const MARBELLA_LNG_SPAN = MARBELLA.neLng - MARBELLA.swLng;
const TILE_SIZES = [0.01] as const;

function tileGridFor(tileSize: number): { nLat: number; nLng: number; tiles: number } {
  const nLat = Math.ceil(MARBELLA_LAT_SPAN / tileSize);
  const nLng = Math.ceil(MARBELLA_LNG_SPAN / tileSize);
  return { nLat, nLng, tiles: nLat * nLng };
}

describe("OsmPlacesService integration — Marbella tile size benchmark", () => {
  jest.setTimeout(1_800_000);

  let testModule: TestingModule;
  let service: OsmPlacesService;
  let citySeedService: CitySeedService;
  let cityEntityRepository: Repository<CityEntity>;
  let placeEntityRepository: Repository<PlaceEntity>;

  beforeAll(async () => {
    testModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          envFilePath: resolve(__dirname, "../../..", ".env.development"),
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
        CitySeedModule,
        PlaceModule,
        OsmPlacesModule,
      ],
    }).compile();

    service = testModule.get(OsmPlacesService);
    citySeedService = testModule.get(CitySeedService);
    cityEntityRepository = testModule.get<Repository<CityEntity>>(getRepositoryToken(CityEntity));
    placeEntityRepository = testModule.get<Repository<PlaceEntity>>(getRepositoryToken(PlaceEntity));
  });

  afterAll(async () => {
    await testModule.close();
  });

  it("smoke: collects OSM places from Marbella with 1 tile (single Overpass request)", async () => {
    await cityEntityRepository.createQueryBuilder().delete().execute();
    const cityEntity = await citySeedService.seedCity(MARBELLA);

    console.info("\n  Smoke test: 1 tile, single Overpass request...");
    const start = Date.now();
    await service.collectForCity(cityEntity);
    const elapsed = Date.now() - start;

    const places = await placeEntityRepository.find({ where: { cityId: cityEntity.id } });
    console.info(`  Smoke test: completed in ${(elapsed / 1000).toFixed(1)}s, ${places.length} places`);

    expect(places.length).toBeGreaterThan(0);

    const withTypes = places.filter(p => p.types && p.types.length > 0);
    expect(withTypes.length).toBeGreaterThan(0);
    expect(withTypes[0].types).toBeInstanceOf(Array);
    expect(withTypes[0].types.length).toBeGreaterThan(0);
    console.info(
      `  Sample OSM types: [${withTypes[0].types.slice(0, 5).join(", ")}${withTypes[0].types.length > 5 ? "..." : ""}]`,
    );
  });

  it("benchmarks OSM collection for Marbella with tile sizes 0.01, 0.02, 0.03", async () => {
    const results: Array<{
      tileSize: number;
      nLat: number;
      nLng: number;
      tiles: number;
      apiRequests: number;
      uniquePlaces: number;
      totalTimeMs: number;
      avgTimeMs: number;
    }> = [];

    for (let runIndex = 0; runIndex < TILE_SIZES.length; runIndex++) {
      const tileSize = TILE_SIZES[runIndex];
      const { nLat, nLng, tiles } = tileGridFor(tileSize);

      console.info(
        `\n  [${runIndex + 1}/${TILE_SIZES.length}] Running tile size ${tileSize} (${nLat}×${nLng} = ${tiles} tiles)...`,
      );

      await placeEntityRepository.createQueryBuilder().delete().execute();
      await cityEntityRepository.createQueryBuilder().delete().execute();
      const cityEntity = await citySeedService.seedCity(MARBELLA);

      const start = Date.now();
      await service.collectForCity(cityEntity, { tileSizeDeg: tileSize });
      const totalTimeMs = Date.now() - start;

      console.info(`  [${runIndex + 1}/${TILE_SIZES.length}] Completed in ${(totalTimeMs / 1000).toFixed(1)}s`);

      const places = await placeEntityRepository.find({ where: { cityId: cityEntity.id } });
      const uniquePlaces = places.length;
      const avgTimeMs = tiles > 0 ? Math.round(totalTimeMs / tiles) : 0;

      results.push({
        tileSize,
        nLat,
        nLng,
        tiles,
        apiRequests: tiles,
        uniquePlaces,
        totalTimeMs,
        avgTimeMs,
      });
    }

    console.info("\n  OSM Overpass — Marbella Tile Size Benchmark\n");
    console.info(
      "  | TILE_SIZE_DEG | nLat×nLng | Tiles | API requests | Unique places | Total time | Avg time/request |",
    );
    console.info(
      "  |---------------|----------|-------|--------------|---------------|------------|------------------|",
    );
    for (const r of results) {
      const totalSec = (r.totalTimeMs / 1000).toFixed(1);
      const grid = `${r.nLat}×${r.nLng}`;
      console.info(
        `  | ${r.tileSize.toFixed(2).padStart(13)} | ${grid.padStart(8)} | ${String(r.tiles).padStart(5)} | ${String(r.apiRequests).padStart(13)} | ${String(r.uniquePlaces).padStart(13)} | ${`${totalSec} s`.padStart(10)} | ${`${r.avgTimeMs} ms`.padStart(16)} |`,
      );
    }
    console.info("");

    expect(results.length).toBe(1);
    expect(results.every(r => r.uniquePlaces > 0)).toBe(true);
  });
});
