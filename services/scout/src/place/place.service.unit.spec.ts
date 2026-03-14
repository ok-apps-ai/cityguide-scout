import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";

import { PlaceEntity } from "./place.entity";
import { PlaceService } from "./place.service";

describe("PlaceService", () => {
  let service: PlaceService;

  const mockRepository = {
    findOne: jest.fn(),
    findOneOrFail: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(),
    manager: { query: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlaceService,
        {
          provide: getRepositoryToken(PlaceEntity),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get(PlaceService);

    jest.clearAllMocks();
  });

  describe("findById", () => {
    it("returns place when found", async () => {
      const place = {
        id: "place-1",
        name: "Test Place",
        googlePlaceId: "ChIJ123",
      } as PlaceEntity;
      mockRepository.findOne.mockResolvedValue(place);

      const result = await service.findById("place-1");

      expect(result).toEqual(place);
      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: "place-1" } });
    });

    it("returns null when not found", async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.findById("missing-id");

      expect(result).toBeNull();
    });
  });

  describe("insertPlace", () => {
    it("inserts place and returns it for Google source", async () => {
      const insertedPlace = { id: "place-1", googlePlaceId: "ChIJ123", cityId: "city-1" } as PlaceEntity;
      mockRepository.createQueryBuilder.mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        into: jest.fn().mockReturnThis(),
        values: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue(undefined),
      });
      mockRepository.findOne.mockResolvedValue(insertedPlace);

      const result = await service.insertPlace({
        cityId: "city-1",
        lat: 41.9,
        lng: 12.45,
        name: "Test",
        source: "google" as never,
        googlePlaceId: "ChIJ123",
        category: "museum" as never,
        types: [],
      });

      expect(result).toEqual(insertedPlace);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { googlePlaceId: "ChIJ123", cityId: "city-1" },
      });
    });

    it("returns existing place on duplicate (23505) for Google", async () => {
      const existingPlace = { id: "place-1", googlePlaceId: "ChIJ123", cityId: "city-1" } as PlaceEntity;
      mockRepository.createQueryBuilder.mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        into: jest.fn().mockReturnThis(),
        values: jest.fn().mockReturnThis(),
        execute: jest.fn().mockRejectedValue({ code: "23505" }),
      });
      mockRepository.findOne.mockResolvedValue(existingPlace);

      const result = await service.insertPlace({
        cityId: "city-1",
        lat: 41.9,
        lng: 12.45,
        name: "Test",
        source: "google" as never,
        googlePlaceId: "ChIJ123",
        category: "museum" as never,
        types: [],
      });

      expect(result).toEqual(existingPlace);
    });

    it("rethrows non-duplicate errors", async () => {
      mockRepository.createQueryBuilder.mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        into: jest.fn().mockReturnThis(),
        values: jest.fn().mockReturnThis(),
        execute: jest.fn().mockRejectedValue(new Error("DB error")),
      });

      await expect(
        service.insertPlace({
          cityId: "city-1",
          lat: 41.9,
          lng: 12.45,
          name: "Test",
          source: "google" as never,
          googlePlaceId: "ChIJ123",
          category: "museum" as never,
          types: [],
        }),
      ).rejects.toThrow("DB error");
    });
  });

  describe("updateGooglePlaceId", () => {
    it("updates place with googlePlaceId", async () => {
      mockRepository.update.mockResolvedValue({ affected: 1 });

      await service.updateGooglePlaceId("place-1", "ChIJ123");

      expect(mockRepository.update).toHaveBeenCalledWith(
        { id: "place-1" },
        expect.objectContaining({
          googlePlaceId: "ChIJ123",
          updatedAt: expect.any(Date),
        }),
      );
    });
  });

  describe("updateDescription", () => {
    it("updates place description", async () => {
      mockRepository.update.mockResolvedValue({ affected: 1 });

      await service.updateDescription("ChIJ123", "A great museum.");

      expect(mockRepository.update).toHaveBeenCalledWith(
        { googlePlaceId: "ChIJ123" },
        expect.objectContaining({
          description: "A great museum.",
          updatedAt: expect.any(Date),
        }),
      );
    });
  });

  describe("getPlaceCoordinates", () => {
    it("returns lat/lng when place exists", async () => {
      mockRepository.manager.query.mockResolvedValue([{ lat: "41.9", lng: "12.45" }]);

      const result = await service.getPlaceCoordinates("place-1");

      expect(result).toEqual({ lat: 41.9, lng: 12.45 });
    });

    it("returns null when no rows", async () => {
      mockRepository.manager.query.mockResolvedValue([]);

      const result = await service.getPlaceCoordinates("place-1");

      expect(result).toBeNull();
    });
  });

  describe("findByGooglePlaceIdAndCity", () => {
    it("returns place when found", async () => {
      const place = { id: "place-1", googlePlaceId: "ChIJ123", cityId: "city-1" } as PlaceEntity;
      mockRepository.findOne.mockResolvedValue(place);

      const result = await service.findByGooglePlaceIdAndCity("ChIJ123", "city-1");

      expect(result).toEqual(place);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { googlePlaceId: "ChIJ123", cityId: "city-1" },
      });
    });

    it("returns null when not found", async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.findByGooglePlaceIdAndCity("ChIJ123", "city-1");

      expect(result).toBeNull();
    });
  });

  describe("findByCityId", () => {
    it("returns places for city", async () => {
      const places = [{ id: "place-1" }, { id: "place-2" }] as PlaceEntity[];
      mockRepository.find.mockResolvedValue(places);

      const result = await service.findByCityId("city-1");

      expect(result).toEqual(places);
      expect(mockRepository.find).toHaveBeenCalledWith({ where: { cityId: "city-1" } });
    });
  });

  describe("updateEnrichment", () => {
    it("updates description and mediaUrl", async () => {
      mockRepository.update.mockResolvedValue({ affected: 1 });

      await service.updateEnrichment("place-1", {
        description: "A great museum.",
        mediaUrl: "https://example.com/photo.jpg",
      });

      expect(mockRepository.update).toHaveBeenCalledWith(
        { id: "place-1" },
        expect.objectContaining({
          description: "A great museum.",
          mediaUrl: "https://example.com/photo.jpg",
          updatedAt: expect.any(Date),
        }),
      );
    });

    it("updates only mediaUrl when provided", async () => {
      mockRepository.update.mockResolvedValue({ affected: 1 });

      await service.updateEnrichment("place-1", { mediaUrl: "https://example.com/img.jpg" });

      expect(mockRepository.update).toHaveBeenCalledWith(
        { id: "place-1" },
        expect.objectContaining({
          mediaUrl: "https://example.com/img.jpg",
          updatedAt: expect.any(Date),
        }),
      );
    });

    it("does not call update when no enrichment fields provided", async () => {
      await service.updateEnrichment("place-1", {});

      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it("updates with null values for mediaUrl", async () => {
      mockRepository.update.mockResolvedValue({ affected: 1 });

      await service.updateEnrichment("place-1", {
        description: "Desc",
        mediaUrl: null,
      });

      expect(mockRepository.update).toHaveBeenCalledWith(
        { id: "place-1" },
        expect.objectContaining({
          description: "Desc",
          mediaUrl: null,
          updatedAt: expect.any(Date),
        }),
      );
    });
  });
});
