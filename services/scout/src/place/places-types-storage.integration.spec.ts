import { Test, TestingModule } from "@nestjs/testing";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule, getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { GooglePlacesService } from "../collector/google/places/places.service";
import { GoogleModule } from "../collector/google/google.module";
import { OsmPlacesService } from "../collector/osm/places/places.service";
import { OsmModule } from "../collector/osm/osm.module";
import { PlaceEntity, PlaceSource } from "./place.entity";
import { CityEntity } from "../city/city.entity";
import { RouteEntity } from "../route/route.entity";
import { RouteStopEntity } from "../route/route-stop.entity";
import { CitySeedModule } from "../city/city.seed.module";
import { CitySeedService } from "../city/city.seed.service";
import { PlaceModule } from "./place.module";
import ormconfig from "../infrastructure/database/database.config";

/**
 * Vatican City: small bbox → 1 grid point (Google) and 1 tile (OSM).
 * Single request to each API.
 */
describe("Places types storage integration — Vatican City (1 request per API)", () => {
  let testModule: TestingModule;
  let googlePlacesService: GooglePlacesService;
  let osmPlacesService: OsmPlacesService;
  let citySeedService: CitySeedService;
  let cityEntityRepository: Repository<CityEntity>;
  let placeEntityRepository: Repository<PlaceEntity>;
  let routeStopEntityRepository: Repository<RouteStopEntity>;
  let routeEntityRepository: Repository<RouteEntity>;
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
        TypeOrmModule.forFeature([RouteEntity, RouteStopEntity]),
        CitySeedModule,
        PlaceModule,
        GoogleModule,
        OsmModule,
      ],
    }).compile();

    googlePlacesService = testModule.get(GooglePlacesService);
    osmPlacesService = testModule.get(OsmPlacesService);
    citySeedService = testModule.get(CitySeedService);
    cityEntityRepository = testModule.get<Repository<CityEntity>>(getRepositoryToken(CityEntity));
    placeEntityRepository = testModule.get<Repository<PlaceEntity>>(getRepositoryToken(PlaceEntity));
    routeStopEntityRepository = testModule.get<Repository<RouteStopEntity>>(getRepositoryToken(RouteStopEntity));
    routeEntityRepository = testModule.get<Repository<RouteEntity>>(getRepositoryToken(RouteEntity));
  });

  afterAll(async () => {
    await testModule.close();
  });

  beforeEach(async () => {
    cityEntity = await citySeedService.seedCity();
  });

  afterEach(async () => {
    await routeStopEntityRepository.createQueryBuilder().delete().execute();
    await routeEntityRepository.createQueryBuilder().delete().execute();
    await placeEntityRepository.createQueryBuilder().delete().execute();
    await cityEntityRepository.createQueryBuilder().delete().execute();
  });

  it("stores types from Google API and OSM tags (1 request each)", async () => {
    const googleCollected = await googlePlacesService.fetchPointsForCity(cityEntity);
    await googlePlacesService.savePointsToDb(cityEntity.id, googleCollected);

    const osmCollected = await osmPlacesService.fetchPointsForCity(cityEntity);
    await osmPlacesService.savePointsToDb(cityEntity.id, osmCollected);

    const places = await placeEntityRepository.find({ where: { cityId: cityEntity.id } });
    const googlePlaces = places.filter(p => p.source === PlaceSource.GOOGLE);
    const osmPlaces = places.filter(p => p.source === PlaceSource.OSM);

    expect(googlePlaces.length).toBe(googleCollected.length);
    const googleSavedIds = new Set(googlePlaces.map(p => p.googlePlaceId));
    expect(googleCollected.map(p => p.place_id).every(id => googleSavedIds.has(id))).toBe(true);

    expect(osmPlaces.length).toBe(osmCollected.length);
    const osmSavedIds = new Set(osmPlaces.map(p => p.osmId));
    expect(osmCollected.map(e => `${e.type}:${e.id}`).every(id => osmSavedIds.has(id))).toBe(true);
  });
});
