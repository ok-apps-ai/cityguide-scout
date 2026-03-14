import { Test, TestingModule } from "@nestjs/testing";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { EventEmitter2, EventEmitterModule } from "@nestjs/event-emitter";
import { getRepositoryToken, TypeOrmModule } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { CityEntity } from "../city/city.entity";
import { CITY_CREATED_EVENT } from "../city/city.service";
import { CitySeedModule } from "../city/city.seed.module";
import { CitySeedService } from "../city/city.seed.service";
import { PlaceEntity } from "../place/place.entity";
import { PlaceSeedModule } from "../place/place.seed.module";
import { geomFromWkt } from "../common/seed.utils";
import { DEFAULT_PLACE_COORDS, PlaceSeedService } from "../place/place.seed.service";
import { PlaceModule } from "../place/place.module";
import { RouteEntity } from "../route/route.entity";
import { RouteStopEntity } from "../route/route-stop.entity";
import { RouteModule } from "../route/route.module";
import ormconfig from "../infrastructure/database/database.config";
import { GeneratorModule } from "./generator.module";
import { GeneratorService } from "./generator.service";

describe("GeneratorService — integration", () => {
  let testModule: TestingModule;
  let generatorService: GeneratorService;
  let citySeedService: CitySeedService;
  let placeSeedService: PlaceSeedService;
  let cityEntityRepository: Repository<CityEntity>;
  let placeEntityRepository: Repository<PlaceEntity>;
  let routeEntityRepository: Repository<RouteEntity>;
  let routeStopEntityRepository: Repository<RouteStopEntity>;

  let cityEntity: CityEntity;

  beforeAll(async () => {
    testModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ envFilePath: `.env.${process.env.NODE_ENV}` }),
        EventEmitterModule.forRoot(),
        TypeOrmModule.forRootAsync({
          imports: [ConfigModule],
          useFactory: (configService: ConfigService) => ({
            ...ormconfig,
            url: configService.get<string>("POSTGRES_URL"),
          }),
          inject: [ConfigService],
        }),
        TypeOrmModule.forFeature([CityEntity, PlaceEntity, RouteEntity, RouteStopEntity]),
        CitySeedModule,
        PlaceSeedModule,
        PlaceModule,
        RouteModule,
        GeneratorModule,
      ],
    }).compile();

    await testModule.init();

    generatorService = testModule.get(GeneratorService);
    citySeedService = testModule.get(CitySeedService);
    placeSeedService = testModule.get(PlaceSeedService);
    cityEntityRepository = testModule.get<Repository<CityEntity>>(getRepositoryToken(CityEntity));
    placeEntityRepository = testModule.get<Repository<PlaceEntity>>(getRepositoryToken(PlaceEntity));
    routeEntityRepository = testModule.get<Repository<RouteEntity>>(getRepositoryToken(RouteEntity));
    routeStopEntityRepository = testModule.get<Repository<RouteStopEntity>>(getRepositoryToken(RouteStopEntity));
  });

  beforeEach(async () => {
    cityEntity = await citySeedService.seedCity();
    for (let i = 0; i < DEFAULT_PLACE_COORDS.length; i++) {
      const { lat, lng } = DEFAULT_PLACE_COORDS[i];
      await placeSeedService.seedPlace({
        cityId: cityEntity.id,
        name: `Test Place ${i + 1}`,
        geom: geomFromWkt(`POINT(${lng} ${lat})`),
      });
    }
  });

  afterEach(async () => {
    await routeStopEntityRepository.createQueryBuilder().delete().execute();
    await routeEntityRepository.createQueryBuilder().delete().execute();
    await placeEntityRepository.createQueryBuilder().delete().execute();
    await cityEntityRepository.createQueryBuilder().delete().execute();
  });

  afterAll(async () => {
    await testModule.close();
  });

  describe("onCityCreated", () => {
    it("calls generateForCity with city id when city created event is emitted", async () => {
      const generateSpy = jest.spyOn(generatorService, "generateForCity").mockResolvedValue([]);

      const eventEmitter = testModule.get(EventEmitter2);
      await eventEmitter.emitAsync(CITY_CREATED_EVENT, cityEntity);

      expect(generateSpy).toHaveBeenCalledWith(cityEntity);
    });
  });

  describe("generateForCity", () => {
    it("invokes graph for city and returns saved route ids", async () => {
      const result = await generatorService.generateForCity(cityEntity);

      expect(result).toBeInstanceOf(Array);
      expect(result.every(id => typeof id === "string")).toBe(true);
    });
  });
});
