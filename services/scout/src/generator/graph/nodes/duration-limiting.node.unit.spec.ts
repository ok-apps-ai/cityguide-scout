import { PlaceCategory, RouteMode, RouteTheme } from "@framework/types";

import { makeDurationLimitingNode } from "./duration-limiting.node";
import { DEFAULT_ROUTE_GENERATION_OPTIONS } from "../../generator.options";
import type { ICluster, IRouteStop, RouteGenerationState } from "../state";

const createPlace = (id: string) => ({ id, category: PlaceCategory.PARK }) as unknown as IRouteStop["place"];

const createStop = (place: IRouteStop["place"], orderIndex: number, visitMinutes = 0): IRouteStop => ({
  place,
  orderIndex,
  visitDurationMinutes: visitMinutes,
});

describe("makeDurationLimitingNode", () => {
  it("trims stops to fit duration budget", async () => {
    const p1 = createPlace("p1");
    const p2 = createPlace("p2");
    const p3 = createPlace("p3");
    const coordCache = new Map<string, { lat: number; lng: number }>();
    coordCache.set("p1", { lat: 36.48, lng: -4.98 });
    coordCache.set("p2", { lat: 36.49, lng: -4.99 });
    coordCache.set("p3", { lat: 36.5, lng: -5.0 });

    const orderedStops: IRouteStop[] = [createStop(p1, 0), createStop(p2, 1), createStop(p3, 2)];

    const state: RouteGenerationState = {
      cityId: "city1",
      routeGenerationOptions: { ...DEFAULT_ROUTE_GENERATION_OPTIONS, minPoints: 2 },
      places: [],
      weightedPlaces: [],
      clusters: [],
      seeds: [],
      currentSeed: {
        theme: RouteTheme.HIGHLIGHTS,
        routeMode: RouteMode.WALKING,
        durationBudgetMinutes: 5,
        startPlace: p1,
        cluster: {} as ICluster,
      },
      candidatePlaces: [],
      scoredPlaces: [],
      orderedStops,
      trimmedStops: [],
      builtRoute: null,
      savedRoutes: [],
      error: null,
    };

    const node = makeDurationLimitingNode(coordCache);
    const result = await node(state);

    expect(result.trimmedStops).toBeDefined();
    expect(result.trimmedStops!.length).toBeLessThanOrEqual(orderedStops.length);
    expect(result.trimmedStops!.length).toBeGreaterThanOrEqual(2);
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

    const node = makeDurationLimitingNode(coordCache);
    const result = await node(state);

    expect(result.trimmedStops).toEqual([]);
  });
});
