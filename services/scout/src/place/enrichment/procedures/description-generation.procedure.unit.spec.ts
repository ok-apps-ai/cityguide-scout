import { Test, TestingModule } from "@nestjs/testing";

import { PlaceEntity, PlaceSource, PlaceCategory } from "../../place.entity";
import { PlaceDescriptionGeneratorService } from "../place-description-generator.service";
import { DescriptionGenerationProcedure } from "./description-generation.procedure";

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
    ...overrides,
  }) as PlaceEntity;

const createContext = () =>
  ({ cityEntity: { id: "city-1", name: "Marbella, Spain" } }) as { cityEntity: { id: string; name: string } };

describe("DescriptionGenerationProcedure", () => {
  let procedure: DescriptionGenerationProcedure;
  let placeDescriptionGeneratorService: PlaceDescriptionGeneratorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DescriptionGenerationProcedure,
        {
          provide: PlaceDescriptionGeneratorService,
          useValue: { generate: jest.fn() },
        },
      ],
    }).compile();

    procedure = module.get(DescriptionGenerationProcedure);
    placeDescriptionGeneratorService = module.get(PlaceDescriptionGeneratorService);

    jest.clearAllMocks();
  });

  describe("shouldRun", () => {
    it("returns false when description is already set", () => {
      const place = createPlaceEntity({ description: "A great museum." });
      expect(procedure.shouldRun(place)).toBe(false);
    });

    it("returns true when description is null", () => {
      const place = createPlaceEntity({ description: null });
      expect(procedure.shouldRun(place)).toBe(true);
    });

    it("returns true for OSM place with null description", () => {
      const place = createPlaceEntity({ source: PlaceSource.OSM, description: null });
      expect(procedure.shouldRun(place)).toBe(true);
    });
  });

  describe("run", () => {
    it("returns { description } when generator returns value", async () => {
      const place = createPlaceEntity({ name: "Puerto Banús Marina" });
      jest
        .spyOn(placeDescriptionGeneratorService, "generate")
        .mockResolvedValue("A vibrant marina with luxury yachts.");

      const result = await procedure.run(place, createContext());

      expect(placeDescriptionGeneratorService.generate).toHaveBeenCalledWith("Marbella, Spain", "Puerto Banús Marina");
      expect(result).toEqual({ description: "A vibrant marina with luxury yachts." });
    });

    it("returns empty when generator returns null", async () => {
      const place = createPlaceEntity({ name: "Test Place" });
      jest.spyOn(placeDescriptionGeneratorService, "generate").mockResolvedValue(null);

      const result = await procedure.run(place, createContext());

      expect(placeDescriptionGeneratorService.generate).toHaveBeenCalledWith("Marbella, Spain", "Test Place");
      expect(result).toEqual({});
    });

    it("passes city name and place name to generator", async () => {
      const place = createPlaceEntity({ name: "Colosseum" });
      const context = { cityEntity: { id: "city-2", name: "Rome, Italy" } } as {
        cityEntity: { id: string; name: string };
      };
      jest.spyOn(placeDescriptionGeneratorService, "generate").mockResolvedValue("An iconic amphitheatre.");

      await procedure.run(place, context);

      expect(placeDescriptionGeneratorService.generate).toHaveBeenCalledWith("Rome, Italy", "Colosseum");
    });
  });
});
