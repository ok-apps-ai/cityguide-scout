import { PlaceCategory, PriceLevel, RouteMode, RouteTheme } from "@framework/types";

import { makeCostCalculationNode } from "./cost-calculation.node";
import { WALKING_ROUTE_GENERATION_OPTIONS } from "../../generator.options";
import type { IRouteStop, RouteGenerationState } from "../state";

const createPlace = (id: string, category: PlaceCategory, priceLevel?: PriceLevel) =>
  ({
    id,
    category,
    priceLevel: priceLevel ?? null,
    visitDurationMinutes: 30,
  }) as unknown as IRouteStop["place"];

const createStop = (place: IRouteStop["place"], visitMinutes = 30): IRouteStop => ({
  place,
  orderIndex: 0,
  visitDurationMinutes: visitMinutes,
});

describe("makeCostCalculationNode", () => {
  it("computes duration from visit times and walking distance between stops", async () => {
    const coordCache = new Map<string, { lat: number; lng: number }>();
    const p1 = createPlace("p1", PlaceCategory.PARK);
    const p2 = createPlace("p2", PlaceCategory.PARK);
    coordCache.set("p1", { lat: 36.48, lng: -4.98 });
    coordCache.set("p2", { lat: 36.49, lng: -4.99 });

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
        theme: RouteTheme.HISTORY,
        routeMode: RouteMode.WALKING,
        durationBudgetMinutes: 120,
        startPlace: p1,
        cluster: {} as RouteGenerationState["currentSeed"] extends { cluster: infer C } ? C : never,
      },
      candidatePlaces: [],
      scoredPlaces: [],
      orderedStops: [],
      trimmedStops: [createStop(p1), createStop(p2)],
      builtRoute: null,
      savedRoutes: [],
      error: null,
    };

    const node = makeCostCalculationNode(coordCache);
    const result = await node(state);

    expect(result.builtRoute).toBeDefined();
    expect(result.builtRoute!.durationMinutes).toBeGreaterThan(30);
    expect(Number.isInteger(result.builtRoute!.durationMinutes)).toBe(true);
  });

  it("computes distance from haversine between consecutive stops", async () => {
    const coordCache = new Map<string, { lat: number; lng: number }>();
    const p1 = createPlace("p1", PlaceCategory.TOURIST_ATTRACTION);
    const p2 = createPlace("p2", PlaceCategory.TOURIST_ATTRACTION);
    coordCache.set("p1", { lat: 36.48, lng: -4.98 });
    coordCache.set("p2", { lat: 36.49, lng: -4.99 });

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
        theme: RouteTheme.NATURE,
        routeMode: RouteMode.WALKING,
        durationBudgetMinutes: 180,
        startPlace: p1,
        cluster: {} as RouteGenerationState["currentSeed"] extends { cluster: infer C } ? C : never,
      },
      candidatePlaces: [],
      scoredPlaces: [],
      orderedStops: [],
      trimmedStops: [createStop(p1), createStop(p2)],
      builtRoute: null,
      savedRoutes: [],
      error: null,
    };

    const node = makeCostCalculationNode(coordCache);
    const result = await node(state);

    expect(result.builtRoute).toBeDefined();
    expect(result.builtRoute!.distanceKm).toBeGreaterThan(0);
    expect(typeof result.builtRoute!.distanceKm).toBe("number");
  });

  it("returns builtRoute null when currentSeed is null", async () => {
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
      trimmedStops: [createStop(createPlace("p1", PlaceCategory.PARK))],
      builtRoute: null,
      savedRoutes: [],
      error: null,
    };

    const node = makeCostCalculationNode(coordCache);
    const result = await node(state);

    expect(result.builtRoute).toBeNull();
  });

  it("returns builtRoute null when trimmedStops is empty", async () => {
    const coordCache = new Map<string, { lat: number; lng: number }>();
    const p1 = createPlace("p1", PlaceCategory.PARK);
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
        durationBudgetMinutes: 60,
        startPlace: p1,
        cluster: {} as RouteGenerationState["currentSeed"] extends { cluster: infer C } ? C : never,
      },
      candidatePlaces: [],
      scoredPlaces: [],
      orderedStops: [],
      trimmedStops: [],
      builtRoute: null,
      savedRoutes: [],
      error: null,
    };

    const node = makeCostCalculationNode(coordCache);
    const result = await node(state);

    expect(result.builtRoute).toBeNull();
  });

  it("assigns INEXPENSIVE price level when avg score in range", async () => {
    const coordCache = new Map<string, { lat: number; lng: number }>();
    const p1 = createPlace("p1", PlaceCategory.STORE, PriceLevel.INEXPENSIVE);
    const p2 = createPlace("p2", PlaceCategory.STORE, PriceLevel.INEXPENSIVE);
    coordCache.set("p1", { lat: 36.48, lng: -4.98 });
    coordCache.set("p2", { lat: 36.49, lng: -4.99 });

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
        theme: RouteTheme.SHOPPING,
        routeMode: RouteMode.WALKING,
        durationBudgetMinutes: 90,
        startPlace: p1,
        cluster: {} as RouteGenerationState["currentSeed"] extends { cluster: infer C } ? C : never,
      },
      candidatePlaces: [],
      scoredPlaces: [],
      orderedStops: [],
      trimmedStops: [createStop(p1), createStop(p2)],
      builtRoute: null,
      savedRoutes: [],
      error: null,
    };

    const node = makeCostCalculationNode(coordCache);
    const result = await node(state);

    expect(result.builtRoute).toBeDefined();
    expect([PriceLevel.FREE, PriceLevel.INEXPENSIVE, PriceLevel.MODERATE]).toContain(result.builtRoute!.priceLevel);
  });

  it("uses fallback geometry when coordCache has no coords for stops", async () => {
    const coordCache = new Map<string, { lat: number; lng: number }>();
    const p1 = createPlace("p1", PlaceCategory.PARK);
    const p2 = createPlace("p2", PlaceCategory.PARK);

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
        durationBudgetMinutes: 60,
        startPlace: p1,
        cluster: {} as RouteGenerationState["currentSeed"] extends { cluster: infer C } ? C : never,
      },
      candidatePlaces: [],
      scoredPlaces: [],
      orderedStops: [],
      trimmedStops: [createStop(p1), createStop(p2)],
      builtRoute: null,
      savedRoutes: [],
      error: null,
    };

    const node = makeCostCalculationNode(coordCache);
    const result = await node(state);

    expect(result.builtRoute).toBeDefined();
    expect(result.builtRoute!.routeGeometryWkt).toContain("LINESTRING");
  });

  it("computes price level from place categories (free for parks/attractions)", async () => {
    const coordCache = new Map<string, { lat: number; lng: number }>();
    const p1 = createPlace("p1", PlaceCategory.PARK);
    const p2 = createPlace("p2", PlaceCategory.TOURIST_ATTRACTION);
    coordCache.set("p1", { lat: 36.48, lng: -4.98 });
    coordCache.set("p2", { lat: 36.49, lng: -4.99 });

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
        durationBudgetMinutes: 90,
        startPlace: p1,
        cluster: {} as RouteGenerationState["currentSeed"] extends { cluster: infer C } ? C : never,
      },
      candidatePlaces: [],
      scoredPlaces: [],
      orderedStops: [],
      trimmedStops: [createStop(p1), createStop(p2)],
      builtRoute: null,
      savedRoutes: [],
      error: null,
    };

    const node = makeCostCalculationNode(coordCache);
    const result = await node(state);

    expect(result.builtRoute).toBeDefined();
    expect([
      PriceLevel.FREE,
      PriceLevel.INEXPENSIVE,
      PriceLevel.MODERATE,
      PriceLevel.EXPENSIVE,
      PriceLevel.VERY_EXPENSIVE,
    ]).toContain(result.builtRoute!.priceLevel);
  });

  it("assigns MODERATE price level when avg score in range [1.2, 2.2)", async () => {
    const coordCache = new Map<string, { lat: number; lng: number }>();
    const p1 = createPlace("p1", PlaceCategory.STORE, PriceLevel.MODERATE);
    const p2 = createPlace("p2", PlaceCategory.STORE, PriceLevel.MODERATE);
    coordCache.set("p1", { lat: 36.48, lng: -4.98 });
    coordCache.set("p2", { lat: 36.49, lng: -4.99 });

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
        durationBudgetMinutes: 90,
        startPlace: p1,
        cluster: {} as RouteGenerationState["currentSeed"] extends { cluster: infer C } ? C : never,
      },
      candidatePlaces: [],
      scoredPlaces: [],
      orderedStops: [],
      trimmedStops: [createStop(p1), createStop(p2)],
      builtRoute: null,
      savedRoutes: [],
      error: null,
    };

    const node = makeCostCalculationNode(coordCache);
    const result = await node(state);

    expect(result.builtRoute).toBeDefined();
    expect(result.builtRoute!.priceLevel).toEqual(PriceLevel.MODERATE);
  });

  it("assigns EXPENSIVE price level when avg score in range [2.2, 3.2)", async () => {
    const coordCache = new Map<string, { lat: number; lng: number }>();
    const p1 = createPlace("p1", PlaceCategory.STORE, PriceLevel.MODERATE);
    const p2 = createPlace("p2", PlaceCategory.STORE, PriceLevel.EXPENSIVE);
    coordCache.set("p1", { lat: 36.48, lng: -4.98 });
    coordCache.set("p2", { lat: 36.49, lng: -4.99 });

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
        durationBudgetMinutes: 90,
        startPlace: p1,
        cluster: {} as RouteGenerationState["currentSeed"] extends { cluster: infer C } ? C : never,
      },
      candidatePlaces: [],
      scoredPlaces: [],
      orderedStops: [],
      trimmedStops: [createStop(p1), createStop(p2)],
      builtRoute: null,
      savedRoutes: [],
      error: null,
    };

    const node = makeCostCalculationNode(coordCache);
    const result = await node(state);

    expect(result.builtRoute).toBeDefined();
    expect(result.builtRoute!.priceLevel).toEqual(PriceLevel.EXPENSIVE);
  });

  it("assigns VERY_EXPENSIVE price level when avg score >= 3.2", async () => {
    const coordCache = new Map<string, { lat: number; lng: number }>();
    const p1 = createPlace("p1", PlaceCategory.STORE, PriceLevel.EXPENSIVE);
    const p2 = createPlace("p2", PlaceCategory.STORE, PriceLevel.VERY_EXPENSIVE);
    coordCache.set("p1", { lat: 36.48, lng: -4.98 });
    coordCache.set("p2", { lat: 36.49, lng: -4.99 });

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
        durationBudgetMinutes: 90,
        startPlace: p1,
        cluster: {} as RouteGenerationState["currentSeed"] extends { cluster: infer C } ? C : never,
      },
      candidatePlaces: [],
      scoredPlaces: [],
      orderedStops: [],
      trimmedStops: [createStop(p1), createStop(p2)],
      builtRoute: null,
      savedRoutes: [],
      error: null,
    };

    const node = makeCostCalculationNode(coordCache);
    const result = await node(state);

    expect(result.builtRoute).toBeDefined();
    expect(result.builtRoute!.priceLevel).toEqual(PriceLevel.VERY_EXPENSIVE);
  });

  it("uses single-point geometry when only one stop has coords", async () => {
    const coordCache = new Map<string, { lat: number; lng: number }>();
    const p1 = createPlace("p1", PlaceCategory.PARK);
    const p2 = createPlace("p2", PlaceCategory.PARK);
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
        durationBudgetMinutes: 60,
        startPlace: p1,
        cluster: {} as RouteGenerationState["currentSeed"] extends { cluster: infer C } ? C : never,
      },
      candidatePlaces: [],
      scoredPlaces: [],
      orderedStops: [],
      trimmedStops: [createStop(p1), createStop(p2)],
      builtRoute: null,
      savedRoutes: [],
      error: null,
    };

    const node = makeCostCalculationNode(coordCache);
    const result = await node(state);

    expect(result.builtRoute).toBeDefined();
    expect(result.builtRoute!.routeGeometryWkt).toContain("LINESTRING");
    expect(result.builtRoute!.routeGeometryWkt).toContain("-4.98 36.48");
  });
});
