import { PlaceCategory, RouteTheme } from "@framework/types";
import type { IPlace } from "@framework/types";

import { makePopulateCoordCacheNode } from "./populate-coord-cache.node";
import { WALKING_ROUTE_GENERATION_OPTIONS } from "../../generator.options";
import type { RouteGenerationState } from "../state";

const createPlace = (id: string): IPlace =>
  ({
    id,
    category: PlaceCategory.PARK,
    name: "Test Place",
  }) as unknown as IPlace;

describe("makePopulateCoordCacheNode", () => {
  it("populates coordCache with place coordinates from query", async () => {
    const coordCache = new Map<string, { lat: number; lng: number }>();
    const query = jest.fn().mockResolvedValue([
      { id: "p1", lat: 36.5, lng: -4.9 },
      { id: "p2", lat: 36.51, lng: -4.91 },
    ]);
    const dataSource = { query } as unknown as Parameters<typeof makePopulateCoordCacheNode>[0];

    const state: RouteGenerationState = {
      cityId: "city1",
      location: "Test City",
      theme: RouteTheme.HIGHLIGHTS,
      routeGenerationOptions: WALKING_ROUTE_GENERATION_OPTIONS,
      places: [createPlace("p1"), createPlace("p2")],
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

    const node = makePopulateCoordCacheNode(dataSource, coordCache);
    await node(state);

    expect(coordCache.get("p1")).toEqual({ lat: 36.5, lng: -4.9 });
    expect(coordCache.get("p2")).toEqual({ lat: 36.51, lng: -4.91 });
    expect(query).toHaveBeenCalled();
  });

  it("returns empty object and skips query when places empty", async () => {
    const coordCache = new Map<string, { lat: number; lng: number }>();
    const query = jest.fn();
    const dataSource = { query } as unknown as Parameters<typeof makePopulateCoordCacheNode>[0];

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

    const node = makePopulateCoordCacheNode(dataSource, coordCache);
    const result = await node(state);

    expect(query).not.toHaveBeenCalled();
    expect(result).toEqual({});
    expect(coordCache.size).toBe(0);
  });
});
