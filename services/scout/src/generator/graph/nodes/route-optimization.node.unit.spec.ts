import { PlaceCategory, RouteMode, RouteTheme } from "@framework/types";

import { makeRouteOptimizationNode } from "./route-optimization.node";
import { DEFAULT_ROUTE_GENERATION_OPTIONS } from "../../generator.options";
import type { ICluster, IWeightedPlace, RouteGenerationState } from "../state";

const createPlace = (id: string, _lat: number, _lng: number) =>
  ({
    id,
    category: PlaceCategory.PARK,
    name: "Test",
  }) as unknown as IWeightedPlace["place"];

describe("makeRouteOptimizationNode", () => {
  it("returns orderedStops starting from startPlace", async () => {
    const p1 = createPlace("p1", 36.48, -4.98);
    const p2 = createPlace("p2", 36.49, -4.99);
    const coordCache = new Map<string, { lat: number; lng: number }>();
    coordCache.set("p1", { lat: 36.48, lng: -4.98 });
    coordCache.set("p2", { lat: 36.49, lng: -4.99 });

    const state: RouteGenerationState = {
      cityId: "city1",
      routeGenerationOptions: DEFAULT_ROUTE_GENERATION_OPTIONS,
      places: [],
      weightedPlaces: [
        { place: p1, weight: 10 },
        { place: p2, weight: 8 },
      ],
      clusters: [],
      seeds: [],
      currentSeed: {
        theme: RouteTheme.HIGHLIGHTS,
        routeMode: RouteMode.WALKING,
        durationBudgetMinutes: 120,
        startPlace: p1,
        cluster: {} as ICluster,
      },
      candidatePlaces: [],
      scoredPlaces: [
        { place: p1, weight: 10 },
        { place: p2, weight: 8 },
      ],
      orderedStops: [],
      trimmedStops: [],
      builtRoute: null,
      savedRoutes: [],
      error: null,
    };

    const node = makeRouteOptimizationNode(coordCache);
    const result = await node(state);

    expect(result.orderedStops).toBeDefined();
    expect(result.orderedStops!.length).toBeGreaterThanOrEqual(1);
    expect(result.orderedStops![0].place.id).toEqual("p1");
  });

  it("returns empty when currentSeed null", async () => {
    const coordCache = new Map<string, { lat: number; lng: number }>();
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

    const node = makeRouteOptimizationNode(coordCache);
    const result = await node(state);

    expect(result.orderedStops).toEqual([]);
  });

  it("returns empty when scoredPlaces empty", async () => {
    const p1 = createPlace("p1", 36.48, -4.98);
    const coordCache = new Map<string, { lat: number; lng: number }>();
    coordCache.set("p1", { lat: 36.48, lng: -4.98 });

    const state: RouteGenerationState = {
      cityId: "city1",
      routeGenerationOptions: DEFAULT_ROUTE_GENERATION_OPTIONS,
      places: [],
      weightedPlaces: [],
      clusters: [],
      seeds: [],
      currentSeed: {
        theme: RouteTheme.HIGHLIGHTS,
        routeMode: RouteMode.WALKING,
        durationBudgetMinutes: 120,
        startPlace: p1,
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

    const node = makeRouteOptimizationNode(coordCache);
    const result = await node(state);

    expect(result.orderedStops).toEqual([]);
  });
});
