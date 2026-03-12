import { resolve } from "path";

import { Test, TestingModule } from "@nestjs/testing";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule, getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { GooglePlacesService } from "./places";
import { GoogleModule } from "./google.module";
import { PlaceEntity } from "../../place/place.entity";
import { CityEntity } from "../../city/city.entity";
import { CitySeedModule } from "../../city/city.seed.module";
import { CitySeedService } from "../../city/city.seed.service";
import { PlaceModule } from "../../place/place.module";
import ormconfig from "../../infrastructure/database/database.config";

describe("GooglePlacesService integration — Vatican City", () => {
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
        GoogleModule,
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
    cityEntity = await citySeedService.seedCity();
  });

  afterEach(async () => {
    await cityEntityRepository.createQueryBuilder().delete().execute();
  });

  it("collects all places from Vatican City and persists them to the development database", async () => {
    await service.collectForCity(cityEntity);

    const places = await placeEntityRepository.find({ where: { cityId: cityEntity.id } });

    console.info(`\n  Places stored in development DB: ${places.length}`);
    places.forEach(p => {
      console.info(`    [${p.category}] ${p.name} (${p.googlePlaceId})`);
    });

    expect(places).toBeInstanceOf(Array);
    expect(places.length).toBeGreaterThan(0);

    const sample = places[0];
    expect(sample.cityId).toEqual(cityEntity.id);
    expect(sample.name).toBeDefined();
    expect(sample.googlePlaceId).toBeDefined();
    expect(sample.geom).toBeDefined();
    expect(sample.category).toBeDefined();

    expect(sample.types).toBeDefined();
    expect(sample.types).toBeInstanceOf(Array);
    const withTypes = places.filter(p => p.types.length > 0);
    expect(withTypes.length).toBeGreaterThan(0);
    expect(withTypes[0].types.length).toBeGreaterThan(0);
    console.info(
      `  Sample Google types: [${withTypes[0].types.slice(0, 5).join(", ")}${withTypes[0].types.length > 5 ? "..." : ""}]`,
    );
  });
});
