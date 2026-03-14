import { Test, TestingModule } from "@nestjs/testing";

import type { INearbyPlace } from "@framework/types";

import { GooglePlaceMapperService } from "./place-mapper.service";
import { PlaceCategory, PriceLevel } from "../../../place/place.entity";

const nearbyPlace = (overrides: Partial<INearbyPlace> = {}): INearbyPlace =>
  ({
    place_id: "ChIJ123",
    name: "Test Place",
    geometry: {
      location: { lat: 41.9, lng: 12.45 },
      viewport: {
        southwest: { lat: 41.89, lng: 12.44 },
        northeast: { lat: 41.91, lng: 12.46 },
      },
    },
    types: ["museum"],
    ...overrides,
  }) as INearbyPlace;

describe("GooglePlaceMapperService", () => {
  let service: GooglePlaceMapperService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GooglePlaceMapperService],
    }).compile();

    service = module.get(GooglePlaceMapperService);
  });

  describe("buildGeomExpression", () => {
    it("returns point geometry when no viewport", () => {
      const place = nearbyPlace({
        geometry: { location: { lat: 41.9, lng: 12.45 } },
      });

      const result = service.buildGeomExpression(place, "museum");

      expect(result).toContain("ST_MakePoint");
      expect(result).toContain("12.45");
      expect(result).toContain("41.9");
    });

    it("returns envelope for area types (park) with viewport", () => {
      const place = nearbyPlace({ types: ["park"] });

      const result = service.buildGeomExpression(place, "park");

      expect(result).toContain("ST_MakeEnvelope");
      expect(result).toContain("12.44");
      expect(result).toContain("41.89");
      expect(result).toContain("12.46");
      expect(result).toContain("41.91");
    });

    it("returns line for linear types (hiking_area) with viewport", () => {
      const place = nearbyPlace({ types: ["hiking_area"] });

      const result = service.buildGeomExpression(place, "hiking_area");

      expect(result).toContain("ST_MakeLine");
      expect(result).toContain("ST_MakePoint");
    });

    it("returns point when viewport exists but type is point-like (museum)", () => {
      const place = nearbyPlace({ types: ["museum"] });

      const result = service.buildGeomExpression(place, "museum");

      expect(result).toContain("ST_MakePoint");
      expect(result).not.toContain("ST_MakeEnvelope");
    });
  });

  describe("inferCategoryFromTypes", () => {
    it("returns MUSEUM for museum type", () => {
      const place = nearbyPlace({ types: ["museum"] });

      const result = service.inferCategoryFromTypes(place);

      expect(result).toEqual(PlaceCategory.MUSEUM);
    });

    it("returns PARK for park type", () => {
      const place = nearbyPlace({ types: ["park"] });

      const result = service.inferCategoryFromTypes(place);

      expect(result).toEqual(PlaceCategory.PARK);
    });

    it("returns first matching category when multiple types", () => {
      const place = nearbyPlace({ types: ["restaurant", "museum"] });

      const result = service.inferCategoryFromTypes(place);

      expect(result).toEqual(PlaceCategory.STORE);
    });

    it("returns POINT_OF_INTEREST when no matching type", () => {
      const place = nearbyPlace({ types: ["unknown_type"] });

      const result = service.inferCategoryFromTypes(place);

      expect(result).toEqual(PlaceCategory.POINT_OF_INTEREST);
    });

    it("returns POINT_OF_INTEREST when types array is empty", () => {
      const place = nearbyPlace({ types: [] });

      const result = service.inferCategoryFromTypes(place);

      expect(result).toEqual(PlaceCategory.POINT_OF_INTEREST);
    });
  });

  describe("inferGeometryType", () => {
    it("returns first area/linear type when present", () => {
      const place = nearbyPlace({ types: ["museum", "park"] });

      const result = service.inferGeometryType(place);

      expect(result).toEqual("park");
    });

    it("returns park when park in types", () => {
      const place = nearbyPlace({ types: ["park"] });

      const result = service.inferGeometryType(place);

      expect(result).toEqual("park");
    });

    it("returns hiking_area when in types", () => {
      const place = nearbyPlace({ types: ["hiking_area"] });

      const result = service.inferGeometryType(place);

      expect(result).toEqual("hiking_area");
    });

    it("returns first type when no area/linear type", () => {
      const place = nearbyPlace({ types: ["museum"] });

      const result = service.inferGeometryType(place);

      expect(result).toEqual("museum");
    });

    it("returns empty string when types empty", () => {
      const place = nearbyPlace({ types: [] });

      const result = service.inferGeometryType(place);

      expect(result).toEqual("");
    });
  });

  describe("toPriceLevel", () => {
    it("returns FREE for 0", () => {
      expect(service.toPriceLevel(0)).toEqual(PriceLevel.FREE);
    });

    it("returns INEXPENSIVE for 1", () => {
      expect(service.toPriceLevel(1)).toEqual(PriceLevel.INEXPENSIVE);
    });

    it("returns MODERATE for 2", () => {
      expect(service.toPriceLevel(2)).toEqual(PriceLevel.MODERATE);
    });

    it("returns EXPENSIVE for 3", () => {
      expect(service.toPriceLevel(3)).toEqual(PriceLevel.EXPENSIVE);
    });

    it("returns VERY_EXPENSIVE for 4", () => {
      expect(service.toPriceLevel(4)).toEqual(PriceLevel.VERY_EXPENSIVE);
    });

    it("returns null for undefined", () => {
      expect(service.toPriceLevel(undefined)).toBeNull();
    });

    it("returns null for null", () => {
      expect(service.toPriceLevel(null as unknown as undefined)).toBeNull();
    });

    it("returns null for out-of-range value", () => {
      expect(service.toPriceLevel(99)).toBeNull();
    });
  });

  describe("toVisitDurationMinutes", () => {
    it("returns 75 for MUSEUM", () => {
      expect(service.toVisitDurationMinutes(PlaceCategory.MUSEUM)).toEqual(75);
    });

    it("returns 30 for PARK", () => {
      expect(service.toVisitDurationMinutes(PlaceCategory.PARK)).toEqual(30);
    });

    it("returns 10 for POINT_OF_INTEREST", () => {
      expect(service.toVisitDurationMinutes(PlaceCategory.POINT_OF_INTEREST)).toEqual(10);
    });

    it("returns null for unknown category", () => {
      expect(service.toVisitDurationMinutes("unknown" as PlaceCategory)).toBeNull();
    });
  });
});
