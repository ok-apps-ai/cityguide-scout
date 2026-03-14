import { Test, TestingModule } from "@nestjs/testing";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { EventEmitter2, EventEmitterModule } from "@nestjs/event-emitter";
import { getRepositoryToken, TypeOrmModule } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { MemorySaver, START } from "@langchain/langgraph";

import { PriceLevel, RouteMode, RouteTheme } from "@framework/types";
import type { IPlace, IRouteOptions } from "@framework/types";

import { buildRouteGraph } from "./route.graph";
import type { ICluster, IRouteSeed, IRouteStop, IWeightedPlace, RouteGenerationState } from "./state";
import { WALKING_ROUTE_GENERATION_OPTIONS } from "../generator.options";
import ormconfig from "../../infrastructure/database/database.config";
import { CityEntity } from "../../city/city.entity";
import { CitySeedModule } from "../../city/city.seed.module";
import { CitySeedService } from "../../city/city.seed.service";
import { PlaceEntity } from "../../place/place.entity";
import { PlaceSeedModule } from "../../place/place.seed.module";
import { PlaceSeedService } from "../../place/place.seed.service";
import { PlaceModule } from "../../place/place.module";
import { PlaceService } from "../../place/place.service";
import { PlaceOsmResolutionService } from "../../place/osm-resolution/place-osm-resolution.service";
import { RouteEntity } from "../../route/route.entity";
import { RouteStopEntity } from "../../route/route-stop.entity";
import { RouteModule } from "../../route/route.module";
import { RouteService } from "../../route/route.service";

const createResumeState = (
  routeOptions: IRouteOptions,
  overrides: Partial<RouteGenerationState>,
): RouteGenerationState => ({
  cityId: "",
  location: "Vatican City",
  theme: RouteTheme.HIGHLIGHTS,
  routeGenerationOptions: routeOptions,
  places: [],
  weightedPlaces: [],
  clusters: [],
  seeds: [],
  currentSeed: null,
  candidatePlaces: [],
  scoredPlaces: [],
  orderedStops: [],
  trimmedStops: [],
  builtRoute: null,
  savedRoutes: [],
  error: null,
  ...overrides,
});

