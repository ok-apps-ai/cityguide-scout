import { resolve } from "path";

import { Test, TestingModule } from "@nestjs/testing";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule, getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { GooglePlacesService } from "./google/places/places.service";
import { OsmPlacesService } from "./osm/places/places.service";
import { GoogleModule } from "./google/google.module";
import { OsmModule } from "./osm/osm.module";
import { PlaceEntity, PlaceSource } from "../place/place.entity";
import { CityEntity } from "../city/city.entity";
import { CitySeedModule } from "../city/city.seed.module";
import { CitySeedService } from "../city/city.seed.service";
import { PlaceModule } from "../place/place.module";
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
  let cityEntity: CityEntity;

  beforeAll(async () => {
    testModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          envFilePath: resolve(__dirname, "../..", ".env.development"),
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
        OsmModule,
      ],
    }).compile();

    googlePlacesService = testModule.get(GooglePlacesService);
    osmPlacesService = testModule.get(OsmPlacesService);
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
    await placeEntityRepository.createQueryBuilder().delete().execute();
    await cityEntityRepository.createQueryBuilder().delete().execute();
  });

  it("stores types from Google API and OSM tags (1 request each)", async () => {
    await googlePlacesService.collectForCity(cityEntity);
    await osmPlacesService.collectForCity(cityEntity);

    const places = await placeEntityRepository.find({ where: { cityId: cityEntity.id } });

    const googlePlaces = places.filter(p => p.source === PlaceSource.GOOGLE);
    const osmPlaces = places.filter(p => p.source === PlaceSource.OSM);

    expect(googlePlaces.length).toBeGreaterThan(0);
    expect(osmPlaces.length).toBeGreaterThan(0);

    const googleWithTypes = googlePlaces.filter(p => p.types && p.types.length > 0);
    const osmWithTypes = osmPlaces.filter(p => p.types && p.types.length > 0);

    expect(googleWithTypes.length).toBeGreaterThan(0);
    expect(osmWithTypes.length).toBeGreaterThan(0);

    expect(googleWithTypes[0].types).toBeInstanceOf(Array);
    expect(googleWithTypes[0].types.length).toBeGreaterThan(0);
    expect(osmWithTypes[0].types).toBeInstanceOf(Array);
    expect(osmWithTypes[0].types.length).toBeGreaterThan(0);

    const gTypes = googleWithTypes[0].types;
    const oTypes = osmWithTypes[0].types;
    console.info(`  Google places: ${googlePlaces.length}, with types: ${googleWithTypes.length}`);
    console.info(`  Sample Google types: [${gTypes.slice(0, 5).join(", ")}${gTypes.length > 5 ? "..." : ""}]`);
    console.info(`  OSM places: ${osmPlaces.length}, with types: ${osmWithTypes.length}`);
    console.info(`  Sample OSM types: [${oTypes.slice(0, 5).join(", ")}${oTypes.length > 5 ? "..." : ""}]`);
  });
});
