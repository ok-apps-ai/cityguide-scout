import { Test, TestingModule } from "@nestjs/testing";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule, getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { GooglePlacesService } from "./places";
import { GoogleModule } from "./google.module";
import { CityEntity } from "../../city/city.entity";
import { PlaceEntity } from "../../place/place.entity";
import { CitySeedModule } from "../../city/city.seed.module";
import { CitySeedService } from "../../city/city.seed.service";
import { PlaceModule } from "../../place/place.module";
import ormconfig from "../../infrastructure/database/database.config";

describe("GooglePlacesService — Vatican City", () => {
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
          envFilePath: `.env.${process.env.NODE_ENV}`,
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
    placeEntityRepository = testModule.get<Repository<PlaceEntity>>(getRepositoryToken(PlaceEntity));
    citySeedService = testModule.get(CitySeedService);
    cityEntityRepository = testModule.get<Repository<CityEntity>>(getRepositoryToken(CityEntity));
  });

  afterAll(async () => {
    await testModule.close();
  });

  beforeEach(async () => {
    cityEntity = await citySeedService.seedCity();
  });

  afterEach(async () => {
    await placeEntityRepository.createQueryBuilder().delete().execute();
    await cityEntityRepository.createQueryBuilder().delete().execute();
  });

  it("collects places from Vatican City and stores them in the database", async () => {
    const collected = await service.fetchPointsForCity(cityEntity);
    const saved = await service.savePointsToDb(cityEntity.id, collected);

    expect(saved.length).toBe(collected.length);
  });
});
