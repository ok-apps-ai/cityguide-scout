import { Test, TestingModule } from "@nestjs/testing";

import { GooglePlacesFetcherService } from "../collector/google/fetcher/fetcher.service";
import { PlaceEntity, PlaceCategory, PlaceSource } from "./place.entity";
import { PlaceOsmResolutionService } from "./place-osm-resolution.service";
import { PlaceService } from "./place.service";

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
  let googlePlacesFetcher: GooglePlacesFetcherService;
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
    googlePlacesFetcher = module.get(GooglePlacesFetcherService);
    placeService = module.get(PlaceService);

    jest.clearAllMocks();
  });

  it("returns Google place unchanged", async () => {
    const place = createGooglePlace();
    const result = await service.resolveOsmPlaceToGoogle(place);

    expect(result).toEqual(place);
    expect(placeService.getPlaceCoordinates).not.toHaveBeenCalled();
    expect(googlePlacesFetcher.findPlaceByTextSearch).not.toHaveBeenCalled();
    expect(googlePlacesFetcher.findPlaceByLocation).not.toHaveBeenCalled();
  });

  it("returns null when coordinates unavailable", async () => {
    const place = createOsmPlace();
    jest.spyOn(placeService, "getPlaceCoordinates").mockResolvedValue(null);

    const result = await service.resolveOsmPlaceToGoogle(place);

    expect(result).toBeNull();
    expect(googlePlacesFetcher.findPlaceByTextSearch).not.toHaveBeenCalled();
    expect(googlePlacesFetcher.findPlaceByLocation).not.toHaveBeenCalled();
  });

  it("returns null when no Google place found (text search and fallback both fail)", async () => {
    const place = createOsmPlace({ name: "Marbella Club Hotel" });
    jest.spyOn(placeService, "getPlaceCoordinates").mockResolvedValue({ lat: 36.516, lng: -4.43 });
    jest.spyOn(googlePlacesFetcher, "findPlaceByTextSearch").mockResolvedValue(null);
    jest.spyOn(googlePlacesFetcher, "findPlaceByLocation").mockResolvedValue(null);

    const result = await service.resolveOsmPlaceToGoogle(place);

    expect(result).toBeNull();
    expect(placeService.updateGooglePlaceId).not.toHaveBeenCalled();
    expect(googlePlacesFetcher.findPlaceByTextSearch).toHaveBeenCalledWith("Marbella Club Hotel", 36.516, -4.43);
    expect(googlePlacesFetcher.findPlaceByLocation).toHaveBeenCalledWith(36.516, -4.43, 50);
  });

  it("uses text search result when found, does not call findPlaceByLocation", async () => {
    const place = createOsmPlace({ name: "Marbella Club Hotel" });
    const updatedPlace = createOsmPlace({
      id: place.id,
      name: "Marbella Club Hotel",
      googlePlaceId: "ChIJMarbellaClub",
    });
    jest.spyOn(placeService, "getPlaceCoordinates").mockResolvedValue({ lat: 36.516, lng: -4.43 });
    jest.spyOn(googlePlacesFetcher, "findPlaceByTextSearch").mockResolvedValue("ChIJMarbellaClub");
    jest.spyOn(placeService, "findByGooglePlaceIdAndCity").mockResolvedValue(null);
    jest.spyOn(placeService, "findById").mockResolvedValue(updatedPlace);

    const result = await service.resolveOsmPlaceToGoogle(place);

    expect(result).toEqual(updatedPlace);
    expect(googlePlacesFetcher.findPlaceByTextSearch).toHaveBeenCalledWith("Marbella Club Hotel", 36.516, -4.43);
    expect(googlePlacesFetcher.findPlaceByLocation).not.toHaveBeenCalled();
    expect(placeService.updateGooglePlaceId).toHaveBeenCalledWith("osm-place-1", "ChIJMarbellaClub");
  });

  it("falls back to findPlaceByLocation when text search returns null", async () => {
    const place = createOsmPlace({ name: "Marbella Club Hotel" });
    const updatedPlace = createOsmPlace({ id: place.id, name: "Marbella Club Hotel", googlePlaceId: "ChIJ789" });
    jest.spyOn(placeService, "getPlaceCoordinates").mockResolvedValue({ lat: 36.516, lng: -4.43 });
    jest.spyOn(googlePlacesFetcher, "findPlaceByTextSearch").mockResolvedValue(null);
    jest.spyOn(googlePlacesFetcher, "findPlaceByLocation").mockResolvedValue("ChIJ789");
    jest.spyOn(placeService, "findByGooglePlaceIdAndCity").mockResolvedValue(null);
    jest.spyOn(placeService, "findById").mockResolvedValue(updatedPlace);

    const result = await service.resolveOsmPlaceToGoogle(place);

    expect(result).toEqual(updatedPlace);
    expect(googlePlacesFetcher.findPlaceByTextSearch).toHaveBeenCalledWith("Marbella Club Hotel", 36.516, -4.43);
    expect(googlePlacesFetcher.findPlaceByLocation).toHaveBeenCalledWith(36.516, -4.43, 50);
    expect(placeService.updateGooglePlaceId).toHaveBeenCalledWith("osm-place-1", "ChIJ789");
  });

  it("returns existing place when Google place already in same city (merge)", async () => {
    const place = createOsmPlace({ name: "Marbella Club Hotel" });
    const existingPlace = createGooglePlace({ id: "existing-1", googlePlaceId: "ChIJ456" });
    jest.spyOn(placeService, "getPlaceCoordinates").mockResolvedValue({ lat: 36.516, lng: -4.43 });
    jest.spyOn(googlePlacesFetcher, "findPlaceByTextSearch").mockResolvedValue("ChIJ456");
    jest.spyOn(placeService, "findByGooglePlaceIdAndCity").mockResolvedValue(existingPlace);

    const result = await service.resolveOsmPlaceToGoogle(place);

    expect(result).toEqual(existingPlace);
    expect(placeService.updateGooglePlaceId).not.toHaveBeenCalled();
  });

  it("updates OSM place with Google place ID when no existing match (via fallback)", async () => {
    const place = createOsmPlace({ name: "Marbella Club Hotel" });
    const updatedPlace = createOsmPlace({ id: place.id, name: "Marbella Club Hotel", googlePlaceId: "ChIJ789" });
    jest.spyOn(placeService, "getPlaceCoordinates").mockResolvedValue({ lat: 36.516, lng: -4.43 });
    jest.spyOn(googlePlacesFetcher, "findPlaceByTextSearch").mockResolvedValue(null);
    jest.spyOn(googlePlacesFetcher, "findPlaceByLocation").mockResolvedValue("ChIJ789");
    jest.spyOn(placeService, "findByGooglePlaceIdAndCity").mockResolvedValue(null);
    jest.spyOn(placeService, "findById").mockResolvedValue(updatedPlace);

    const result = await service.resolveOsmPlaceToGoogle(place);

    expect(placeService.updateGooglePlaceId).toHaveBeenCalledWith("osm-place-1", "ChIJ789");
    expect(result).toEqual(updatedPlace);
  });
});
