import { PlaceCategory, PlaceSource, RouteMode, RouteTheme } from "@framework/types";

import { makeResolveOsmPlacesNode } from "./resolve-osm-places.node";
import { WALKING_ROUTE_GENERATION_OPTIONS } from "../../route-presets";
import type { IBuiltRoute, IRouteStop, RouteGenerationState } from "../state";

const createPlace = (id: string, source: PlaceSource) =>
  ({
    id,
    category: PlaceCategory.PARK,
    source,
    name: "Test",
  }) as unknown as IRouteStop["place"];

const createStop = (place: IRouteStop["place"], orderIndex: number): IRouteStop => ({
  place,
  orderIndex,
  visitDurationMinutes: 30,
});

describe("makeResolveOsmPlacesNode", () => {
  it("returns builtRoute unchanged when no OSM places", async () => {
    const p1 = createPlace("p1", PlaceSource.GOOGLE);
    const p2 = createPlace("p2", PlaceSource.GOOGLE);
    const builtRoute: IBuiltRoute = {
      name: "Test",
      theme: RouteTheme.HIGHLIGHTS,
      routeMode: RouteMode.WALKING,
      durationMinutes: 60,
      distanceKm: 2,
      priceLevel: "free" as IBuiltRoute["priceLevel"],
      startPlaceId: "p1",
      routeGeometryWkt: "LINESTRING(0 0, 1 1)",
      stops: [createStop(p1, 0), createStop(p2, 1)],
    };

    const resolveMock = jest.fn();
    const placeOsmResolutionService = {
      resolveOsmPlaceToGoogle: resolveMock,
    } as unknown as Parameters<typeof makeResolveOsmPlacesNode>[0];

    const state: RouteGenerationState = {
      cityId: "city1",
      location: "Test City",
      theme: RouteTheme.HIGHLIGHTS,
      routeGenerationOptions: { ...WALKING_ROUTE_GENERATION_OPTIONS, minPoints: 2 },
      places: [],
      weightedPlaces: [],
      clusters: [],
      seeds: [],
      currentSeed: null,
      candidatePlaces: [],
      scoredPlaces: [],
      orderedStops: [],
      trimmedStops: [],
      builtRoute,
      savedRoutes: [],
      error: null,
    };

    const node = makeResolveOsmPlacesNode(placeOsmResolutionService);
    const result = await node(state);

    expect(resolveMock).not.toHaveBeenCalled();
    expect(result.builtRoute).toBeDefined();
    expect(result.builtRoute!.stops).toHaveLength(2);
  });

  it("resolves OSM places via service and replaces in stops", async () => {
    const osmPlace = createPlace("osm1", PlaceSource.OSM);
    const resolvedPlace = createPlace("google1", PlaceSource.GOOGLE);
    const builtRoute: IBuiltRoute = {
      name: "Test",
      theme: RouteTheme.HIGHLIGHTS,
      routeMode: RouteMode.WALKING,
      durationMinutes: 60,
      distanceKm: 2,
      priceLevel: "free" as IBuiltRoute["priceLevel"],
      startPlaceId: "osm1",
      routeGeometryWkt: "LINESTRING(0 0, 1 1)",
      stops: [createStop(osmPlace, 0)],
    };

    const resolveMock = jest.fn().mockResolvedValue(resolvedPlace);
    const placeOsmResolutionService = {
      resolveOsmPlaceToGoogle: resolveMock,
    } as unknown as Parameters<typeof makeResolveOsmPlacesNode>[0];

    const state: RouteGenerationState = {
      cityId: "city1",
      location: "Test City",
      theme: RouteTheme.HIGHLIGHTS,
      routeGenerationOptions: { ...WALKING_ROUTE_GENERATION_OPTIONS, minPoints: 1 },
      places: [],
      weightedPlaces: [],
      clusters: [],
      seeds: [],
      currentSeed: null,
      candidatePlaces: [],
      scoredPlaces: [],
      orderedStops: [],
      trimmedStops: [],
      builtRoute,
      savedRoutes: [],
      error: null,
    };

    const node = makeResolveOsmPlacesNode(placeOsmResolutionService);
    const result = await node(state);

    expect(resolveMock).toHaveBeenCalledWith(osmPlace);
    expect(result.builtRoute).toBeDefined();
    expect(result.builtRoute!.stops[0].place.id).toEqual("google1");
  });

  it("returns empty object when builtRoute null", async () => {
    const resolveMock = jest.fn();
    const placeOsmResolutionService = {
      resolveOsmPlaceToGoogle: resolveMock,
    } as unknown as Parameters<typeof makeResolveOsmPlacesNode>[0];

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

    const node = makeResolveOsmPlacesNode(placeOsmResolutionService);
    const result = await node(state);

    expect(resolveMock).not.toHaveBeenCalled();
    expect(result).toEqual({});
  });

  it("drops route when resolved stops fewer than minPoints", async () => {
    const osmPlace = createPlace("osm1", PlaceSource.OSM);
    const builtRoute: IBuiltRoute = {
      name: "Test",
      theme: RouteTheme.HIGHLIGHTS,
      routeMode: RouteMode.WALKING,
      durationMinutes: 60,
      distanceKm: 2,
      priceLevel: "free" as IBuiltRoute["priceLevel"],
      startPlaceId: "osm1",
      routeGeometryWkt: "LINESTRING(0 0, 1 1)",
      stops: [createStop(osmPlace, 0)],
    };

    const resolveMock = jest.fn().mockResolvedValue(null);
    const placeOsmResolutionService = {
      resolveOsmPlaceToGoogle: resolveMock,
    } as unknown as Parameters<typeof makeResolveOsmPlacesNode>[0];

    const state: RouteGenerationState = {
      cityId: "city1",
      location: "Test City",
      theme: RouteTheme.HIGHLIGHTS,
      routeGenerationOptions: { ...WALKING_ROUTE_GENERATION_OPTIONS, minPoints: 2 },
      places: [],
      weightedPlaces: [],
      clusters: [],
      seeds: [],
      currentSeed: null,
      candidatePlaces: [],
      scoredPlaces: [],
      orderedStops: [],
      trimmedStops: [],
      builtRoute,
      savedRoutes: [],
      error: null,
    };

    const node = makeResolveOsmPlacesNode(placeOsmResolutionService);
    const result = await node(state);

    expect(result.builtRoute).toBeNull();
    expect(result.currentSeed).toBeNull();
  });
});
