import { Test, TestingModule } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";

import { PlaceEntity, PlaceSource, PlaceCategory } from "../../place.entity";
import { GooglePlacesFetcherService } from "../../../collector/google/fetcher/fetcher.service";
import { ImageResolutionProcedure } from "./image-resolution.procedure";

const createPlaceEntity = (overrides: Partial<PlaceEntity> = {}): PlaceEntity =>
  ({
    id: "place-1",
    cityId: "city-1",
    name: "Test Place",
    source: PlaceSource.GOOGLE,
    googlePlaceId: "ChIJ123",
    photoName: null,
    mediaUrl: null,
    category: PlaceCategory.PARK,
    types: [],
    ...overrides,
  }) as PlaceEntity;

const createContext = () =>
  ({ cityEntity: { id: "city-1", name: "Marbella, Spain" } }) as { cityEntity: { id: string; name: string } };

describe("ImageResolutionProcedure", () => {
  let procedure: ImageResolutionProcedure;
  let googlePlacesFetcherService: GooglePlacesFetcherService;
  let mediaUrlProvider: { getPlaceMediaUrl: jest.Mock };

  beforeEach(async () => {
    mediaUrlProvider = { getPlaceMediaUrl: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({})],
      providers: [
        ImageResolutionProcedure,
        {
          provide: GooglePlacesFetcherService,
          useValue: { getPlaceDetails: jest.fn() },
        },
        {
          provide: "IPlaceMediaUrlProvider",
          useValue: mediaUrlProvider,
        },
      ],
    }).compile();

    procedure = module.get(ImageResolutionProcedure);
    googlePlacesFetcherService = module.get(GooglePlacesFetcherService);

    jest.clearAllMocks();
  });

  describe("shouldRun", () => {
    it("returns false when mediaUrl is already set", () => {
      const place = createPlaceEntity({ mediaUrl: "https://example.com/photo.jpg" });
      expect(procedure.shouldRun(place)).toBe(false);
    });

    it("returns false when source is OSM", () => {
      const place = createPlaceEntity({ source: PlaceSource.OSM, mediaUrl: null, photoName: "places/123/photos/abc" });
      expect(procedure.shouldRun(place)).toBe(false);
    });

    it("returns false when source is Google but no photoName and no googlePlaceId", () => {
      const place = createPlaceEntity({ photoName: null, googlePlaceId: null });
      expect(procedure.shouldRun(place)).toBe(false);
    });

    it("returns true when mediaUrl is null, source is Google, and photoName present", () => {
      const place = createPlaceEntity({ photoName: "places/ChIJ123/photos/Atxxx" });
      expect(procedure.shouldRun(place)).toBe(true);
    });

    it("returns true when mediaUrl is null, source is Google, and googlePlaceId present (no photoName)", () => {
      const place = createPlaceEntity({ photoName: null, googlePlaceId: "ChIJ123" });
      expect(procedure.shouldRun(place)).toBe(true);
    });
  });

  describe("run", () => {
    it("resolves photoName to mediaUrl when present", async () => {
      const place = createPlaceEntity({ photoName: "places/ChIJ123/photos/Atxxx" });
      mediaUrlProvider.getPlaceMediaUrl.mockResolvedValue("https://example.com/photo.jpg");

      const result = await procedure.run(place, createContext());

      expect(mediaUrlProvider.getPlaceMediaUrl).toHaveBeenCalledWith("places/ChIJ123/photos/Atxxx");
      expect(googlePlacesFetcherService.getPlaceDetails).not.toHaveBeenCalled();
      expect(result).toEqual({ mediaUrl: "https://example.com/photo.jpg" });
    });

    it("fetches getPlaceDetails when photoName is null but googlePlaceId present", async () => {
      const place = createPlaceEntity({ photoName: null, googlePlaceId: "ChIJ123" });
      jest.spyOn(googlePlacesFetcherService, "getPlaceDetails").mockResolvedValue({
        description: null,
        photoName: "places/ChIJ123/photos/FromApi",
      });
      mediaUrlProvider.getPlaceMediaUrl.mockResolvedValue("https://example.com/resolved.jpg");

      const result = await procedure.run(place, createContext());

      expect(googlePlacesFetcherService.getPlaceDetails).toHaveBeenCalledWith("ChIJ123");
      expect(mediaUrlProvider.getPlaceMediaUrl).toHaveBeenCalledWith("places/ChIJ123/photos/FromApi");
      expect(result).toEqual({ mediaUrl: "https://example.com/resolved.jpg" });
    });

    it("returns empty when photoName is null after getPlaceDetails returns no photo", async () => {
      const place = createPlaceEntity({ photoName: null, googlePlaceId: "ChIJ123" });
      jest.spyOn(googlePlacesFetcherService, "getPlaceDetails").mockResolvedValue({
        description: null,
        photoName: null,
      });

      const result = await procedure.run(place, createContext());

      expect(googlePlacesFetcherService.getPlaceDetails).toHaveBeenCalledWith("ChIJ123");
      expect(mediaUrlProvider.getPlaceMediaUrl).not.toHaveBeenCalled();
      expect(result).toEqual({});
    });

    it("returns empty when mediaUrlProvider returns null", async () => {
      const place = createPlaceEntity({ photoName: "places/ChIJ123/photos/Atxxx" });
      mediaUrlProvider.getPlaceMediaUrl.mockResolvedValue(null);

      const result = await procedure.run(place, createContext());

      expect(mediaUrlProvider.getPlaceMediaUrl).toHaveBeenCalledWith("places/ChIJ123/photos/Atxxx");
      expect(result).toEqual({});
    });

    it("uses stored photoName when getPlaceDetails returns null for photoName", async () => {
      const place = createPlaceEntity({
        photoName: "places/ChIJ123/photos/StoredPhoto",
        googlePlaceId: "ChIJ123",
      });
      jest.spyOn(googlePlacesFetcherService, "getPlaceDetails").mockResolvedValue({
        description: "From API",
        photoName: null,
      });
      mediaUrlProvider.getPlaceMediaUrl.mockResolvedValue("https://example.com/from-stored.jpg");

      const result = await procedure.run(place, createContext());

      expect(googlePlacesFetcherService.getPlaceDetails).not.toHaveBeenCalled();
      expect(mediaUrlProvider.getPlaceMediaUrl).toHaveBeenCalledWith("places/ChIJ123/photos/StoredPhoto");
      expect(result).toEqual({ mediaUrl: "https://example.com/from-stored.jpg" });
    });
  });
});
