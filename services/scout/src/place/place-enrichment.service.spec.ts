import { Test, TestingModule } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";

import { GooglePlacesFetcherService } from "../collector/google/fetcher/fetcher.service";
import { PlaceEnrichmentService } from "./place-enrichment.service";
import { PlaceService } from "./place.service";
import { PlaceCategory, PlaceEntity } from "./place.entity";

const createPlaceEntity = (overrides: Partial<PlaceEntity> = {}): PlaceEntity =>
  ({
    id: "place-1",
    cityId: "city-1",
    name: "Test Place",
    googlePlaceId: "ChIJ123",
    category: PlaceCategory.PARK,
    types: [],
    description: null,
    mediaUrl: null,
    ...overrides,
  }) as PlaceEntity;

describe("PlaceEnrichmentService", () => {
  let service: PlaceEnrichmentService;
  let placeService: PlaceService;
  let placesFetcher: GooglePlacesFetcherService;
  let mediaUrlProvider: { getPlaceMediaUrl: jest.Mock };

  beforeEach(async () => {
    mediaUrlProvider = { getPlaceMediaUrl: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({})],
      providers: [
        PlaceEnrichmentService,
        {
          provide: GooglePlacesFetcherService,
          useValue: {
            getPlaceDetails: jest.fn(),
          },
        },
        {
          provide: "IPlaceMediaUrlProvider",
          useValue: mediaUrlProvider,
        },
        {
          provide: PlaceService,
          useValue: {
            findById: jest.fn(),
            updateEnrichment: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(PlaceEnrichmentService);
    placeService = module.get(PlaceService);
    placesFetcher = module.get(GooglePlacesFetcherService);

    jest.clearAllMocks();
  });

  it("does nothing when placeIds is empty", async () => {
    await service.onPlaceAccepted({ placeIds: [] });

    expect(placeService.findById).not.toHaveBeenCalled();
    expect(placesFetcher.getPlaceDetails).not.toHaveBeenCalled();
  });

  it("skips place when not found", async () => {
    jest.spyOn(placeService, "findById").mockResolvedValue(null);

    await service.onPlaceAccepted({ placeIds: ["missing-id"] });

    expect(placesFetcher.getPlaceDetails).not.toHaveBeenCalled();
    expect(placeService.updateEnrichment).not.toHaveBeenCalled();
  });

  it("skips place when googlePlaceId is null (OSM unresolved)", async () => {
    const place = createPlaceEntity({ googlePlaceId: null });
    jest.spyOn(placeService, "findById").mockResolvedValue(place);

    await service.onPlaceAccepted({ placeIds: ["place-1"] });

    expect(placesFetcher.getPlaceDetails).not.toHaveBeenCalled();
    expect(placeService.updateEnrichment).not.toHaveBeenCalled();
  });

  it("skips place when already enriched (description set)", async () => {
    const place = createPlaceEntity({ description: "Done" });
    jest.spyOn(placeService, "findById").mockResolvedValue(place);

    await service.onPlaceAccepted({ placeIds: ["place-1"] });

    expect(placesFetcher.getPlaceDetails).not.toHaveBeenCalled();
    expect(placeService.updateEnrichment).not.toHaveBeenCalled();
  });

  it("enriches place with description and mediaUrl when photo exists", async () => {
    const place = createPlaceEntity();
    jest.spyOn(placeService, "findById").mockResolvedValue(place);
    jest.spyOn(placesFetcher, "getPlaceDetails").mockResolvedValue({
      description: "A great museum.",
      photoName: "places/ChIJ123/photos/Atxxx",
    });
    mediaUrlProvider.getPlaceMediaUrl.mockResolvedValue("https://example.com/photo.jpg");

    await service.onPlaceAccepted({ placeIds: ["place-1"] });

    expect(placesFetcher.getPlaceDetails).toHaveBeenCalledWith("ChIJ123");
    expect(mediaUrlProvider.getPlaceMediaUrl).toHaveBeenCalledWith("places/ChIJ123/photos/Atxxx");
    expect(placeService.updateEnrichment).toHaveBeenCalledWith("place-1", {
      description: "A great museum.",
      mediaUrl: "https://example.com/photo.jpg",
    });
  });

  it("enriches place without mediaUrl when no photo", async () => {
    const place = createPlaceEntity();
    jest.spyOn(placeService, "findById").mockResolvedValue(place);
    jest.spyOn(placesFetcher, "getPlaceDetails").mockResolvedValue({
      description: "A nice park.",
      photoName: null,
    });

    await service.onPlaceAccepted({ placeIds: ["place-1"] });

    expect(mediaUrlProvider.getPlaceMediaUrl).not.toHaveBeenCalled();
    expect(placeService.updateEnrichment).toHaveBeenCalledWith("place-1", {
      description: "A nice park.",
      mediaUrl: null,
    });
  });

  it("deduplicates place IDs", async () => {
    const place = createPlaceEntity();
    jest.spyOn(placeService, "findById").mockResolvedValue(place);
    jest.spyOn(placesFetcher, "getPlaceDetails").mockResolvedValue({
      description: "Desc",
      photoName: null,
    });

    await service.onPlaceAccepted({ placeIds: ["place-1", "place-1", "place-1"] });

    expect(placeService.findById).toHaveBeenCalledTimes(1);
    expect(placesFetcher.getPlaceDetails).toHaveBeenCalledTimes(1);
  });

  it("continues on failure for one place and enriches others", async () => {
    process.env.ENRICHMENT_MAX_RETRIES = "0";
    process.env.ENRICHMENT_DELAY_BETWEEN_PLACES_MS = "0";
    const moduleWithNoRetries = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ envFilePath: `.env.${process.env.NODE_ENV}` })],
      providers: [
        PlaceEnrichmentService,
        {
          provide: GooglePlacesFetcherService,
          useValue: {
            getPlaceDetails: jest.fn().mockImplementation((placeId: string) => {
              if (placeId === "ChIJ1") return Promise.reject(new Error("API error"));
              return Promise.resolve({ description: "Desc 2", photoName: null });
            }),
          },
        },
        {
          provide: "IPlaceMediaUrlProvider",
          useValue: { getPlaceMediaUrl: jest.fn() },
        },
        {
          provide: PlaceService,
          useValue: {
            findById: jest
              .fn()
              .mockResolvedValueOnce(createPlaceEntity({ id: "place-1", googlePlaceId: "ChIJ1" }))
              .mockResolvedValueOnce(createPlaceEntity({ id: "place-2", googlePlaceId: "ChIJ2" })),
            updateEnrichment: jest.fn(),
          },
        },
      ],
    }).compile();

    const svc = moduleWithNoRetries.get(PlaceEnrichmentService);
    const placeSvc = moduleWithNoRetries.get(PlaceService);

    await svc.onPlaceAccepted({ placeIds: ["place-1", "place-2"] });

    expect(placeSvc.updateEnrichment).toHaveBeenCalledTimes(1);
    expect(placeSvc.updateEnrichment).toHaveBeenCalledWith("place-2", {
      description: "Desc 2",
      mediaUrl: null,
    });
  });
});
