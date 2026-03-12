import { resolve } from "path";

import { Test, TestingModule } from "@nestjs/testing";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { getRepositoryToken, TypeOrmModule } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { RouteService } from "./route.service";
import { RouteModule } from "./route.module";
import { RouteEntity, RouteMode } from "./route.entity";
import { CityEntity } from "../city/city.entity";
import { CitySeedModule } from "../city/city.seed.module";
import { CitySeedService } from "../city/city.seed.service";
import { RouteSeedModule } from "./route.seed.module";
import { RouteSeedService } from "./route.seed.service";
import ormconfig from "../infrastructure/database/database.config";

describe("RouteService.findRoutesForApi — route mode filter", () => {
  let testModule: TestingModule;
  let routeService: RouteService;
  let citySeedService: CitySeedService;
  let routeSeedService: RouteSeedService;
  let routeEntityRepository: Repository<RouteEntity>;
  let cityEntityRepository: Repository<CityEntity>;

  let cityEntity: CityEntity;

  beforeAll(async () => {
    testModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          envFilePath: resolve(__dirname, "../..", ".env.test"),
        }),
        TypeOrmModule.forRootAsync({
          imports: [ConfigModule],
          useFactory: (configService: ConfigService) => ({
            ...ormconfig,
            url: configService.get<string>("POSTGRES_URL"),
          }),
          inject: [ConfigService],
        }),
        TypeOrmModule.forFeature([CityEntity, RouteEntity]),
        CitySeedModule,
        RouteSeedModule,
        RouteModule,
      ],
    }).compile();

    routeService = testModule.get(RouteService);
    citySeedService = testModule.get(CitySeedService);
    routeSeedService = testModule.get(RouteSeedService);
    routeEntityRepository = testModule.get<Repository<RouteEntity>>(getRepositoryToken(RouteEntity));
    cityEntityRepository = testModule.get<Repository<CityEntity>>(getRepositoryToken(CityEntity));
  });

  beforeEach(async () => {
    cityEntity = await citySeedService.seedCity();
    await routeSeedService.seedRoute({ cityId: cityEntity.id, routeMode: RouteMode.WALKING });
    await routeSeedService.seedRoute({ cityId: cityEntity.id, routeMode: RouteMode.CYCLING });
    await routeSeedService.seedRoute({ cityId: cityEntity.id, routeMode: RouteMode.DRIVING });
  });

  afterEach(async () => {
    await routeEntityRepository.createQueryBuilder().delete().execute();
    await cityEntityRepository.createQueryBuilder().delete().execute();
  });

  afterAll(async () => {
    await testModule.close();
  });

  it("returns all routes when routeMode is not provided", async () => {
    const routes = await routeService.findRoutesForApi(cityEntity.id);

    expect(routes).toBeInstanceOf(Array);
    expect(routes).toHaveLength(3);
    const modes = new Set(routes.map(r => r.routeMode));
    expect(modes).toContain("walking");
    expect(modes).toContain("cycling");
    expect(modes).toContain("driving");
  });

  it("returns only walking routes when routeMode=walking", async () => {
    const routes = await routeService.findRoutesForApi(cityEntity.id, "walking");

    expect(routes).toBeInstanceOf(Array);
    expect(routes).toHaveLength(1);
    expect(routes[0].routeMode).toEqual("walking");
  });

  it("returns only cycling routes when routeMode=cycling", async () => {
    const routes = await routeService.findRoutesForApi(cityEntity.id, "cycling");

    expect(routes).toBeInstanceOf(Array);
    expect(routes).toHaveLength(1);
    expect(routes[0].routeMode).toEqual("cycling");
  });

  it("returns only driving routes when routeMode=driving", async () => {
    const routes = await routeService.findRoutesForApi(cityEntity.id, "driving");

    expect(routes).toBeInstanceOf(Array);
    expect(routes).toHaveLength(1);
    expect(routes[0].routeMode).toEqual("driving");
  });

  it("returns different counts for different filters", async () => {
    const [all, walking, cycling, driving] = await Promise.all([
      routeService.findRoutesForApi(cityEntity.id),
      routeService.findRoutesForApi(cityEntity.id, "walking"),
      routeService.findRoutesForApi(cityEntity.id, "cycling"),
      routeService.findRoutesForApi(cityEntity.id, "driving"),
    ]);

    expect(all).toHaveLength(3);
    expect(walking).toHaveLength(1);
    expect(cycling).toHaveLength(1);
    expect(driving).toHaveLength(1);
    expect(walking[0].routeMode).toEqual("walking");
    expect(cycling[0].routeMode).toEqual("cycling");
    expect(driving[0].routeMode).toEqual("driving");
  });
});
