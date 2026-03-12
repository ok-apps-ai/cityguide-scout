import { resolve } from "path";

import { Test, TestingModule } from "@nestjs/testing";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule, getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { GooglePlacesService } from "./places/places.service";
import { GooglePlacesModule } from "./places/places.module";
import { PlaceEntity, PlaceCategory } from "../../place/place.entity";
import { CityEntity } from "../../city/city.entity";
import { CitySeedModule } from "../../city/city.seed.module";
import { CitySeedService } from "../../city/city.seed.service";
import { PlaceModule } from "../../place/place.module";
import { ns } from "../../common/constants";
import ormconfig from "../../infrastructure/database/database.config";

// Tbilisi bounding box
const TBILISI = {
  name: "Tbilisi, Georgia",
  swLng: 44.711,
  swLat: 41.642,
  neLng: 44.897,
  neLat: 41.804,
};

describe("GooglePlacesService integration — Tbilisi area geometry types", () => {
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
    cityEntity = await citySeedService.seedCity(TBILISI);
  });

  afterEach(async () => {
    await cityEntityRepository.createQueryBuilder().delete().execute();
  });

  it("collects places from Tbilisi and stores correct geometry types for area and linear features", async () => {
    await service.collectForCity(cityEntity);

    const places = await placeEntityRepository.find({ where: { cityId: cityEntity.id } });

    console.info(`\n  Total places: ${places.length}`);

    const countByCategory = places.reduce<Record<string, number>>((acc, p) => {
      acc[p.category] = (acc[p.category] ?? 0) + 1;
      return acc;
    }, {});
    for (const [cat, count] of Object.entries(countByCategory)) {
      console.info(`  [${cat}] ${count} places`);
    }

    const naturalFeatures = places.filter(p => p.category === PlaceCategory.NATURAL_FEATURE);
    const hikingAreas = places.filter(p => p.category === PlaceCategory.HIKING_AREA);
    const parks = places.filter(p => p.category === PlaceCategory.PARK);

    console.info(`\n  Natural features (${naturalFeatures.length}):`);
    naturalFeatures.slice(0, 5).forEach(p => console.info(`    ${p.name}`));

    console.info(`  Hiking areas (${hikingAreas.length}):`);
    hikingAreas.slice(0, 5).forEach(p => console.info(`    ${p.name}`));

    console.info(`  Parks (${parks.length}):`);
    parks.slice(0, 5).forEach(p => console.info(`    ${p.name}`));

    expect(places).toBeInstanceOf(Array);
    expect(places.length).toBeGreaterThan(0);

    if (naturalFeatures.length > 0) {
      const geomTypes: Array<{ geom_type: string }> = await placeEntityRepository.manager.query(
        `SELECT DISTINCT ST_GeometryType(geom::geometry) AS geom_type
         FROM ${ns}.places
         WHERE city_id = $1 AND category = $2`,
        [cityEntity.id, PlaceCategory.NATURAL_FEATURE],
      );
      console.info(`\n  Natural feature geometry types: ${geomTypes.map(r => r.geom_type).join(", ")}`);
      expect(geomTypes.length).toBeGreaterThan(0);
    }

    if (hikingAreas.length > 0) {
      const geomTypes: Array<{ geom_type: string }> = await placeEntityRepository.manager.query(
        `SELECT DISTINCT ST_GeometryType(geom::geometry) AS geom_type
         FROM ${ns}.places
         WHERE city_id = $1 AND category = $2`,
        [cityEntity.id, PlaceCategory.HIKING_AREA],
      );
      console.info(`  Hiking area geometry types: ${geomTypes.map(r => r.geom_type).join(", ")}`);
      expect(geomTypes.some(r => r.geom_type === "ST_LineString" || r.geom_type === "ST_Point")).toBe(true);
    }

    if (parks.length > 0) {
      const geomTypes: Array<{ geom_type: string }> = await placeEntityRepository.manager.query(
        `SELECT DISTINCT ST_GeometryType(geom::geometry) AS geom_type
         FROM ${ns}.places
         WHERE city_id = $1 AND category = $2`,
        [cityEntity.id, PlaceCategory.PARK],
      );
      console.info(`  Park geometry types: ${geomTypes.map(r => r.geom_type).join(", ")}`);
      expect(geomTypes.some(r => r.geom_type === "ST_Polygon" || r.geom_type === "ST_Point")).toBe(true);
    }
  });
});
