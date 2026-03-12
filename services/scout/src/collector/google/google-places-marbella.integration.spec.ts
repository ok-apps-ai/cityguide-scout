import { resolve } from "path";

import { Test, TestingModule } from "@nestjs/testing";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule, getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { GooglePlacesService } from "./places/places.service";
import { GooglePlacesModule } from "./places/places.module";
import { PlaceEntity } from "../../place/place.entity";
import { CityEntity } from "../../city/city.entity";
import { CitySeedModule } from "../../city/city.seed.module";
import { CitySeedService } from "../../city/city.seed.service";
import { PlaceModule } from "../../place/place.module";
import ormconfig from "../../infrastructure/database/database.config";

// Marbella bounding box (from production DB)
const MARBELLA = {
  name: "Marbella, Spain",
  swLng: -4.997958053312195,
  swLat: 36.46925543705756,
  neLng: -4.732026189448817,
  neLat: 36.53244634433455,
};

describe("GooglePlacesService integration — Marbella place count", () => {
  // Marbella has 56 grid cells × 12 categories — allow up to 10 minutes
  jest.setTimeout(600_000);

  let testModule: TestingModule;
  let service: GooglePlacesService;
  let citySeedService: CitySeedService;
  let cityEntityRepository: Repository<CityEntity>;
  let placeEntityRepository: Repository<PlaceEntity>;
  let cityEntity: CityEntity;

  beforeAll(async () => {
    testModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          envFilePath: resolve(__dirname, "../../..", ".env.development"),
        }),
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
        GooglePlacesModule,
      ],
    }).compile();

    service = testModule.get(GooglePlacesService);
    citySeedService = testModule.get(CitySeedService);
    cityEntityRepository = testModule.get<Repository<CityEntity>>(getRepositoryToken(CityEntity));
    placeEntityRepository = testModule.get<Repository<PlaceEntity>>(getRepositoryToken(PlaceEntity));
  });

  afterAll(async () => {
    await testModule.close();
  });

  beforeEach(async () => {
    // Remove any pre-existing data (including production scraping runs) so
    // google_place_id conflicts don't cause the upsert to keep a stale city_id.
    await cityEntityRepository.createQueryBuilder().delete().execute();
    cityEntity = await citySeedService.seedCity(MARBELLA);
  });

  afterEach(async () => {
    await cityEntityRepository.createQueryBuilder().delete().execute();
  });

  it("collects all places from Marbella and reports the breakdown by category", async () => {
    await service.collectForCity(cityEntity);

    const places = await placeEntityRepository.find({ where: { cityId: cityEntity.id } });

    console.info(`\n  Total unique places stored: ${places.length}`);

    const countByCategory = places.reduce<Record<string, number>>((acc, p) => {
      acc[p.category] = (acc[p.category] ?? 0) + 1;
      return acc;
    }, {});

    console.info(`\n  Breakdown by category:`);
    Object.entries(countByCategory)
      .sort(([, a], [, b]) => b - a)
      .forEach(([cat, count]) => console.info(`    [${cat}] ${count}`));

    console.info(`\n  Sample places (first 20):`);
    places.slice(0, 20).forEach(p => console.info(`    [${p.category}] ${p.name} — rating: ${p.rating ?? "n/a"}`));

    expect(places.length).toBeGreaterThan(0);
  });
});
