import { Test, TestingModule } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";

import { PlaceSource, PlaceCategory, PlaceEntity } from "../place.entity";
import { CityService } from "../../city/city.service";
import { GooglePlacesFetcherService } from "../../collector/google/fetcher/fetcher.service";
import { PlaceEnrichmentService } from "./place-enrichment.service";
import { PlaceDescriptionGeneratorService } from "./place-description-generator.service";
import { PlaceService } from "../place.service";
import { ImageResolutionProcedure } from "./procedures/image-resolution.procedure";
import { DescriptionGenerationProcedure } from "./procedures/description-generation.procedure";

const createPlaceEntity = (overrides: Partial<PlaceEntity> = {}): PlaceEntity =>
  ({
    id: "place-1",
    cityId: "city-1",
    name: "Test Place",
    source: PlaceSource.GOOGLE,
    googlePlaceId: "ChIJ123",
    category: PlaceCategory.PARK,
    types: [],
    description: null,
    photoName: null,
    mediaUrl: null,
    ...overrides,
  }) as PlaceEntity;

describe("PlaceEnrichmentService", () => {
  let service: PlaceEnrichmentService;
  let placeService: PlaceService;
  let googlePlacesFetcherService: GooglePlacesFetcherService;
  let placeDescriptionGeneratorService: PlaceDescriptionGeneratorService;
  let mediaUrlProvider: { getPlaceMediaUrl: jest.Mock };

  beforeEach(async () => {
    mediaUrlProvider = { getPlaceMediaUrl: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({})],
      providers: [
        PlaceEnrichmentService,
        ImageResolutionProcedure,
        DescriptionGenerationProcedure,
        {
          provide: CityService,
          useValue: {
            findOne: jest.fn().mockResolvedValue({ id: "city-1", name: "Marbella, Spain" }),
          },
        },
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
          provide: PlaceDescriptionGeneratorService,
          useValue: {
            generate: jest.fn().mockResolvedValue(null),
          },
        },
        {
          provide: PlaceService,
          useValue: {
            findByIds: jest.fn(),
            updateEnrichment: jest.fn(),
          },
        },
        {
          provide: "ENRICHMENT_PROCEDURES",
          useFactory: (
            imageResolution: ImageResolutionProcedure,
            descriptionGeneration: DescriptionGenerationProcedure,
          ) => [imageResolution, descriptionGeneration],
          inject: [ImageResolutionProcedure, DescriptionGenerationProcedure],
        },
      ],
    }).compile();

    service = module.get(PlaceEnrichmentService);
    placeService = module.get(PlaceService);
    googlePlacesFetcherService = module.get(GooglePlacesFetcherService);
    cityService = module.get(CityService);
    placeDescriptionGeneratorService = module.get(PlaceDescriptionGeneratorService);

    jest.clearAllMocks();
  });

  it("does nothing when placeIds is empty", async () => {
    await service.onPlaceAccepted({ placeIds: [] });

    expect(placeService.findByIds).not.toHaveBeenCalled();
    expect(googlePlacesFetcherService.getPlaceDetails).not.toHaveBeenCalled();
  });

  it("skips when no places found", async () => {
    jest.spyOn(placeService, "findByIds").mockResolvedValue([]);

    await service.onPlaceAccepted({ placeIds: ["missing-id"] });

    expect(googlePlacesFetcherService.getPlaceDetails).not.toHaveBeenCalled();
    expect(placeService.updateEnrichment).not.toHaveBeenCalled();
  });

  it("skips only when both description and mediaUrl are present", async () => {
    const placeEntity = createPlaceEntity({ description: "Done", mediaUrl: "https://example.com/photo.jpg" });
    jest.spyOn(placeService, "findByIds").mockResolvedValue([placeEntity]);

    await service.onPlaceAccepted({ placeIds: ["place-1"] });

    expect(googlePlacesFetcherService.getPlaceDetails).not.toHaveBeenCalled();
    expect(placeService.updateEnrichment).not.toHaveBeenCalled();
  });

  it("enriches Google place with mediaUrl when photo exists", async () => {
    const placeEntity = createPlaceEntity();
    jest.spyOn(placeService, "findByIds").mockResolvedValue([placeEntity]);
    jest.spyOn(googlePlacesFetcherService, "getPlaceDetails").mockResolvedValue({
      description: "A great museum.",
      photoName: "places/ChIJ123/photos/Atxxx",
    });
    mediaUrlProvider.getPlaceMediaUrl.mockResolvedValue("https://example.com/photo.jpg");

    await service.onPlaceAccepted({ placeIds: ["place-1"] });

    expect(googlePlacesFetcherService.getPlaceDetails).toHaveBeenCalledWith("ChIJ123");
    expect(mediaUrlProvider.getPlaceMediaUrl).toHaveBeenCalledWith("places/ChIJ123/photos/Atxxx");
    expect(placeService.updateEnrichment).toHaveBeenCalledWith("place-1", {
      mediaUrl: "https://example.com/photo.jpg",
    });
  });

  it("uses stored photoName when details.photoName is null", async () => {
    const placeEntity = createPlaceEntity({
      photoName: "places/ChIJ123/photos/StoredPhoto",
      description: null,
      mediaUrl: null,
    });
    jest.spyOn(placeService, "findByIds").mockResolvedValue([placeEntity]);
    mediaUrlProvider.getPlaceMediaUrl.mockResolvedValue("https://example.com/resolved.jpg");

    await service.onPlaceAccepted({ placeIds: ["place-1"] });

    expect(mediaUrlProvider.getPlaceMediaUrl).toHaveBeenCalledWith("places/ChIJ123/photos/StoredPhoto");
    expect(placeService.updateEnrichment).toHaveBeenCalledWith("place-1", {
      mediaUrl: "https://example.com/resolved.jpg",
    });
  });

  it("enriches place with description when no photo", async () => {
    const placeEntity = createPlaceEntity();
    jest.spyOn(placeService, "findByIds").mockResolvedValue([placeEntity]);
    jest.spyOn(googlePlacesFetcherService, "getPlaceDetails").mockResolvedValue({
      description: null,
      photoName: null,
    });
    jest.spyOn(placeDescriptionGeneratorService, "generate").mockResolvedValue("A nice park.");

    await service.onPlaceAccepted({ placeIds: ["place-1"] });

    expect(mediaUrlProvider.getPlaceMediaUrl).not.toHaveBeenCalled();
    expect(placeService.updateEnrichment).toHaveBeenCalledWith("place-1", {
      description: "A nice park.",
    });
  });

  it("enriches OSM place with AI-generated description when description is null", async () => {
    const placeEntity = createPlaceEntity({
      source: PlaceSource.OSM,
      googlePlaceId: null,
      osmId: "node/123",
      description: null,
      mediaUrl: null,
    });
    jest.spyOn(placeService, "findByIds").mockResolvedValue([placeEntity]);
    jest
      .spyOn(placeDescriptionGeneratorService, "generate")
      .mockResolvedValue("A historic square in the heart of the city.");

    await service.onPlaceAccepted({ placeIds: ["place-1"] });

    expect(googlePlacesFetcherService.getPlaceDetails).not.toHaveBeenCalled();
    expect(placeDescriptionGeneratorService.generate).toHaveBeenCalledWith("Marbella, Spain", "Test Place");
    expect(placeService.updateEnrichment).toHaveBeenCalledWith("place-1", {
      description: "A historic square in the heart of the city.",
    });
  });

  it("generates description for Google place when no photo", async () => {
    const placeEntity = createPlaceEntity();
    jest.spyOn(placeService, "findByIds").mockResolvedValue([placeEntity]);
    jest.spyOn(googlePlacesFetcherService, "getPlaceDetails").mockResolvedValue({
      description: null,
      photoName: null,
    });
    jest.spyOn(placeDescriptionGeneratorService, "generate").mockResolvedValue("AI-generated description.");

    await service.onPlaceAccepted({ placeIds: ["place-1"] });

    expect(placeDescriptionGeneratorService.generate).toHaveBeenCalledWith("Marbella, Spain", "Test Place");
    expect(placeService.updateEnrichment).toHaveBeenCalledWith("place-1", {
      description: "AI-generated description.",
    });
  });

  it("deduplicates place IDs", async () => {
    const placeEntity = createPlaceEntity();
    jest.spyOn(placeService, "findByIds").mockResolvedValue([placeEntity]);
    jest.spyOn(googlePlacesFetcherService, "getPlaceDetails").mockResolvedValue({
      description: null,
      photoName: null,
    });

    await service.onPlaceAccepted({ placeIds: ["place-1", "place-1", "place-1"] });

    expect(placeService.findByIds).toHaveBeenCalledWith(["place-1"]);
    expect(googlePlacesFetcherService.getPlaceDetails).toHaveBeenCalledTimes(1);
  });

  it("continues on failure for one place and enriches others", async () => {
    process.env.ENRICHMENT_MAX_RETRIES = "0";
    process.env.ENRICHMENT_DELAY_BETWEEN_PLACES_MS = "0";
    const moduleWithNoRetries = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ envFilePath: `.env.${process.env.NODE_ENV}` })],
      providers: [
        PlaceEnrichmentService,
        ImageResolutionProcedure,
        DescriptionGenerationProcedure,
        {
          provide: CityService,
          useValue: { findOne: jest.fn().mockResolvedValue({ id: "city-1", name: "Test City" }) },
        },
        {
          provide: GooglePlacesFetcherService,
          useValue: {
            getPlaceDetails: jest.fn().mockImplementation((placeId: string) => {
              if (placeId === "ChIJ1") return Promise.reject(new Error("API error"));
              return Promise.resolve({ description: null, photoName: null });
            }),
          },
        },
        {
          provide: "IPlaceMediaUrlProvider",
          useValue: { getPlaceMediaUrl: jest.fn() },
        },
        {
          provide: PlaceDescriptionGeneratorService,
          useValue: { generate: jest.fn().mockResolvedValue("Desc 2") },
        },
        {
          provide: PlaceService,
          useValue: {
            findByIds: jest
              .fn()
              .mockResolvedValue([
                createPlaceEntity({ id: "place-1", googlePlaceId: "ChIJ1" }),
                createPlaceEntity({ id: "place-2", googlePlaceId: "ChIJ2" }),
              ]),
            updateEnrichment: jest.fn(),
          },
        },
        {
          provide: "ENRICHMENT_PROCEDURES",
          useFactory: (
            imageResolution: ImageResolutionProcedure,
            descriptionGeneration: DescriptionGenerationProcedure,
          ) => [imageResolution, descriptionGeneration],
          inject: [ImageResolutionProcedure, DescriptionGenerationProcedure],
        },
      ],
    }).compile();

    const svc = moduleWithNoRetries.get(PlaceEnrichmentService);
    const placeSvc = moduleWithNoRetries.get(PlaceService);

    await svc.onPlaceAccepted({ placeIds: ["place-1", "place-2"] });

    expect(placeSvc.updateEnrichment).toHaveBeenCalledTimes(1);
    expect(placeSvc.updateEnrichment).toHaveBeenCalledWith("place-2", {
      description: "Desc 2",
    });
  });
});
