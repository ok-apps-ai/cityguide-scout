import { Test, TestingModule } from "@nestjs/testing";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule, getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { EventEmitter2, EventEmitterModule } from "@nestjs/event-emitter";

import { PlaceEnrichmentService } from "./place-enrichment.service";
import { PlaceService } from "./place.service";
import { PlaceCategory, PlaceEntity, PlaceSource } from "./place.entity";
import { PLACE_ACCEPTED } from "./place.patterns";
import { CityEntity } from "../city/city.entity";
import { CitySeedModule } from "../city/city.seed.module";
import { CitySeedService } from "../city/city.seed.service";
import { PlaceModule } from "./place.module";
import ormconfig from "../infrastructure/database/database.config";

const BASILICA_GOOGLE_PLACE_ID = "ChIJWZsUt2FgLxMRg1KHzXfwS3I";
const BASILICA_LAT = 41.9022;
const BASILICA_LNG = 12.4532;

describe("PlaceEnrichmentService integration — Basilica di San Pietro", () => {
  let testModule: TestingModule;
  let placeEnrichmentService: PlaceEnrichmentService;
  let placeService: PlaceService;
  let eventEmitter: EventEmitter2;
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
        EventEmitterModule.forRoot(),
        CitySeedModule,
        PlaceModule,
      ],
    }).compile();

    await testModule.init();

    placeEnrichmentService = testModule.get(PlaceEnrichmentService);
    placeService = testModule.get(PlaceService);
    eventEmitter = testModule.get(EventEmitter2);
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

  it("enriches Basilica di San Pietro with description and mediaUrl", async () => {
    const placeEntity = await placeService.insertPlace({
      cityId: cityEntity.id,
      name: "Basilica di San Pietro",
      lat: BASILICA_LAT,
      lng: BASILICA_LNG,
      source: PlaceSource.GOOGLE,
      googlePlaceId: BASILICA_GOOGLE_PLACE_ID,
      category: PlaceCategory.CHURCH,
    });
    expect(placeEntity).toBeDefined();
    expect(placeEntity!.description).toBeNull();
    expect(placeEntity!.mediaUrl).toBeNull();

    await placeEnrichmentService.onPlaceAccepted({ placeIds: [placeEntity!.id] });

    const enriched = await placeService.findById(placeEntity!.id);
    expect(enriched).toBeDefined();
    expect(enriched!.description).toBeDefined();
    expect(enriched!.description!.length).toBeGreaterThan(0);
    expect(enriched!.mediaUrl).toBeDefined();
    expect(enriched!.mediaUrl!.length).toBeGreaterThan(0);
    expect(enriched!.mediaUrl).toMatch(/^https?:\/\//);
  });

  it("enriches place when PLACE_ACCEPTED event is emitted", async () => {
    const placeEntity = await placeService.insertPlace({
      cityId: cityEntity.id,
      name: "Basilica di San Pietro",
      lat: BASILICA_LAT,
      lng: BASILICA_LNG,
      source: PlaceSource.GOOGLE,
      googlePlaceId: BASILICA_GOOGLE_PLACE_ID,
      category: PlaceCategory.CHURCH,
    });
    expect(placeEntity).toBeDefined();
    expect(placeEntity!.description).toBeNull();
    expect(placeEntity!.mediaUrl).toBeNull();

    await eventEmitter.emitAsync(PLACE_ACCEPTED, { placeIds: [placeEntity!.id] });

    const enriched = await placeService.findById(placeEntity!.id);
    expect(enriched).toBeDefined();
    expect(enriched!.description).toBeDefined();
    expect(enriched!.description!.length).toBeGreaterThan(0);
    expect(enriched!.mediaUrl).toBeDefined();
    expect(enriched!.mediaUrl!.length).toBeGreaterThan(0);
    expect(enriched!.mediaUrl).toMatch(/^https?:\/\//);
  });
});
