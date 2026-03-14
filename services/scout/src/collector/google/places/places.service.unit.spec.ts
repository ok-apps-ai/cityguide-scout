import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { getDataSourceToken } from "@nestjs/typeorm";

import type { INearbyPlace } from "@framework/types";

import { PlaceService } from "../../../place/place.service";
import { GooglePlacesFetcherService } from "../fetcher/fetcher.service";
import { GooglePlaceMapperService } from "./place-mapper.service";
import { GooglePlacesService } from "./places.service";

const nearbyPlace = (overrides: Partial<INearbyPlace> = {}): INearbyPlace =>
  ({
    place_id: "ChIJ123",
    name: "Museum A",
    geometry: { location: { lat: 41.9, lng: 12.45 } },
    types: ["museum"],
    ...overrides,
  }) as INearbyPlace;

describe("GooglePlacesService", () => {
  let service: GooglePlacesService;
  let placeService: PlaceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GooglePlacesService,
        {
          provide: ConfigService,
          useValue: { get: jest.fn((key: string) => (key === "GRID_STEP_DEGREES" ? 0.02 : undefined)) },
        },
        {
          provide: PlaceService,
          useValue: {
            insertPlace: jest.fn().mockResolvedValue({ id: "place-1" }),
          },
        },
        {
          provide: GooglePlacesFetcherService,
          useValue: { fetchNearbyPlaces: jest.fn() },
        },
        {
          provide: GooglePlaceMapperService,
          useValue: {
            inferCategoryFromTypes: jest.fn().mockReturnValue("museum"),
            inferGeometryType: jest.fn().mockReturnValue("museum"),
            buildGeomExpression: jest.fn().mockReturnValue("ST_MakePoint(12.45, 41.9)"),
            toPriceLevel: jest.fn().mockReturnValue(null),
            toVisitDurationMinutes: jest.fn().mockReturnValue(75),
          },
        },
        {
          provide: getDataSourceToken("default"),
          useValue: {
            query: jest.fn().mockResolvedValue([
              {
                min_lat: 41.89,
                min_lng: 12.44,
                max_lat: 41.91,
                max_lng: 12.46,
              },
            ]),
          },
        },
      ],
    }).compile();

    service = module.get(GooglePlacesService);
    placeService = module.get(PlaceService);
  });

  it("passes description and photoName to insertPlace when present", async () => {
    const placeWithDetails = nearbyPlace({
      description: "A leading contemporary art museum.",
      photoName: "places/ChIJ123/photos/Atxxx",
    });

    await service.savePointsToDb("city-1", [placeWithDetails]);

    expect(placeService.insertPlace).toHaveBeenCalledWith(
      expect.objectContaining({
        description: "A leading contemporary art museum.",
        photoName: "places/ChIJ123/photos/Atxxx",
      }),
    );
  });

  it("passes null for description and photoName when absent", async () => {
    const placeWithoutDetails = nearbyPlace();

    await service.savePointsToDb("city-1", [placeWithoutDetails]);

    expect(placeService.insertPlace).toHaveBeenCalledWith(
      expect.objectContaining({
        description: null,
        photoName: null,
      }),
    );
  });
});
