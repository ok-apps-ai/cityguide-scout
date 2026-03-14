import { PlaceCategory, RouteMode, RouteTheme } from "@framework/types";
import type { IPlace } from "@framework/types";

const mockInvoke = jest.fn();

jest.mock("@langchain/openai", () => ({
  ChatOpenAI: jest.fn().mockImplementation(() => ({
    withStructuredOutput: () => ({
      invoke: mockInvoke,
    }),
  })),
}));

import { computeBaseScoredPlaces, makePoiScoringNode } from "./poi-scoring.node";
import { WALKING_ROUTE_GENERATION_OPTIONS } from "../../generator.options";
import type { ICluster, IWeightedPlace, RouteGenerationState } from "../state";

const createPlace = (id: string, category: PlaceCategory): IPlace =>
  ({ id, category, name: "Test", rating: null }) as unknown as IPlace;

describe("computeBaseScoredPlaces", () => {
  it("assigns theme bonus for theme-matching category", () => {
    const park = createPlace("p1", PlaceCategory.PARK);
    const store = createPlace("p2", PlaceCategory.STORE);
    const weightedPlaces: IWeightedPlace[] = [
      { place: park, weight: 8 },
      { place: store, weight: 4 },
    ];

    const result = computeBaseScoredPlaces([park, store], weightedPlaces, RouteTheme.NATURE);

    expect(result).toHaveLength(2);
    const parkScored = result.find(w => w.place.id === "p1");
    const storeScored = result.find(w => w.place.id === "p2");
    expect(parkScored!.weight).toBeGreaterThan(storeScored!.weight);
  });

  it("uses global weight when no theme weight", () => {
    const place = createPlace("p1", PlaceCategory.PARK);
    const weightedPlaces: IWeightedPlace[] = [{ place, weight: 10 }];

    const result = computeBaseScoredPlaces([place], weightedPlaces, RouteTheme.HIGHLIGHTS);

    expect(result[0].weight).toBeDefined();
    expect(result[0].weight).toBeGreaterThanOrEqual(1);
  });

  it("uses empty theme categories for unknown theme", () => {
    const place = createPlace("p1", PlaceCategory.MUSEUM);
    const weightedPlaces: IWeightedPlace[] = [{ place, weight: 5 }];

    const result = computeBaseScoredPlaces([place], weightedPlaces, "unknown" as RouteTheme);

    expect(result).toHaveLength(1);
    expect(result[0].weight).toBeDefined();
  });

  it("assigns theme bonus when category in theme categories", () => {
    const museum = createPlace("p1", PlaceCategory.MUSEUM);
    const park = createPlace("p2", PlaceCategory.PARK);
    const weightedPlaces: IWeightedPlace[] = [
      { place: museum, weight: 5 },
      { place: park, weight: 5 },
    ];

    const highlightsResult = computeBaseScoredPlaces([museum, park], weightedPlaces, RouteTheme.HIGHLIGHTS);
    const museumScored = highlightsResult.find(w => w.place.id === "p1");
    expect(museumScored!.weight).toBeGreaterThan(5);

    const natureResult = computeBaseScoredPlaces([museum, park], weightedPlaces, RouteTheme.NATURE);
    const parkScored = natureResult.find(w => w.place.id === "p2");
    expect(parkScored!.weight).toBeGreaterThan(5);
  });
});

