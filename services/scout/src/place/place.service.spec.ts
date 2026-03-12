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
