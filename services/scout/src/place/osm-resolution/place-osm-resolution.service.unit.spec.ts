import { Test, TestingModule } from "@nestjs/testing";

import { GooglePlacesFetcherService } from "../../collector/google/fetcher/fetcher.service";
import { PlaceEntity, PlaceCategory, PlaceSource } from "../place.entity";
import { PlaceOsmResolutionService } from "./place-osm-resolution.service";
import { PlaceService } from "../place.service";

const createOsmPlace = (overrides: Partial<PlaceEntity> = {}): PlaceEntity =>
  ({
    id: "osm-place-1",
    cityId: "city-1",
    name: "OSM Park",
    googlePlaceId: null,
    source: PlaceSource.OSM,
    osmId: "node:123",
    category: PlaceCategory.PARK,
    types: [],
    ...overrides,
  }) as PlaceEntity;

const createGooglePlace = (overrides: Partial<PlaceEntity> = {}): PlaceEntity =>
  ({
    id: "google-place-1",
    cityId: "city-1",
    name: "Google Park",
    googlePlaceId: "ChIJ123",
    source: PlaceSource.GOOGLE,
    osmId: null,
    category: PlaceCategory.PARK,
    types: [],
    ...overrides,
  }) as PlaceEntity;

describe("PlaceOsmResolutionService", () => {
  let service: PlaceOsmResolutionService;
  let googlePlacesFetcherService: GooglePlacesFetcherService;
  let placeService: PlaceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlaceOsmResolutionService,
        {
          provide: GooglePlacesFetcherService,
          useValue: {
            findPlaceByTextSearch: jest.fn(),
            findPlaceByLocation: jest.fn(),
          },
        },
        {
          provide: PlaceService,
          useValue: {
            getPlaceCoordinates: jest.fn(),
            findByGooglePlaceIdAndCity: jest.fn(),
            updateGooglePlaceId: jest.fn(),
            findById: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(PlaceOsmResolutionService);
    googlePlacesFetcherService = module.get(GooglePlacesFetcherService);
    placeService = module.get(PlaceService);

    jest.clearAllMocks();
  });

  it("returns Google place unchanged", async () => {
    const placeEntity = createGooglePlace();
    const result = await service.resolveOsmPlaceToGoogle(placeEntity);

    expect(result).toEqual(placeEntity);
    expect(placeService.getPlaceCoordinates).not.toHaveBeenCalled();
    expect(googlePlacesFetcherService.findPlaceByTextSearch).not.toHaveBeenCalled();
    expect(googlePlacesFetcherService.findPlaceByLocation).not.toHaveBeenCalled();
  });

  it("returns null when coordinates unavailable", async () => {
    const placeEntity = createOsmPlace();
    jest.spyOn(placeService, "getPlaceCoordinates").mockResolvedValue(null);

    const result = await service.resolveOsmPlaceToGoogle(placeEntity);

    expect(result).toBeNull();
    expect(googlePlacesFetcherService.findPlaceByTextSearch).not.toHaveBeenCalled();
    expect(googlePlacesFetcherService.findPlaceByLocation).not.toHaveBeenCalled();
  });

  it("returns null when no Google place found (text search and fallback both fail)", async () => {
    const placeEntity = createOsmPlace({ name: "Marbella Club Hotel" });
    jest.spyOn(placeService, "getPlaceCoordinates").mockResolvedValue({ lat: 36.516, lng: -4.43 });
    jest.spyOn(googlePlacesFetcherService, "findPlaceByTextSearch").mockResolvedValue(null);
    jest.spyOn(googlePlacesFetcherService, "findPlaceByLocation").mockResolvedValue(null);

    const result = await service.resolveOsmPlaceToGoogle(placeEntity);

    expect(result).toBeNull();
    expect(placeService.updateGooglePlaceId).not.toHaveBeenCalled();
    expect(googlePlacesFetcherService.findPlaceByTextSearch).toHaveBeenCalledWith("Marbella Club Hotel", 36.516, -4.43);
    expect(googlePlacesFetcherService.findPlaceByLocation).toHaveBeenCalledWith(36.516, -4.43, 50);
  });

  it("uses text search result when found, does not call findPlaceByLocation", async () => {
    const placeEntity = createOsmPlace({ name: "Marbella Club Hotel" });
    const updatedPlaceEntity = createOsmPlace({
      id: placeEntity.id,
      name: "Marbella Club Hotel",
      googlePlaceId: "ChIJMarbellaClub",
    });
    jest.spyOn(placeService, "getPlaceCoordinates").mockResolvedValue({ lat: 36.516, lng: -4.43 });
    jest.spyOn(googlePlacesFetcherService, "findPlaceByTextSearch").mockResolvedValue("ChIJMarbellaClub");
    jest.spyOn(placeService, "findByGooglePlaceIdAndCity").mockResolvedValue(null);
    jest.spyOn(placeService, "findById").mockResolvedValue(updatedPlaceEntity);

    const result = await service.resolveOsmPlaceToGoogle(placeEntity);

    expect(result).toEqual(updatedPlaceEntity);
    expect(googlePlacesFetcherService.findPlaceByTextSearch).toHaveBeenCalledWith("Marbella Club Hotel", 36.516, -4.43);
    expect(googlePlacesFetcherService.findPlaceByLocation).not.toHaveBeenCalled();
    expect(placeService.updateGooglePlaceId).toHaveBeenCalledWith("osm-place-1", "ChIJMarbellaClub");
  });

  it("falls back to findPlaceByLocation when text search returns null", async () => {
    const placeEntity = createOsmPlace({ name: "Marbella Club Hotel" });
    const updatedPlaceEntity = createOsmPlace({
      id: placeEntity.id,
      name: "Marbella Club Hotel",
      googlePlaceId: "ChIJ789",
    });
    jest.spyOn(placeService, "getPlaceCoordinates").mockResolvedValue({ lat: 36.516, lng: -4.43 });
    jest.spyOn(googlePlacesFetcherService, "findPlaceByTextSearch").mockResolvedValue(null);
    jest.spyOn(googlePlacesFetcherService, "findPlaceByLocation").mockResolvedValue("ChIJ789");
    jest.spyOn(placeService, "findByGooglePlaceIdAndCity").mockResolvedValue(null);
    jest.spyOn(placeService, "findById").mockResolvedValue(updatedPlaceEntity);

    const result = await service.resolveOsmPlaceToGoogle(placeEntity);

    expect(result).toEqual(updatedPlaceEntity);
    expect(googlePlacesFetcherService.findPlaceByTextSearch).toHaveBeenCalledWith("Marbella Club Hotel", 36.516, -4.43);
    expect(googlePlacesFetcherService.findPlaceByLocation).toHaveBeenCalledWith(36.516, -4.43, 50);
    expect(placeService.updateGooglePlaceId).toHaveBeenCalledWith("osm-place-1", "ChIJ789");
  });

  it("returns existing place when Google place already in same city (merge)", async () => {
    const placeEntity = createOsmPlace({ name: "Marbella Club Hotel" });
    const existingPlaceEntity = createGooglePlace({ id: "existing-1", googlePlaceId: "ChIJ456" });
    jest.spyOn(placeService, "getPlaceCoordinates").mockResolvedValue({ lat: 36.516, lng: -4.43 });
    jest.spyOn(googlePlacesFetcherService, "findPlaceByTextSearch").mockResolvedValue("ChIJ456");
    jest.spyOn(placeService, "findByGooglePlaceIdAndCity").mockResolvedValue(existingPlaceEntity);

    const result = await service.resolveOsmPlaceToGoogle(placeEntity);

    expect(result).toEqual(existingPlaceEntity);
    expect(placeService.updateGooglePlaceId).not.toHaveBeenCalled();
  });

  it("updates OSM place with Google place ID when no existing match (via fallback)", async () => {
    const placeEntity = createOsmPlace({ name: "Marbella Club Hotel" });
    const updatedPlaceEntity = createOsmPlace({
      id: placeEntity.id,
      name: "Marbella Club Hotel",
      googlePlaceId: "ChIJ789",
    });
    jest.spyOn(placeService, "getPlaceCoordinates").mockResolvedValue({ lat: 36.516, lng: -4.43 });
    jest.spyOn(googlePlacesFetcherService, "findPlaceByTextSearch").mockResolvedValue(null);
    jest.spyOn(googlePlacesFetcherService, "findPlaceByLocation").mockResolvedValue("ChIJ789");
    jest.spyOn(placeService, "findByGooglePlaceIdAndCity").mockResolvedValue(null);
    jest.spyOn(placeService, "findById").mockResolvedValue(updatedPlaceEntity);

    const result = await service.resolveOsmPlaceToGoogle(placeEntity);

    expect(placeService.updateGooglePlaceId).toHaveBeenCalledWith("osm-place-1", "ChIJ789");
    expect(result).toEqual(updatedPlaceEntity);
  });
});