describe("makePoiScoringNode", () => {
  beforeEach(() => {
    mockInvoke.mockReset();
  });

  it("returns base scored places when no openaiApiKey", async () => {
    const place = createPlace("p1", PlaceCategory.MUSEUM);
    const weightedPlaces: IWeightedPlace[] = [{ place, weight: 10 }];

    const state: RouteGenerationState = {
      cityId: "city1",
      location: "Test City",
      theme: RouteTheme.HIGHLIGHTS,
      routeGenerationOptions: WALKING_ROUTE_GENERATION_OPTIONS,
      places: [],
      weightedPlaces,
      clusters: [],
      seeds: [],
      currentSeed: {
        theme: RouteTheme.HIGHLIGHTS,
        routeMode: RouteMode.WALKING,
        durationBudgetMinutes: 60,
        startPlace: place,
        cluster: {} as ICluster,
      },
      candidatePlaces: [place],
      scoredPlaces: [],
      orderedStops: [],
      trimmedStops: [],
      builtRoute: null,
      savedRoutes: [],
      error: null,
    };

    const node = makePoiScoringNode("");
    const result = await node(state);

    expect(result.scoredPlaces).toBeDefined();
    expect(result.scoredPlaces).toHaveLength(1);
    expect(result.scoredPlaces![0].place.id).toEqual("p1");
  });

  it("returns empty when currentSeed null", async () => {
    const state: RouteGenerationState = {
      cityId: "city1",
      location: "Test City",
      theme: RouteTheme.HIGHLIGHTS,
      routeGenerationOptions: WALKING_ROUTE_GENERATION_OPTIONS,
      places: [],
      weightedPlaces: [],
      clusters: [],
      seeds: [],
      currentSeed: null,
      candidatePlaces: [],
      scoredPlaces: [],
      orderedStops: [],
      trimmedStops: [],
      builtRoute: null,
      savedRoutes: [],
      error: null,
    };

    const node = makePoiScoringNode("key");
    const result = await node(state);

    expect(result.scoredPlaces).toEqual([]);
  });

  it("returns empty when candidatePlaces empty", async () => {
    const place = createPlace("p1", PlaceCategory.PARK);
    const state: RouteGenerationState = {
      cityId: "city1",
      location: "Test City",
      theme: RouteTheme.HIGHLIGHTS,
      routeGenerationOptions: WALKING_ROUTE_GENERATION_OPTIONS,
      places: [],
      weightedPlaces: [{ place, weight: 10 }],
      clusters: [],
      seeds: [],
      currentSeed: {
        theme: RouteTheme.NATURE,
        routeMode: RouteMode.WALKING,
        durationBudgetMinutes: 60,
        startPlace: place,
        cluster: {} as ICluster,
      },
      candidatePlaces: [],
      scoredPlaces: [],
      orderedStops: [],
      trimmedStops: [],
      builtRoute: null,
      savedRoutes: [],
      error: null,
    };

    const node = makePoiScoringNode("key");
    const result = await node(state);

    expect(result.scoredPlaces).toEqual([]);
  });

  it("returns base scored when top20 has places but no API key", async () => {
    const place = createPlace("p1", PlaceCategory.PARK);
    const state: RouteGenerationState = {
      cityId: "city1",
      location: "Test City",
      theme: RouteTheme.HIGHLIGHTS,
      routeGenerationOptions: WALKING_ROUTE_GENERATION_OPTIONS,
      places: [],
      weightedPlaces: [{ place, weight: 10 }],
      clusters: [],
      seeds: [],
      currentSeed: {
        theme: RouteTheme.NATURE,
        routeMode: RouteMode.WALKING,
        durationBudgetMinutes: 60,
        startPlace: place,
        cluster: {} as ICluster,
      },
      candidatePlaces: [place],
      scoredPlaces: [],
      orderedStops: [],
      trimmedStops: [],
      builtRoute: null,
      savedRoutes: [],
      error: null,
    };

    const node = makePoiScoringNode("");
    const result = await node(state);

    expect(result.scoredPlaces).toBeDefined();
    expect(result.scoredPlaces!.length).toBe(1);
    expect(result.scoredPlaces![0].place.id).toEqual("p1");
  });

  it("applies AI bonus scores when API returns rankings", async () => {
    const p1 = createPlace("p1", PlaceCategory.MUSEUM);
    const p2 = createPlace("p2", PlaceCategory.MONUMENT);
    const weightedPlaces: IWeightedPlace[] = [
      { place: p1, weight: 8 },
      { place: p2, weight: 6 },
    ];
    mockInvoke.mockResolvedValue({
      rankings: [
        { index: 1, bonus: 4 },
        { index: 2, bonus: 2 },
      ],
    });

    const state: RouteGenerationState = {
      cityId: "city1",
      location: "Test City",
      theme: RouteTheme.HIGHLIGHTS,
      routeGenerationOptions: WALKING_ROUTE_GENERATION_OPTIONS,
      places: [],
      weightedPlaces,
      clusters: [],
      seeds: [],
      currentSeed: {
        theme: RouteTheme.HIGHLIGHTS,
        routeMode: RouteMode.WALKING,
        durationBudgetMinutes: 60,
        startPlace: p1,
        cluster: {} as ICluster,
      },
      candidatePlaces: [p1, p2],
      scoredPlaces: [],
      orderedStops: [],
      trimmedStops: [],
      builtRoute: null,
      savedRoutes: [],
      error: null,
    };

    const node = makePoiScoringNode("valid-key");
    const result = await node(state);

    expect(mockInvoke).toHaveBeenCalledTimes(1);
    expect(result.scoredPlaces).toBeDefined();
    expect(result.scoredPlaces!.length).toBe(2);
    const p1Scored = result.scoredPlaces!.find(w => w.place.id === "p1");
    const p2Scored = result.scoredPlaces!.find(w => w.place.id === "p2");
    expect(p1Scored!.weight).toBe(19);
    expect(p2Scored!.weight).toBe(15);
  });

  it("returns base scored when AI invoke throws", async () => {
    const place = createPlace("p1", PlaceCategory.MUSEUM);
    const weightedPlaces: IWeightedPlace[] = [{ place, weight: 10 }];
    mockInvoke.mockRejectedValue(new Error("API error"));

    const state: RouteGenerationState = {
      cityId: "city1",
      location: "Test City",
      theme: RouteTheme.HIGHLIGHTS,
      routeGenerationOptions: WALKING_ROUTE_GENERATION_OPTIONS,
      places: [],
      weightedPlaces,
      clusters: [],
      seeds: [],
      currentSeed: {
        theme: RouteTheme.HIGHLIGHTS,
        routeMode: RouteMode.WALKING,
        durationBudgetMinutes: 60,
        startPlace: place,
        cluster: {} as ICluster,
      },
      candidatePlaces: [place],
      scoredPlaces: [],
      orderedStops: [],
      trimmedStops: [],
      builtRoute: null,
      savedRoutes: [],
      error: null,
    };

    const node = makePoiScoringNode("key");
    const result = await node(state);

    expect(result.scoredPlaces).toBeDefined();
    expect(result.scoredPlaces!.length).toBe(1);
    expect(result.scoredPlaces![0].place.id).toEqual("p1");
    expect(result.scoredPlaces![0].weight).toBe(15);
  });

  it("passes prompt with table format including name, category, rating, review count, description", async () => {
    const p1 = createPlace("p1", PlaceCategory.MUSEUM);
    (p1 as IPlace & { reviewCount: number }).reviewCount = 12000;
    (p1 as IPlace & { description: string }).description = "A leading contemporary art museum in the heart of Rome.";
    const weightedPlaces: IWeightedPlace[] = [{ place: p1, weight: 8 }];
    mockInvoke.mockResolvedValue({ rankings: [{ index: 1, bonus: 3 }] });

    const state: RouteGenerationState = {
      cityId: "city1",
      location: "Marbella, Spain",
      theme: RouteTheme.HIGHLIGHTS,
      routeGenerationOptions: WALKING_ROUTE_GENERATION_OPTIONS,
      places: [],
      weightedPlaces,
      clusters: [],
      seeds: [],
      currentSeed: {
        theme: RouteTheme.HIGHLIGHTS,
        routeMode: RouteMode.WALKING,
        durationBudgetMinutes: 60,
        startPlace: p1,
        cluster: {} as ICluster,
      },
      candidatePlaces: [p1],
      scoredPlaces: [],
      orderedStops: [],
      trimmedStops: [],
      builtRoute: null,
      savedRoutes: [],
      error: null,
    };

    await makePoiScoringNode("key")(state);

    const prompt = mockInvoke.mock.calls[0][0] as string;
    expect(prompt).toContain("## Role");
    expect(prompt).toContain("## Context");
    expect(prompt).toContain("## Task");
    expect(prompt).toContain("Location: Marbella, Spain");
    expect(prompt).toContain("| Index | Name | Category | Rating | Review count | Description |");
    expect(prompt).toContain("A leading contemporary art museum in the heart of Rome.");
  });

  it("uses — for missing description and review count in table", async () => {
    const p1 = createPlace("p1", PlaceCategory.PARK);
    const weightedPlaces: IWeightedPlace[] = [{ place: p1, weight: 10 }];
    mockInvoke.mockResolvedValue({ rankings: [{ index: 1, bonus: 2 }] });

    const state: RouteGenerationState = {
      cityId: "city1",
      location: "Vatican City",
      theme: RouteTheme.HIGHLIGHTS,
      routeGenerationOptions: WALKING_ROUTE_GENERATION_OPTIONS,
      places: [],
      weightedPlaces,
      clusters: [],
      seeds: [],
      currentSeed: {
        theme: RouteTheme.NATURE,
        routeMode: RouteMode.WALKING,
        durationBudgetMinutes: 60,
        startPlace: p1,
        cluster: {} as ICluster,
      },
      candidatePlaces: [p1],
      scoredPlaces: [],
      orderedStops: [],
      trimmedStops: [],
      builtRoute: null,
      savedRoutes: [],
      error: null,
    };

    await makePoiScoringNode("key")(state);

    const prompt = mockInvoke.mock.calls[0][0] as string;
    expect(prompt).toContain("Location: Vatican City");
    expect(prompt).toMatch(/\| 1 \| Test \| park \| — \| — \| — \|/);
  });

  it("merges AI-scored top20 with rest of baseScored when more than 20 places", async () => {
    const places = Array.from({ length: 25 }, (_, i) => createPlace(`p${i}`, PlaceCategory.MUSEUM));
    const weightedPlaces = places.map(p => ({ place: p, weight: 10 - places.indexOf(p) * 0.1 }));
    mockInvoke.mockResolvedValue({
      rankings: Array.from({ length: 20 }, (_, i) => ({ index: i + 1, bonus: 1 })),
    });

    const state: RouteGenerationState = {
      cityId: "city1",
      location: "Test City",
      theme: RouteTheme.HIGHLIGHTS,
      routeGenerationOptions: WALKING_ROUTE_GENERATION_OPTIONS,
      places: [],
      weightedPlaces,
      clusters: [],
      seeds: [],
      currentSeed: {
        theme: RouteTheme.HIGHLIGHTS,
        routeMode: RouteMode.WALKING,
        durationBudgetMinutes: 60,
        startPlace: places[0],
        cluster: {} as ICluster,
      },
      candidatePlaces: places,
      scoredPlaces: [],
      orderedStops: [],
      trimmedStops: [],
      builtRoute: null,
      savedRoutes: [],
      error: null,
    };

    const node = makePoiScoringNode("key");
    const result = await node(state);

    expect(result.scoredPlaces!.length).toBe(25);
    expect(mockInvoke).toHaveBeenCalledTimes(1);
  });
});
