import { PlaceCategory, RouteMode, RouteTheme } from "@framework/types";
import type { IPlace } from "@framework/types";

import { computeBaseScoredPlaces, makePoiScoringNode } from "./poi-scoring.node";
import { DEFAULT_ROUTE_GENERATION_OPTIONS } from "../../generator.options";
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
});

describe("makePoiScoringNode", () => {
  it("returns base scored places when no openaiApiKey", async () => {
    const place = createPlace("p1", PlaceCategory.MUSEUM);
    const weightedPlaces: IWeightedPlace[] = [{ place, weight: 10 }];

    const state: RouteGenerationState = {
      cityId: "city1",
      routeGenerationOptions: DEFAULT_ROUTE_GENERATION_OPTIONS,
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
      routeGenerationOptions: DEFAULT_ROUTE_GENERATION_OPTIONS,
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
      routeGenerationOptions: DEFAULT_ROUTE_GENERATION_OPTIONS,
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
});
