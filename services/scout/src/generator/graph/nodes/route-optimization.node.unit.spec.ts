import { PlaceCategory, RouteMode, RouteTheme } from "@framework/types";

import { makeRouteOptimizationNode } from "./route-optimization.node";
import { WALKING_ROUTE_GENERATION_OPTIONS } from "../../generator.options";
import type { ICluster, IWeightedPlace, RouteGenerationState } from "../state";

const createPlace = (id: string, _lat: number, _lng: number) =>
  ({
    id,
    category: PlaceCategory.PARK,
    name: "Test",
  }) as unknown as IWeightedPlace["place"];

const createState = (
  places: IWeightedPlace["place"][],
  startPlace: IWeightedPlace["place"],
  overrides: Partial<RouteGenerationState> = {},
): RouteGenerationState => {
  const scoredPlaces = places.map(p => ({ place: p, weight: 10 }));
  return {
    cityId: "city1",
    location: "Test City",
    theme: RouteTheme.HIGHLIGHTS,
    routeGenerationOptions: { ...WALKING_ROUTE_GENERATION_OPTIONS, maxPoints: 5 },
    places: [],
    weightedPlaces: scoredPlaces,
    clusters: [],
    seeds: [],
    currentSeed: {
      theme: RouteTheme.HIGHLIGHTS,
      routeMode: RouteMode.WALKING,
      durationBudgetMinutes: 120,
      startPlace,
      cluster: {} as ICluster,
    },
    candidatePlaces: [],
    scoredPlaces,
    orderedStops: [],
    trimmedStops: [],
    builtRoute: null,
    savedRoutes: [],
    error: null,
    ...overrides,
  };
};

describe("makeRouteOptimizationNode", () => {
  it("returns orderedStops starting from startPlace", async () => {
    const p1 = createPlace("p1", 36.48, -4.98);
    const p2 = createPlace("p2", 36.49, -4.99);
    const coordCache = new Map<string, { lat: number; lng: number }>();
    coordCache.set("p1", { lat: 36.48, lng: -4.98 });
    coordCache.set("p2", { lat: 36.49, lng: -4.99 });

    const state: RouteGenerationState = {
      cityId: "city1",
      location: "Test City",
      theme: RouteTheme.HIGHLIGHTS,
      routeGenerationOptions: WALKING_ROUTE_GENERATION_OPTIONS,
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
      location: "Test City",
      theme: RouteTheme.HIGHLIGHTS,
      routeGenerationOptions: WALKING_ROUTE_GENERATION_OPTIONS,
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

  describe("return-to-start: last stop is nearest to start", () => {
    it("linear: last stop is p2 (nearest to start), not p5", async () => {
      const p1 = createPlace("p1", 36.5, -4.9);
      const p2 = createPlace("p2", 36.501, -4.9);
      const p3 = createPlace("p3", 36.505, -4.9);
      const p4 = createPlace("p4", 36.51, -4.9);
      const p5 = createPlace("p5", 36.515, -4.9);

      const coordCache = new Map<string, { lat: number; lng: number }>();
      coordCache.set("p1", { lat: 36.5, lng: -4.9 });
      coordCache.set("p2", { lat: 36.501, lng: -4.9 });
      coordCache.set("p3", { lat: 36.505, lng: -4.9 });
      coordCache.set("p4", { lat: 36.51, lng: -4.9 });
      coordCache.set("p5", { lat: 36.515, lng: -4.9 });

      const state = createState([p1, p2, p3, p4, p5], p1);
      const node = makeRouteOptimizationNode(coordCache);
      const result = await node(state);

      expect(result.orderedStops).toBeDefined();
      expect(result.orderedStops!.length).toBe(5);
      expect(result.orderedStops![0].place.id).toEqual("p1");
      expect(result.orderedStops![4].place.id).toEqual("p2");
    });

    it("star: last stop is p2 (nearest to start)", async () => {
      const p1 = createPlace("p1", 36.5, -4.9);
      const p2 = createPlace("p2", 36.5005, -4.9);
      const p3 = createPlace("p3", 36.505, -4.9);
      const p4 = createPlace("p4", 36.5, -4.891);
      const p5 = createPlace("p5", 36.5, -4.909);

      const coordCache = new Map<string, { lat: number; lng: number }>();
      coordCache.set("p1", { lat: 36.5, lng: -4.9 });
      coordCache.set("p2", { lat: 36.5005, lng: -4.9 });
      coordCache.set("p3", { lat: 36.505, lng: -4.9 });
      coordCache.set("p4", { lat: 36.5, lng: -4.891 });
      coordCache.set("p5", { lat: 36.5, lng: -4.909 });

      const state = createState([p1, p2, p3, p4, p5], p1);
      const node = makeRouteOptimizationNode(coordCache);
      const result = await node(state);

      expect(result.orderedStops).toBeDefined();
      expect(result.orderedStops!.length).toBe(5);
      expect(result.orderedStops![4].place.id).toEqual("p2");
    });

    it("two clusters: route goes to far cluster then returns to p2", async () => {
      const p1 = createPlace("p1", 36.5, -4.9);
      const p2 = createPlace("p2", 36.501, -4.9);
      const p3 = createPlace("p3", 36.52, -4.9);
      const p4 = createPlace("p4", 36.521, -4.9);
      const p5 = createPlace("p5", 36.522, -4.9);

      const coordCache = new Map<string, { lat: number; lng: number }>();
      coordCache.set("p1", { lat: 36.5, lng: -4.9 });
      coordCache.set("p2", { lat: 36.501, lng: -4.9 });
      coordCache.set("p3", { lat: 36.52, lng: -4.9 });
      coordCache.set("p4", { lat: 36.521, lng: -4.9 });
      coordCache.set("p5", { lat: 36.522, lng: -4.9 });

      const state = createState([p1, p2, p3, p4, p5], p1);
      const node = makeRouteOptimizationNode(coordCache);
      const result = await node(state);

      expect(result.orderedStops).toBeDefined();
      expect(result.orderedStops!.length).toBe(5);
      expect(result.orderedStops![0].place.id).toEqual("p1");
      expect(result.orderedStops![4].place.id).toEqual("p2");
    });

    it("minimal (2 points): route is start → other", async () => {
      const p1 = createPlace("p1", 36.5, -4.9);
      const p2 = createPlace("p2", 36.501, -4.9);

      const coordCache = new Map<string, { lat: number; lng: number }>();
      coordCache.set("p1", { lat: 36.5, lng: -4.9 });
      coordCache.set("p2", { lat: 36.501, lng: -4.9 });

      const state = createState([p1, p2], p1);
      const node = makeRouteOptimizationNode(coordCache);
      const result = await node(state);

      expect(result.orderedStops).toBeDefined();
      expect(result.orderedStops!.length).toBe(2);
      expect(result.orderedStops![0].place.id).toEqual("p1");
      expect(result.orderedStops![1].place.id).toEqual("p2");
    });
  });
});
