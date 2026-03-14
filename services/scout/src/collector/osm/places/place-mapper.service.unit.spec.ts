import { Test, TestingModule } from "@nestjs/testing";

import { PlaceCategory } from "@framework/types";
import type { IOverpassElement } from "@framework/types";

import { OsmPlaceMapperService } from "./place-mapper.service";

const overpassElement = (overrides: Partial<IOverpassElement> = {}): IOverpassElement =>
  ({
    type: "node",
    id: 1,
    lat: 36.5,
    lon: -4.9,
    tags: { name: "Test Place", tourism: "museum" },
    ...overrides,
  }) as IOverpassElement;

describe("OsmPlaceMapperService", () => {
  let service: OsmPlaceMapperService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OsmPlaceMapperService],
    }).compile();

    service = module.get(OsmPlaceMapperService);
  });

  describe("toPlaceCategory", () => {
    it("returns MUSEUM for tourism:museum", () => {
      const element = overpassElement({ tags: { tourism: "museum" } });

      const result = service.toPlaceCategory(element);

      expect(result).toEqual(PlaceCategory.MUSEUM);
    });

    it("returns PARK for leisure:park", () => {
      const element = overpassElement({ tags: { leisure: "park" } });

      const result = service.toPlaceCategory(element);

      expect(result).toEqual(PlaceCategory.PARK);
    });

    it("returns CHURCH for building:church", () => {
      const element = overpassElement({ tags: { building: "church" } });

      const result = service.toPlaceCategory(element);

      expect(result).toEqual(PlaceCategory.CHURCH);
    });

    it("returns POINT_OF_INTEREST when no matching tag", () => {
      const element = overpassElement({ tags: { amenity: "unknown" } });

      const result = service.toPlaceCategory(element);

      expect(result).toEqual(PlaceCategory.POINT_OF_INTEREST);
    });

    it("returns POINT_OF_INTEREST when tags empty", () => {
      const element = overpassElement({ tags: {} });

      const result = service.toPlaceCategory(element);

      expect(result).toEqual(PlaceCategory.POINT_OF_INTEREST);
    });

    it("returns POINT_OF_INTEREST when tags null", () => {
      const element = overpassElement({ tags: undefined });

      const result = service.toPlaceCategory(element);

      expect(result).toEqual(PlaceCategory.POINT_OF_INTEREST);
    });
  });

  describe("toTypes", () => {
    it("returns key:value pairs for included tag keys (tourism, historic, amenity, etc)", () => {
      const element = overpassElement({ tags: { tourism: "museum", amenity: "cafe" } });

      const result = service.toTypes(element);

      expect(result).toContain("tourism:museum");
      expect(result).toContain("amenity:cafe");
    });

    it("returns empty array when no matching tags", () => {
      const element = overpassElement({ tags: { foo: "bar" } });

      const result = service.toTypes(element);

      expect(result).toEqual([]);
    });

    it("skips empty values", () => {
      const element = overpassElement({ tags: { tourism: "", amenity: "restaurant" } });

      const result = service.toTypes(element);

      expect(result).toContain("amenity:restaurant");
      expect(result).not.toContain("tourism:");
    });
  });

  describe("toVisitDurationMinutes", () => {
    it("returns 75 for MUSEUM", () => {
      expect(service.toVisitDurationMinutes(PlaceCategory.MUSEUM)).toEqual(75);
    });

    it("returns 30 for PARK", () => {
      expect(service.toVisitDurationMinutes(PlaceCategory.PARK)).toEqual(30);
    });

    it("returns null for category not in PLACE_VISIT_DURATION", () => {
      expect(service.toVisitDurationMinutes("unknown" as unknown as PlaceCategory)).toBeNull();
    });
  });

  describe("getLatLng", () => {
    it("returns lat/lon from node", () => {
      const element = overpassElement({ lat: 36.5, lon: -4.9 });

      const result = service.getLatLng(element);

      expect(result).toEqual({ lat: 36.5, lng: -4.9 });
    });

    it("returns center when way (no lat/lon)", () => {
      const element = overpassElement({
        type: "way",
        lat: undefined,
        lon: undefined,
        center: { lat: 36.51, lon: -4.88 },
      });

      const result = service.getLatLng(element);

      expect(result).toEqual({ lat: 36.51, lng: -4.88 });
    });

    it("returns null when no coords", () => {
      const element = overpassElement({
        lat: undefined,
        lon: undefined,
        center: undefined,
      });

      const result = service.getLatLng(element);

      expect(result).toBeNull();
    });
  });

  describe("getName", () => {
    it("returns name from tags", () => {
      const element = overpassElement({ tags: { name: "Vatican Museums" } });

      const result = service.getName(element);

      expect(result).toEqual("Vatican Museums");
    });

    it("returns Unnamed when no name tag", () => {
      const element = overpassElement({ tags: { tourism: "museum" } });

      const result = service.getName(element);

      expect(result).toEqual("Unnamed");
    });

    it("returns Unnamed when tags empty", () => {
      const element = overpassElement({ tags: {} });

      const result = service.getName(element);

      expect(result).toEqual("Unnamed");
    });
  });

  describe("isExcluded", () => {
    it("returns true for amenity:casino", () => {
      const element = overpassElement({ tags: { amenity: "casino" } });

      const result = service.isExcluded(element);

      expect(result).toBe(true);
    });

    it("returns false when no excluded tag", () => {
      const element = overpassElement({ tags: { amenity: "restaurant" } });

      const result = service.isExcluded(element);

      expect(result).toBe(false);
    });

    it("returns false when tags empty", () => {
      const element = overpassElement({ tags: {} });

      const result = service.isExcluded(element);

      expect(result).toBe(false);
    });
  });
});
