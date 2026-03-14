import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { RouteMode, RouteTheme } from "@framework/types";

import { WALKING_ROUTE_GENERATION_OPTIONS } from "../generator/route-presets";
import { RouteService } from "./route.service";
import { RouteEntity } from "./route.entity";
import { RouteStopEntity } from "./route-stop.entity";
import { PlaceService } from "../place/place.service";
import { GooglePlacesFetcherService } from "../collector/google/fetcher/fetcher.service";

describe("RouteService", () => {
  let service: RouteService;
  let routeEntityRepository: jest.Mocked<Repository<RouteEntity>>;
  let routeStopEntityRepository: jest.Mocked<Repository<RouteStopEntity>>;

  const mockRoute = {
    id: "route-1",
    cityId: "city-1",
    name: "Highlights",
    theme: RouteTheme.HIGHLIGHTS,
    routeMode: RouteMode.WALKING,
  } as RouteEntity;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RouteService,
        {
          provide: getRepositoryToken(RouteEntity),
          useValue: {
            query: jest.fn(),
            findOneOrFail: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(RouteStopEntity),
          useValue: {
            create: jest.fn((dto: Partial<RouteStopEntity>) => dto as RouteStopEntity),
            save: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: PlaceService,
          useValue: {},
        },
        {
          provide: GooglePlacesFetcherService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get(RouteService);
    routeEntityRepository = module.get(getRepositoryToken(RouteEntity));
    routeStopEntityRepository = module.get(getRepositoryToken(RouteStopEntity));

    jest.clearAllMocks();
  });

  describe("create", () => {
    it("inserts route and returns saved entity", async () => {
      routeEntityRepository.query.mockResolvedValue([{ id: "route-1" }]);
      routeEntityRepository.findOneOrFail.mockResolvedValue(mockRoute);

      const result = await service.create({
        cityId: "city-1",
        name: "Highlights",
        theme: RouteTheme.HIGHLIGHTS,
        routeMode: RouteMode.WALKING,
        durationMinutes: 60,
        distanceKm: 5,
        priceLevel: "free" as never,
        routeGeometryWkt: "LINESTRING(12.45 41.90, 12.46 41.91)",
        generationOptions: WALKING_ROUTE_GENERATION_OPTIONS,
        stops: [],
      });

      expect(result).toEqual(mockRoute);
      expect(routeEntityRepository.query).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO"),
        expect.any(Array),
      );
    });

    it("saves route stops when provided", async () => {
      routeEntityRepository.query.mockResolvedValue([{ id: "route-1" }]);
      routeEntityRepository.findOneOrFail.mockResolvedValue(mockRoute);

      await service.create({
        cityId: "city-1",
        name: "Highlights",
        theme: RouteTheme.HIGHLIGHTS,
        routeMode: RouteMode.WALKING,
        durationMinutes: 60,
        distanceKm: 5,
        priceLevel: "free" as never,
        routeGeometryWkt: "LINESTRING(12.45 41.90, 12.46 41.91)",
        generationOptions: WALKING_ROUTE_GENERATION_OPTIONS,
        stops: [
          { placeId: "place-1", orderIndex: 0, visitDurationMinutes: 30 },
          { placeId: "place-2", orderIndex: 1, visitDurationMinutes: 20 },
        ],
      });

      expect(routeStopEntityRepository.save).toHaveBeenCalled();
      const savedStops = (routeStopEntityRepository.save as jest.Mock).mock.calls[0][0];
      expect(savedStops).toHaveLength(2);
      expect(savedStops[0].placeId).toEqual("place-1");
      expect(savedStops[0].orderIndex).toEqual(0);
      expect(savedStops[1].placeId).toEqual("place-2");
      expect(savedStops[1].orderIndex).toEqual(1);
    });
  });

  describe("findByCityId", () => {
    it("returns routes for city with stops and place relations", async () => {
      const routes = [mockRoute];
      routeEntityRepository.find.mockResolvedValue(routes);

      const result = await service.findByCityId("city-1");

      expect(result).toEqual(routes);
      expect(routeEntityRepository.find).toHaveBeenCalledWith({
        where: { cityId: "city-1" },
        relations: ["stops", "stops.place"],
        order: { createdAt: "ASC" },
      });
    });
  });

  describe("findRoutesForApi", () => {
    it("returns empty array when no routes", async () => {
      routeEntityRepository.query.mockResolvedValue([]);

      const result = await service.findRoutesForApi("city-1");

      expect(result).toEqual([]);
      expect(routeEntityRepository.query).toHaveBeenCalledTimes(1);
    });

    it("returns routes with stops when data exists", async () => {
      const routeRows = [
        {
          id: "route-1",
          name: "Highlights",
          theme: "highlights",
          route_mode: "WALKING",
          duration_minutes: 60,
          distance_km: 5,
          price_level: "free",
          route_geometry_wkt: "LINESTRING(12.45 41.90, 12.46 41.91)",
        },
      ];
      const stopRows = [
        {
          route_id: "route-1",
          order_index: 0,
          place_id: "place-1",
          place_name: "Museum",
          place_description: "A museum",
          place_media_url: null,
          rating: 4.5,
          review_count: 100,
          price_level: "moderate",
          source: "google",
          category: "museum",
          types: ["museum"],
          coordinates: { lat: 41.9, lng: 12.45 },
        },
      ];
      routeEntityRepository.query.mockResolvedValueOnce(routeRows).mockResolvedValueOnce(stopRows);

      const result = await service.findRoutesForApi("city-1");

      expect(result).toHaveLength(1);
      expect(result[0].id).toEqual("route-1");
      expect(result[0].name).toEqual("Highlights");
      expect(result[0].routeMode).toEqual("WALKING");
      expect(result[0].stops).toHaveLength(1);
      expect(result[0].stops[0].placeName).toEqual("Museum");
      expect(result[0].stops[0].coordinates).toEqual({ lat: 41.9, lng: 12.45 });
    });

    it("filters by routeMode when provided", async () => {
      routeEntityRepository.query.mockResolvedValue([]);

      await service.findRoutesForApi("city-1", RouteMode.WALKING);

      expect(routeEntityRepository.query).toHaveBeenCalledWith(expect.any(String), ["city-1", RouteMode.WALKING]);
    });
  });
});
