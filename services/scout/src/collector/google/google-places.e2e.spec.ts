import { resolve } from "path";

import { Test, TestingModule } from "@nestjs/testing";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule, getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { GooglePlacesService } from "./places/places.service";
import { GooglePlacesModule } from "./places/places.module";
import { PlaceService } from "../../place/place.service";
import type { IUpsertPlacePayload } from "../../place/types";
import { CityEntity } from "../../city/city.entity";
import { CitySeedModule } from "../../city/city.seed.module";
import { CitySeedService } from "../../city/city.seed.service";
import ormconfig from "../../infrastructure/database/database.config";

describe("GooglePlacesService — Vatican City", () => {
  let testModule: TestingModule;
  let service: GooglePlacesService;
  let citySeedService: CitySeedService;
  let cityEntityRepository: Repository<CityEntity>;
  let cityEntity: CityEntity;
  let collected: IUpsertPlacePayload[];

  beforeAll(async () => {
    testModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          envFilePath: resolve(__dirname, "../../..", ".env.test"),
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
        GooglePlacesModule,
      ],
    })
      .overrideProvider(PlaceService)
      .useValue({
        upsert: jest.fn((payload: IUpsertPlacePayload) => {
          collected.push(payload);
        }),
      })
      .compile();

    service = testModule.get(GooglePlacesService);
    citySeedService = testModule.get(CitySeedService);
    cityEntityRepository = testModule.get<Repository<CityEntity>>(getRepositoryToken(CityEntity));
  });

  afterAll(async () => {
    await testModule.close();
  });

  beforeEach(async () => {
    collected = [];
    cityEntity = await citySeedService.seedCity();
  });

  afterEach(async () => {
    await cityEntityRepository.createQueryBuilder().delete().execute();
  });

  it("collects places from Vatican City", async () => {
    await service.collectForCity(cityEntity);

    console.info(`\n  Total upsert calls: ${collected.length}`);

    const unique = [...new Map(collected.map(p => [p.googlePlaceId, p])).values()];
    console.info(`  Unique places: ${unique.length}`);
    unique.slice(0, 15).forEach(p => {
      console.info(`    [${p.category}] ${p.name} (${p.googlePlaceId})`);
    });

    expect(collected).toBeInstanceOf(Array);
    expect(collected.length).toBeGreaterThan(0);

    const sample = collected[0];
    expect(sample.cityId).toEqual(cityEntity.id);
    expect(sample.name).toBeDefined();
    expect(sample.googlePlaceId).toBeDefined();
    expect(sample.lat).toBeDefined();
    expect(sample.lng).toBeDefined();
    expect(sample.category).toBeDefined();
  });
});