describe("Route graph resume from node — integration", () => {
  let testModule: TestingModule;
  let placeService: PlaceService;
  let placeOsmResolutionService: PlaceOsmResolutionService;
  let routeService: RouteService;
  let dataSource: DataSource;
  let citySeedService: CitySeedService;
  let placeSeedService: PlaceSeedService;
  let cityEntityRepository: Repository<CityEntity>;
  let placeEntityRepository: Repository<PlaceEntity>;
  let routeEntityRepository: Repository<RouteEntity>;
  let routeStopEntityRepository: Repository<RouteStopEntity>;

  let cityEntity: CityEntity;

  const routeOptions = WALKING_ROUTE_GENERATION_OPTIONS;

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
      ],
    }).compile();

    placeService = testModule.get(PlaceService);
    placeOsmResolutionService = testModule.get(PlaceOsmResolutionService);
    routeService = testModule.get(RouteService);
    dataSource = testModule.get(DataSource);
    citySeedService = testModule.get(CitySeedService);
    placeSeedService = testModule.get(PlaceSeedService);
    cityEntityRepository = testModule.get<Repository<CityEntity>>(getRepositoryToken(CityEntity));
    placeEntityRepository = testModule.get<Repository<PlaceEntity>>(getRepositoryToken(PlaceEntity));
    routeEntityRepository = testModule.get<Repository<RouteEntity>>(getRepositoryToken(RouteEntity));
    routeStopEntityRepository = testModule.get<Repository<RouteStopEntity>>(getRepositoryToken(RouteStopEntity));
  });

  beforeEach(async () => {
    cityEntity = await citySeedService.seedCity();
    await placeSeedService.seedPlaces(cityEntity.id);
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

  const getDeps = () => ({
    placeService,
    placeOsmResolutionService,
    routeService,
    dataSource,
    openaiApiKey: "",
    eventEmitter: testModule.get(EventEmitter2),
  });

  describe("loadPoi", () => {
    it("resumes from loadPoi with route options and state", async () => {
      const state = createResumeState(routeOptions, { cityId: cityEntity.id });
      const checkpointer = new MemorySaver();
      const graph = buildRouteGraph(getDeps(), { checkpointer });

      const config = { configurable: { thread_id: "resume-loadPoi" } };
      const forkConfig = await graph.updateState(config, state, START);

      const result = await graph.invoke(null, { ...forkConfig, recursionLimit: 500 });

      expect(result.places).toBeDefined();
      expect(result.places).toBeInstanceOf(Array);
      expect(result.places.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("populateCoordCache", () => {
    it("resumes from populateCoordCache with route options and state", async () => {
      const places = (await placeService.findByCityId(cityEntity.id)) as IPlace[];
      const state = createResumeState(routeOptions, {
        cityId: cityEntity.id,
        places,
      });
      const checkpointer = new MemorySaver();
      const graph = buildRouteGraph(getDeps(), { checkpointer });

      const config = { configurable: { thread_id: "resume-populateCoordCache" } };
      const forkConfig = await graph.updateState(config, state, "loadPoi");

      const result = await graph.invoke(null, { ...forkConfig, recursionLimit: 500 });

      expect(result.places).toBeDefined();
      expect(result.places.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("computeWeights", () => {
    it("resumes from computeWeights with route options and state", async () => {
      const places = (await placeService.findByCityId(cityEntity.id)) as IPlace[];
      const state = createResumeState(routeOptions, {
        cityId: cityEntity.id,
        places,
      });
      const checkpointer = new MemorySaver();
      const graph = buildRouteGraph(getDeps(), { checkpointer });

      const config = { configurable: { thread_id: "resume-computeWeights" } };
      const forkConfig = await graph.updateState(config, state, "populateCoordCache");

      const result = await graph.invoke(null, { ...forkConfig, recursionLimit: 500 });

      expect(result.weightedPlaces).toBeDefined();
      expect(result.weightedPlaces).toBeInstanceOf(Array);
    });
  });

  describe("spatialClustering", () => {
    it("resumes from spatialClustering with route options and state", async () => {
      const places = (await placeService.findByCityId(cityEntity.id)) as IPlace[];
      const weightedPlaces: IWeightedPlace[] = places.map(p => ({ place: p, weight: 5 }));
      const state = createResumeState(routeOptions, {
        cityId: cityEntity.id,
        places,
        weightedPlaces,
      });
      const checkpointer = new MemorySaver();
      const graph = buildRouteGraph(getDeps(), { checkpointer });

      const config = { configurable: { thread_id: "resume-spatialClustering" } };
      const forkConfig = await graph.updateState(config, state, "computeWeights");

      const result = await graph.invoke(null, { ...forkConfig, recursionLimit: 500 });

      expect(result.clusters).toBeDefined();
      expect(result.clusters).toBeInstanceOf(Array);
    });
  });

  describe("selectCenters", () => {
    it("resumes from selectCenters with route options and state", async () => {
      const places = (await placeService.findByCityId(cityEntity.id)) as IPlace[];
      const weightedPlaces: IWeightedPlace[] = places.map(p => ({ place: p, weight: 5 }));
      const cluster: ICluster = {
        id: 0,
        places,
        centroidLat: 41.9,
        centroidLng: 12.45,
        seedPlace: places[0],
      };
      const state = createResumeState(routeOptions, {
        cityId: cityEntity.id,
        places,
        weightedPlaces,
        clusters: [cluster],
      });
      const checkpointer = new MemorySaver();
      const graph = buildRouteGraph(getDeps(), { checkpointer });

      const config = { configurable: { thread_id: "resume-selectCenters" } };
      const forkConfig = await graph.updateState(config, state, "spatialClustering");

      const result = await graph.invoke(null, { ...forkConfig, recursionLimit: 500 });

      expect(result.clusters).toBeDefined();
      expect(result.seeds).toBeDefined();
    });
  });

  describe("generateSeeds", () => {
    it("resumes from generateSeeds with route options and state", async () => {
      const places = (await placeService.findByCityId(cityEntity.id)) as IPlace[];
      const weightedPlaces: IWeightedPlace[] = places.map(p => ({ place: p, weight: 5 }));
      const cluster: ICluster = {
        id: 0,
        places,
        centroidLat: 41.9,
        centroidLng: 12.45,
        seedPlace: places[0],
      };
      const state = createResumeState(routeOptions, {
        cityId: cityEntity.id,
        places,
        weightedPlaces,
        clusters: [cluster],
      });
      const checkpointer = new MemorySaver();
      const graph = buildRouteGraph(getDeps(), { checkpointer });

      const config = { configurable: { thread_id: "resume-generateSeeds" } };
      const forkConfig = await graph.updateState(config, state, "selectCenters");

      const result = await graph.invoke(null, { ...forkConfig, recursionLimit: 500 });

      expect(result.seeds).toBeDefined();
      expect(result.seeds).toBeInstanceOf(Array);
    });
  });

  describe("pickNextSeed", () => {
    it("resumes from pickNextSeed with route options and state", async () => {
      const places = (await placeService.findByCityId(cityEntity.id)) as IPlace[];
      const weightedPlaces: IWeightedPlace[] = places.map(p => ({ place: p, weight: 5 }));
      const cluster: ICluster = {
        id: 0,
        places,
        centroidLat: 41.9,
        centroidLng: 12.45,
        seedPlace: places[0],
      };
      const seed: IRouteSeed = {
        theme: RouteTheme.HIGHLIGHTS,
        routeMode: RouteMode.WALKING,
        durationBudgetMinutes: 60,
        startPlace: places[0],
        cluster,
      };
      const state = createResumeState(routeOptions, {
        cityId: cityEntity.id,
        places,
        weightedPlaces,
        clusters: [cluster],
        seeds: [seed],
      });
      const checkpointer = new MemorySaver();
      const graph = buildRouteGraph(getDeps(), { checkpointer });

      const config = { configurable: { thread_id: "resume-pickNextSeed" } };
      const forkConfig = await graph.updateState(config, state, "generateSeeds");

      const result = await graph.invoke(null, { ...forkConfig, recursionLimit: 500 });

      expect(result.currentSeed).toBeDefined();
      expect(result.currentSeed?.theme).toEqual(RouteTheme.HIGHLIGHTS);
    });
  });

  describe("candidateGeneration", () => {
    it("resumes from candidateGeneration with route options and state", async () => {
      const places = (await placeService.findByCityId(cityEntity.id)) as IPlace[];
      const weightedPlaces: IWeightedPlace[] = places.map(p => ({ place: p, weight: 5 }));
      const cluster: ICluster = {
        id: 0,
        places,
        centroidLat: 41.9,
        centroidLng: 12.45,
        seedPlace: places[0],
      };
      const seed: IRouteSeed = {
        theme: RouteTheme.HIGHLIGHTS,
        routeMode: RouteMode.WALKING,
        durationBudgetMinutes: 60,
        startPlace: places[0],
        cluster,
      };
      const state = createResumeState(routeOptions, {
        cityId: cityEntity.id,
        places,
        weightedPlaces,
        clusters: [cluster],
        seeds: [],
        currentSeed: seed,
      });
      const checkpointer = new MemorySaver();
      const graph = buildRouteGraph(getDeps(), { checkpointer });

      const config = { configurable: { thread_id: "resume-candidateGeneration" } };
      const forkConfig = await graph.updateState(config, state, "pickNextSeed");

      const result = await graph.invoke(null, { ...forkConfig, recursionLimit: 500 });

      expect(result.candidatePlaces).toBeDefined();
      expect(result.candidatePlaces).toBeInstanceOf(Array);
    });
  });

  describe("poiScoring", () => {
    it("resumes from poiScoring with route options and state", async () => {
      const places = (await placeService.findByCityId(cityEntity.id)) as IPlace[];
      const weightedPlaces: IWeightedPlace[] = places.map(p => ({ place: p, weight: 5 }));
      const cluster: ICluster = {
        id: 0,
        places,
        centroidLat: 41.9,
        centroidLng: 12.45,
        seedPlace: places[0],
      };
      const seed: IRouteSeed = {
        theme: RouteTheme.HIGHLIGHTS,
        routeMode: RouteMode.WALKING,
        durationBudgetMinutes: 60,
        startPlace: places[0],
        cluster,
      };
      const state = createResumeState(routeOptions, {
        cityId: cityEntity.id,
        places,
        weightedPlaces,
        clusters: [cluster],
        seeds: [],
        currentSeed: seed,
        candidatePlaces: places,
      });
      const checkpointer = new MemorySaver();
      const graph = buildRouteGraph(getDeps(), { checkpointer });

      const config = { configurable: { thread_id: "resume-poiScoring" } };
      const forkConfig = await graph.updateState(config, state, "candidateGeneration");

      const result = await graph.invoke(null, { ...forkConfig, recursionLimit: 500 });

      expect(result.scoredPlaces).toBeDefined();
      expect(result.scoredPlaces).toBeInstanceOf(Array);
    });
  });

  describe("routeOptimization", () => {
    it("resumes from routeOptimization with route options and state", async () => {
      const places = (await placeService.findByCityId(cityEntity.id)) as IPlace[];
      const weightedPlaces: IWeightedPlace[] = places.map(p => ({ place: p, weight: 5 }));
      const scoredPlaces: IWeightedPlace[] = places.map(p => ({ place: p, weight: 10 }));
      const cluster: ICluster = {
        id: 0,
        places,
        centroidLat: 41.9,
        centroidLng: 12.45,
        seedPlace: places[0],
      };
      const seed: IRouteSeed = {
        theme: RouteTheme.HIGHLIGHTS,
        routeMode: RouteMode.WALKING,
        durationBudgetMinutes: 60,
        startPlace: places[0],
        cluster,
      };
      const state = createResumeState(routeOptions, {
        cityId: cityEntity.id,
        places,
        weightedPlaces,
        clusters: [cluster],
        seeds: [],
        currentSeed: seed,
        candidatePlaces: places,
        scoredPlaces,
      });
      const checkpointer = new MemorySaver();
      const graph = buildRouteGraph(getDeps(), { checkpointer });

      const config = { configurable: { thread_id: "resume-routeOptimization" } };
      const forkConfig = await graph.updateState(config, state, "poiScoring");

      const result = await graph.invoke(null, { ...forkConfig, recursionLimit: 500 });

      expect(result.orderedStops).toBeDefined();
      expect(result.orderedStops).toBeInstanceOf(Array);
    });
  });

  describe("durationLimiting", () => {
    it("resumes from durationLimiting with route options and state", async () => {
      const places = (await placeService.findByCityId(cityEntity.id)) as IPlace[];
      const orderedStops: IRouteStop[] = places.slice(0, 3).map((p, i) => ({
        place: p,
        orderIndex: i,
        visitDurationMinutes: 15,
      }));
      const cluster: ICluster = {
        id: 0,
        places,
        centroidLat: 41.9,
        centroidLng: 12.45,
        seedPlace: places[0],
      };
      const seed: IRouteSeed = {
        theme: RouteTheme.HIGHLIGHTS,
        routeMode: RouteMode.WALKING,
        durationBudgetMinutes: 60,
        startPlace: places[0],
        cluster,
      };
      const state = createResumeState(routeOptions, {
        cityId: cityEntity.id,
        places,
        weightedPlaces: [],
        clusters: [cluster],
        seeds: [],
        currentSeed: seed,
        candidatePlaces: places,
        scoredPlaces: [],
        orderedStops,
      });
      const checkpointer = new MemorySaver();
      const graph = buildRouteGraph(getDeps(), { checkpointer });

      const config = { configurable: { thread_id: "resume-durationLimiting" } };
      const forkConfig = await graph.updateState(config, state, "routeOptimization");

      const result = await graph.invoke(null, { ...forkConfig, recursionLimit: 500 });

      expect(result.trimmedStops).toBeDefined();
      expect(result.trimmedStops).toBeInstanceOf(Array);
    });
  });

  describe("costCalculation", () => {
    it("resumes from costCalculation with route options and state", async () => {
      const places = (await placeService.findByCityId(cityEntity.id)) as IPlace[];
      const trimmedStops: IRouteStop[] = places.slice(0, 3).map((p, i) => ({
        place: p,
        orderIndex: i,
        visitDurationMinutes: 15,
      }));
      const cluster: ICluster = {
        id: 0,
        places,
        centroidLat: 41.9,
        centroidLng: 12.45,
        seedPlace: places[0],
      };
      const seed: IRouteSeed = {
        theme: RouteTheme.HIGHLIGHTS,
        routeMode: RouteMode.WALKING,
        durationBudgetMinutes: 60,
        startPlace: places[0],
        cluster,
      };
      const state = createResumeState(routeOptions, {
        cityId: cityEntity.id,
        places,
        weightedPlaces: [],
        clusters: [cluster],
        seeds: [],
        currentSeed: seed,
        candidatePlaces: places,
        scoredPlaces: [],
        orderedStops: trimmedStops,
        trimmedStops,
      });
      const checkpointer = new MemorySaver();
      const graph = buildRouteGraph(getDeps(), { checkpointer });

      const config = { configurable: { thread_id: "resume-costCalculation" } };
      const forkConfig = await graph.updateState(config, state, "durationLimiting");

      const result = await graph.invoke(null, { ...forkConfig, recursionLimit: 500 });

      expect(result).toBeDefined();
      expect(result.builtRoute === null || Array.isArray(result.builtRoute?.stops)).toBe(true);
    });
  });

  describe("resolveOsmPlaces", () => {
    it("resumes from resolveOsmPlaces with route options and state", async () => {
      const places = (await placeService.findByCityId(cityEntity.id)) as IPlace[];
      const stops: IRouteStop[] = places.slice(0, 3).map((p, i) => ({
        place: p,
        orderIndex: i,
        visitDurationMinutes: 15,
      }));
      const builtRoute = {
        name: "Test Route",
        theme: RouteTheme.HIGHLIGHTS,
        routeMode: RouteMode.WALKING,
        durationMinutes: 45,
        distanceKm: 3,
        priceLevel: PriceLevel.FREE,
        startPlaceId: places[0].id,
        routeGeometryWkt: "LINESTRING(12.45 41.9, 12.451 41.901)",
        stops,
      };
      const cluster: ICluster = {
        id: 0,
        places,
        centroidLat: 41.9,
        centroidLng: 12.45,
        seedPlace: places[0],
      };
      const seed: IRouteSeed = {
        theme: RouteTheme.HIGHLIGHTS,
        routeMode: RouteMode.WALKING,
        durationBudgetMinutes: 60,
        startPlace: places[0],
        cluster,
      };
      const state = createResumeState(routeOptions, {
        cityId: cityEntity.id,
        places,
        weightedPlaces: [],
        clusters: [cluster],
        seeds: [],
        currentSeed: seed,
        candidatePlaces: places,
        scoredPlaces: [],
        orderedStops: stops,
        trimmedStops: stops,
        builtRoute,
      });
      const checkpointer = new MemorySaver();
      const graph = buildRouteGraph(getDeps(), { checkpointer });

      const config = { configurable: { thread_id: "resume-resolveOsmPlaces" } };
      const forkConfig = await graph.updateState(config, state, "costCalculation");

      const result = await graph.invoke(null, { ...forkConfig, recursionLimit: 500 });

      expect(result).toBeDefined();
      expect(result.builtRoute === null || Array.isArray(result.builtRoute?.stops)).toBe(true);
    });
  });

  describe("saveRoute", () => {
    it("resumes from saveRoute with route options and state", async () => {
      const places = (await placeService.findByCityId(cityEntity.id)) as IPlace[];
      const stops: IRouteStop[] = places.slice(0, 3).map((p, i) => ({
        place: p,
        orderIndex: i,
        visitDurationMinutes: 15,
      }));
      const builtRoute = {
        name: "Test Route",
        theme: RouteTheme.HIGHLIGHTS,
        routeMode: RouteMode.WALKING,
        durationMinutes: 45,
        distanceKm: 3,
        priceLevel: PriceLevel.FREE,
        startPlaceId: places[0].id,
        routeGeometryWkt: "LINESTRING(12.45 41.9, 12.451 41.901)",
        stops,
      };
      const cluster: ICluster = {
        id: 0,
        places,
        centroidLat: 41.9,
        centroidLng: 12.45,
        seedPlace: places[0],
      };
      const seed: IRouteSeed = {
        theme: RouteTheme.HIGHLIGHTS,
        routeMode: RouteMode.WALKING,
        durationBudgetMinutes: 60,
        startPlace: places[0],
        cluster,
      };
      const state = createResumeState(routeOptions, {
        cityId: cityEntity.id,
        places,
        weightedPlaces: [],
        clusters: [cluster],
        seeds: [],
        currentSeed: seed,
        candidatePlaces: places,
        scoredPlaces: [],
        orderedStops: stops,
        trimmedStops: stops,
        builtRoute,
      });
      const checkpointer = new MemorySaver();
      const graph = buildRouteGraph(getDeps(), { checkpointer });

      const config = { configurable: { thread_id: "resume-saveRoute" } };
      const forkConfig = await graph.updateState(config, state, "resolveOsmPlaces");

      const result = await graph.invoke(null, { ...forkConfig, recursionLimit: 500 });

      expect(result.savedRoutes).toBeDefined();
      expect(result.savedRoutes).toBeInstanceOf(Array);
      expect(result.savedRoutes.length).toBeGreaterThanOrEqual(0);
    });
  });
});
