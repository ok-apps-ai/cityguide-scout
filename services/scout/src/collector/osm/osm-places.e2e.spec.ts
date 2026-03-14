import { Test, TestingModule } from "@nestjs/testing";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule, getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { OsmPlacesService } from "./places";
import { OsmOverpassFetcherService } from "./fetcher";
import { OsmModule } from "./osm.module";
import { CityEntity } from "../../city/city.entity";
import { PlaceEntity } from "../../place/place.entity";
import { CitySeedModule } from "../../city/city.seed.module";
import { CitySeedService } from "../../city/city.seed.service";
import { PlaceModule } from "../../place/place.module";
import ormconfig from "../../infrastructure/database/database.config";

/** Tile bbox from discovery script (scripts/find-osm-casino-tile.ts). Contains Casino Marbella. */
const CASINO_TILE_BBOX = {
  south: 36.4837124,
  west: -4.9667098,
  north: 36.4937124,
  east: -4.9567098,
};

describe("OsmPlacesService — casino filter", () => {
  let testModule: TestingModule;
  let osmPlacesService: OsmPlacesService;
  let osmOverpassFetcherService: OsmOverpassFetcherService;
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
        OsmModule,
      ],
    }).compile();

    osmPlacesService = testModule.get(OsmPlacesService);
    osmOverpassFetcherService = testModule.get(OsmOverpassFetcherService);
    citySeedService = testModule.get(CitySeedService);
    cityEntityRepository = testModule.get<Repository<CityEntity>>(getRepositoryToken(CityEntity));
    placeEntityRepository = testModule.get<Repository<PlaceEntity>>(getRepositoryToken(PlaceEntity));
  });

  afterAll(async () => {
    await testModule.close();
  });

  beforeEach(async () => {
    cityEntity = await citySeedService.seedCity({
      name: "Casino tile",
      swLng: CASINO_TILE_BBOX.west,
      swLat: CASINO_TILE_BBOX.south,
      neLng: CASINO_TILE_BBOX.east,
      neLat: CASINO_TILE_BBOX.north,
    });
  });

  afterEach(async () => {
    await placeEntityRepository.createQueryBuilder().delete().execute();
    await cityEntityRepository.createQueryBuilder().delete().execute();
  });

  it("excludes casino from fetched places", async () => {
    const rawElements = await osmOverpassFetcherService.fetchElements({
      bbox: CASINO_TILE_BBOX,
    });
    const casinoInRaw = rawElements.find(el => el.tags?.amenity === "casino");
    expect(casinoInRaw).toBeDefined();

    const results = await osmPlacesService.fetchPointsForCity(cityEntity);

    const casinoInFiltered = results.find(el => el.tags?.amenity === "casino");
    expect(casinoInFiltered).toBeUndefined();
  });
});
