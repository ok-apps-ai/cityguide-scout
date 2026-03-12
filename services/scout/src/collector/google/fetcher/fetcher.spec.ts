import { Test, TestingModule } from "@nestjs/testing";
import { HttpModule, HttpService } from "@nestjs/axios";
import { ConfigModule } from "@nestjs/config";
import { of, throwError } from "rxjs";

import { GooglePlacesFetcherService } from "./fetcher.service";

const newApiPlace = (placeId: string, name: string, types: string[]) => ({
  id: `places/${placeId}`,
  displayName: { text: name },
  location: { latitude: 40.0, longitude: -74.0 },
  viewport: {
    high: { latitude: 40.01, longitude: -73.99 },
    low: { latitude: 39.99, longitude: -74.01 },
  },
  types,
});

describe("GooglePlacesFetcherService", () => {
  let service: GooglePlacesFetcherService;
  let httpService: HttpService;

  const baseOptions = {
    location: { lat: 40.7128, lng: -74.006 },
    includedTypes: ["museum", "park"],
    apiKey: "test-key",
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, load: [() => ({ GOOGLE_API_KEY: "test-key" })] }), HttpModule],
      providers: [GooglePlacesFetcherService],
    }).compile();

    service = module.get(GooglePlacesFetcherService);
    httpService = module.get(HttpService);
  });

  it("returns empty list when no results", async () => {
    jest.spyOn(httpService, "post").mockReturnValue(
      of({
        data: { places: [] },
        status: 200,
        statusText: "OK",
        headers: {},
        config: {} as never,
      }),
    );

    const result = await service.fetchNearbyPlaces({ ...baseOptions });

    expect(result).toEqual([]);
    expect(httpService.post).toHaveBeenCalledTimes(1); // museum, park = 2 types = 1 request
  });

  it("returns all places from single request", async () => {
    const museum1 = newApiPlace("p1", "Museum A", ["museum"]);
    const park1 = newApiPlace("p2", "Park B", ["park"]);

    jest.spyOn(httpService, "post").mockReturnValue(
      of({
        data: { places: [museum1, park1] },
        status: 200,
        statusText: "OK",
        headers: {},
        config: {} as never,
      }),
    );

    const result = await service.fetchNearbyPlaces({ ...baseOptions });

    expect(result).toHaveLength(2);
    expect(result.map(p => p.place_id)).toEqual(["p1", "p2"]);
    expect(result[0].name).toEqual("Museum A");
    expect(result[1].name).toEqual("Park B");
    expect(httpService.post).toHaveBeenCalledTimes(1);
  });

  it("deduplicates places that appear in multiple batches", async () => {
    const shared = newApiPlace("p-shared", "Shared Place", ["museum", "tourist_attraction"]);
    const batch1Only = newApiPlace("p1", "Batch 1 Only", ["type_0"]);
    const batch2Only = newApiPlace("p2", "Batch 2 Only", ["type_50"]);
    const types75 = Array.from({ length: 75 }, (_, i) => `type_${i}`);

    jest
      .spyOn(httpService, "post")
      .mockReturnValueOnce(
        of({
          data: { places: [shared, batch1Only] },
          status: 200,
          statusText: "OK",
          headers: {},
          config: {} as never,
        }),
      )
      .mockReturnValueOnce(
        of({
          data: { places: [shared, batch2Only] },
          status: 200,
          statusText: "OK",
          headers: {},
          config: {} as never,
        }),
      );

    const result = await service.fetchNearbyPlaces({
      ...baseOptions,
      includedTypes: types75,
    });

    expect(result).toHaveLength(3); // shared counted once
    expect(result.map(p => p.place_id).sort()).toEqual(["p-shared", "p1", "p2"]);
  });

  it("uses custom radius", async () => {
    jest.spyOn(httpService, "post").mockReturnValue(
      of({
        data: { places: [] },
        status: 200,
        statusText: "OK",
        headers: {},
        config: {} as never,
      }),
    );

    await service.fetchNearbyPlaces({
      ...baseOptions,
      includedTypes: ["restaurant"],
      radiusMeters: 500,
    });

    expect(httpService.post).toHaveBeenCalledWith(
      "https://places.googleapis.com/v1/places:searchNearby",
      expect.objectContaining({
        locationRestriction: expect.objectContaining({
          circle: expect.objectContaining({ radius: 500 }),
        }),
      }),
      expect.any(Object),
    );
  });

  it("sends excludedTypes in request when provided", async () => {
    const postSpy = jest.spyOn(httpService, "post").mockReturnValue(
      of({
        data: { places: [] },
        status: 200,
        statusText: "OK",
        headers: {},
        config: {} as never,
      }),
    );

    await service.fetchNearbyPlaces({
      ...baseOptions,
      excludedTypes: ["hotel", "restaurant"],
    });

    const body = postSpy.mock.calls[0][1] as Record<string, unknown>;
    expect(body.excludedTypes).toEqual(["hotel", "restaurant"]);
  });

  it("throws on API error", async () => {
    jest.spyOn(httpService, "post").mockReturnValue(
      throwError(() => Object.assign(new Error("API key invalid"), { response: { status: 400 } })),
    );

    await expect(
      service.fetchNearbyPlaces({
        ...baseOptions,
        includedTypes: ["museum"],
      }),
    ).rejects.toThrow("API key invalid");
  });

  it("retries on 429 and succeeds", async () => {
    const museum = newApiPlace("p1", "Museum A", ["museum"]);
    jest
      .spyOn(httpService, "post")
      .mockReturnValueOnce(
        throwError(() => Object.assign(new Error("Rate limited"), { response: { status: 429 } })),
      )
      .mockReturnValueOnce(
        of({
          data: { places: [museum] },
          status: 200,
          statusText: "OK",
          headers: {},
          config: {} as never,
        }),
      );

    const result = await service.fetchNearbyPlaces({ ...baseOptions, includedTypes: ["museum"] });

    expect(result).toHaveLength(1);
    expect(result[0].place_id).toEqual("p1");
    expect(httpService.post).toHaveBeenCalledTimes(2);
  });

  it("retries on 500 and succeeds", async () => {
    const park = newApiPlace("p2", "Park B", ["park"]);
    jest
      .spyOn(httpService, "post")
      .mockReturnValueOnce(
        throwError(() => Object.assign(new Error("Server error"), { response: { status: 500 } })),
      )
      .mockReturnValueOnce(
        of({
          data: { places: [park] },
          status: 200,
          statusText: "OK",
          headers: {},
          config: {} as never,
        }),
      );

    const result = await service.fetchNearbyPlaces({ ...baseOptions, includedTypes: ["park"] });

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual("Park B");
    expect(httpService.post).toHaveBeenCalledTimes(2);
  });

  it("does not retry on 400", async () => {
    jest.spyOn(httpService, "post").mockReturnValue(
      throwError(() => Object.assign(new Error("Bad request"), { response: { status: 400 } })),
    );

    await expect(
      service.fetchNearbyPlaces({ ...baseOptions, includedTypes: ["museum"] }),
    ).rejects.toThrow("Bad request");

    expect(httpService.post).toHaveBeenCalledTimes(1);
  });

  it("handles empty includedTypes array", async () => {
    const postSpy = jest.spyOn(httpService, "post");

    const result = await service.fetchNearbyPlaces({
      ...baseOptions,
      includedTypes: [],
    });

    expect(result).toEqual([]);
    expect(postSpy).not.toHaveBeenCalled();
  });

  it("splits >50 types into batches of 50 (75 types → 2 requests)", async () => {
    const types75 = Array.from({ length: 75 }, (_, i) => `type_${i}`);

    const postSpy = jest.spyOn(httpService, "post").mockReturnValue(
      of({
        data: { places: [] },
        status: 200,
        statusText: "OK",
        headers: {},
        config: {} as never,
      }),
    );

    const result = await service.fetchNearbyPlaces({
      ...baseOptions,
      includedTypes: types75,
    });

    expect(result).toEqual([]);
    expect(postSpy).toHaveBeenCalledTimes(2);
    expect(postSpy).toHaveBeenNthCalledWith(
      1,
      "https://places.googleapis.com/v1/places:searchNearby",
      expect.objectContaining({
        includedTypes: types75.slice(0, 50),
      }),
      expect.any(Object),
    );
    expect(postSpy).toHaveBeenNthCalledWith(
      2,
      "https://places.googleapis.com/v1/places:searchNearby",
      expect.objectContaining({
        includedTypes: types75.slice(50, 75),
      }),
      expect.any(Object),
    );
  });

  describe("findPlaceByLocation", () => {
    it("returns first place when found, omits includedTypes from request", async () => {
      const marbellaClub = newApiPlace("ChIJMarbellaClub", "Marbella Club Hotel", ["lodging"]);
      const postSpy = jest.spyOn(httpService, "post").mockReturnValue(
        of({
          data: { places: [marbellaClub] },
          status: 200,
          statusText: "OK",
          headers: {},
          config: {} as never,
        }),
      );

      const result = await service.findPlaceByLocation(36.516, -4.43, 50);

      expect(result).toEqual("ChIJMarbellaClub");
      expect(postSpy).toHaveBeenCalledWith(
        "https://places.googleapis.com/v1/places:searchNearby",
        expect.any(Object),
        expect.any(Object),
      );
      const body = postSpy.mock.calls[0][1] as Record<string, unknown>;
      expect(body.includedTypes).toBeUndefined();
    });

    it("returns null when no places found", async () => {
      jest.spyOn(httpService, "post").mockReturnValue(
        of({
          data: { places: [] },
          status: 200,
          statusText: "OK",
          headers: {},
          config: {} as never,
        }),
      );

      const result = await service.findPlaceByLocation(36.516, -4.43, 50);

      expect(result).toBeNull();
    });
  });

  describe("findPlaceByTextSearch", () => {
    it("returns place_id for Marbella Club Hotel when found", async () => {
      const marbellaClub = newApiPlace("ChIJMarbellaClub", "Marbella Club Hotel", ["lodging"]);
      const postSpy = jest.spyOn(httpService, "post").mockReturnValue(
        of({
          data: { places: [marbellaClub] },
          status: 200,
          statusText: "OK",
          headers: {},
          config: {} as never,
        }),
      );

      const result = await service.findPlaceByTextSearch("Marbella Club Hotel", 36.516, -4.43);

      expect(result).toEqual("ChIJMarbellaClub");
      expect(postSpy).toHaveBeenCalledWith(
        "https://places.googleapis.com/v1/places:searchText",
        expect.objectContaining({
          textQuery: "Marbella Club Hotel",
          locationBias: {
            circle: {
              center: { latitude: 36.516, longitude: -4.43 },
              radius: 500,
            },
          },
          rankPreference: "DISTANCE",
        }),
        expect.any(Object),
      );
    });

    it("returns null when no results", async () => {
      jest.spyOn(httpService, "post").mockReturnValue(
        of({
          data: { places: [] },
          status: 200,
          statusText: "OK",
          headers: {},
          config: {} as never,
        }),
      );

      const result = await service.findPlaceByTextSearch("Unknown Place XYZ", 36.516, -4.43);

      expect(result).toBeNull();
    });

    it("returns null for empty name", async () => {
      const postSpy = jest.spyOn(httpService, "post");

      const result = await service.findPlaceByTextSearch("", 36.516, -4.43);

      expect(result).toBeNull();
      expect(postSpy).not.toHaveBeenCalled();
    });

    it("returns null when API key is missing", async () => {
      const moduleWithNoKey = await Test.createTestingModule({
        imports: [ConfigModule.forRoot({ isGlobal: true, load: [() => ({ GOOGLE_API_KEY: "" })] }), HttpModule],
        providers: [GooglePlacesFetcherService],
      }).compile();

      const svc = moduleWithNoKey.get(GooglePlacesFetcherService);
      const result = await svc.findPlaceByTextSearch("Marbella Club Hotel", 36.516, -4.43);

      expect(result).toBeNull();
    });
  });

  it("splits 125 types into 3 requests", async () => {
    const types125 = Array.from({ length: 125 }, (_, i) => `type_${i}`);

    const postSpy = jest.spyOn(httpService, "post").mockReturnValue(
      of({
        data: { places: [] },
        status: 200,
        statusText: "OK",
        headers: {},
        config: {} as never,
      }),
    );

    await service.fetchNearbyPlaces({
      ...baseOptions,
      includedTypes: types125,
    });

    expect(postSpy).toHaveBeenCalledTimes(3);
    expect(postSpy).toHaveBeenNthCalledWith(
      1,
      expect.any(String),
      expect.objectContaining({ includedTypes: types125.slice(0, 50) }),
      expect.any(Object),
    );
    expect(postSpy).toHaveBeenNthCalledWith(
      2,
      expect.any(String),
      expect.objectContaining({ includedTypes: types125.slice(50, 100) }),
      expect.any(Object),
    );
    expect(postSpy).toHaveBeenNthCalledWith(
      3,
      expect.any(String),
      expect.objectContaining({ includedTypes: types125.slice(100, 125) }),
      expect.any(Object),
    );
  });

  describe("getPlaceDetails", () => {
    it("returns description and photoName from Place Details API", async () => {
      jest.spyOn(httpService, "get").mockReturnValue(
        of({
          data: {
            editorialSummary: { overview: "A leading contemporary art museum." },
            photos: [{ name: "places/ChIJ123/photos/Atxxx" }],
          },
          status: 200,
          statusText: "OK",
          headers: {},
          config: {} as never,
        }),
      );

      const result = await service.getPlaceDetails("ChIJ123");

      expect(result).toEqual({
        description: "A leading contemporary art museum.",
        photoName: "places/ChIJ123/photos/Atxxx",
      });
      expect(httpService.get).toHaveBeenCalledWith(
        "https://places.googleapis.com/v1/places/ChIJ123",
        expect.objectContaining({
          headers: expect.objectContaining({
            "X-Goog-FieldMask": "editorialSummary,photos",
          }),
        }),
      );
    });

    it("returns null description when editorialSummary is missing", async () => {
      jest.spyOn(httpService, "get").mockReturnValue(
        of({
          data: {},
          status: 200,
          statusText: "OK",
          headers: {},
          config: {} as never,
        }),
      );

      const result = await service.getPlaceDetails("ChIJ456");

      expect(result).toEqual({
        description: null,
        photoName: null,
      });
    });

    it("returns null photoName when photos array is empty", async () => {
      jest.spyOn(httpService, "get").mockReturnValue(
        of({
          data: {
            editorialSummary: { overview: "Desc" },
            photos: [],
          },
          status: 200,
          statusText: "OK",
          headers: {},
          config: {} as never,
        }),
      );

      const result = await service.getPlaceDetails("ChIJ789");

      expect(result.photoName).toBeNull();
    });

    it("returns null when API key is missing", async () => {
      const moduleWithNoKey = await Test.createTestingModule({
        imports: [ConfigModule.forRoot({ isGlobal: true, load: [() => ({ GOOGLE_API_KEY: "" })] }), HttpModule],
        providers: [GooglePlacesFetcherService],
      }).compile();

      const svc = moduleWithNoKey.get(GooglePlacesFetcherService);
      const result = await svc.getPlaceDetails("ChIJ123");

      expect(result).toEqual({ description: null, photoName: null });
    });
  });
});
