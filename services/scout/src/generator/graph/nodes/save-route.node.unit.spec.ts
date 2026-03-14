import { EventEmitter2 } from "@nestjs/event-emitter";

import { PlaceCategory, PriceLevel, RouteMode, RouteTheme } from "@framework/types";

import { isRouteWithinConstraints, makeSaveRouteNode } from "./save-route.node";
import { PLACE_ACCEPTED } from "../../../place/place.patterns";
import { DEFAULT_ROUTE_GENERATION_OPTIONS } from "../../generator.options";
import type { IBuiltRoute, IRouteStop, RouteGenerationState } from "../state";

const createPlace = (id: string) =>
  ({
    id,
    category: PlaceCategory.PARK,
    priceLevel: PriceLevel.FREE,
  }) as IBuiltRoute["stops"][0]["place"];

const createStop = (place: IBuiltRoute["stops"][0]["place"], orderIndex: number): IRouteStop => ({
  place,
  orderIndex,
  visitDurationMinutes: 30,
});

const createBuiltRoute = (stops: IRouteStop[], overrides?: Partial<IBuiltRoute>): IBuiltRoute => ({
  name: "Test Route",
  theme: RouteTheme.HIGHLIGHTS,
  routeMode: RouteMode.WALKING,
  durationMinutes: 60,
  distanceKm: 2,
  priceLevel: PriceLevel.FREE,
  startPlaceId: stops[0]?.place.id ?? "p1",
  routeGeometryWkt: "LINESTRING(0 0, 1 1)",
  stops,
  ...overrides,
});

const createEventEmitter = () => {
  const emit = jest.fn();
  return { emit } as unknown as EventEmitter2;
};

describe("isRouteWithinConstraints", () => {
  it("returns true when all constraints satisfied", () => {
    const route = createBuiltRoute([createStop(createPlace("p1"), 0), createStop(createPlace("p2"), 1)]);
    expect(isRouteWithinConstraints(route, DEFAULT_ROUTE_GENERATION_OPTIONS)).toBe(true);
  });

  it("returns false when stops below minPoints", () => {
    const route = createBuiltRoute([createStop(createPlace("p1"), 0)]);
    const options = { ...DEFAULT_ROUTE_GENERATION_OPTIONS, minPoints: 2 };
    expect(isRouteWithinConstraints(route, options)).toBe(false);
  });

  it("returns false when stops above maxPoints", () => {
    const p1 = createPlace("p1");
    const p2 = createPlace("p2");
    const p3 = createPlace("p3");
    const route = createBuiltRoute([createStop(p1, 0), createStop(p2, 1), createStop(p3, 2)]);
    const options = { ...DEFAULT_ROUTE_GENERATION_OPTIONS, maxPoints: 2 };
    expect(isRouteWithinConstraints(route, options)).toBe(false);
  });

  it("returns false when duration below minDurationMinutes", () => {
    const route = createBuiltRoute([createStop(createPlace("p1"), 0), createStop(createPlace("p2"), 1)], {
      durationMinutes: 30,
    });
    const options = { ...DEFAULT_ROUTE_GENERATION_OPTIONS, minDurationMinutes: 60 };
    expect(isRouteWithinConstraints(route, options)).toBe(false);
  });

  it("returns false when duration above maxDurationMinutes", () => {
    const route = createBuiltRoute([createStop(createPlace("p1"), 0), createStop(createPlace("p2"), 1)], {
      durationMinutes: 150,
    });
    const options = { ...DEFAULT_ROUTE_GENERATION_OPTIONS, maxDurationMinutes: 120 };
    expect(isRouteWithinConstraints(route, options)).toBe(false);
  });

  it("returns false when distance below minDistanceKm for route mode", () => {
    const route = createBuiltRoute([createStop(createPlace("p1"), 0), createStop(createPlace("p2"), 1)], {
      routeMode: RouteMode.WALKING,
      distanceKm: 1,
    });
    const options = {
      ...DEFAULT_ROUTE_GENERATION_OPTIONS,
      minDistanceKm: { [RouteMode.WALKING]: 2, [RouteMode.BICYCLING]: 5, [RouteMode.DRIVING]: 10 },
      maxDistanceKm: { [RouteMode.WALKING]: 8, [RouteMode.BICYCLING]: 25, [RouteMode.DRIVING]: 50 },
    };
    expect(isRouteWithinConstraints(route, options)).toBe(false);
  });
});

describe("makeSaveRouteNode", () => {
  it("drops route with 0 stops and does not call routeService.create", async () => {
    const createMock = jest.fn();
    const routeService = { create: createMock } as unknown as Parameters<typeof makeSaveRouteNode>[0];
    const eventEmitter = createEventEmitter();

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
      builtRoute: createBuiltRoute([]),
      savedRoutes: [],
      error: null,
    };

    const node = makeSaveRouteNode(routeService, eventEmitter);
    const result = await node(state);

    expect(createMock).not.toHaveBeenCalled();
    expect(eventEmitter.emit).not.toHaveBeenCalled();
    expect(result.savedRoutes).toBeUndefined();
    expect(result.builtRoute).toBeNull();
    expect(result.currentSeed).toBeNull();
  });

  it("drops route with 1 stop when minPoints is 2", async () => {
    const createMock = jest.fn();
    const routeService = { create: createMock } as unknown as Parameters<typeof makeSaveRouteNode>[0];
    const eventEmitter = createEventEmitter();

    const p1 = createPlace("p1");
    const state: RouteGenerationState = {
      cityId: "city1",
      routeGenerationOptions: { ...DEFAULT_ROUTE_GENERATION_OPTIONS, minPoints: 2 },
      places: [],
      weightedPlaces: [],
      clusters: [],
      seeds: [],
      currentSeed: null,
      candidatePlaces: [],
      scoredPlaces: [],
      orderedStops: [],
      trimmedStops: [],
      builtRoute: createBuiltRoute([createStop(p1, 0)]),
      savedRoutes: [],
      error: null,
    };

    const node = makeSaveRouteNode(routeService, eventEmitter);
    const result = await node(state);

    expect(createMock).not.toHaveBeenCalled();
    expect(eventEmitter.emit).not.toHaveBeenCalled();
    expect(result.savedRoutes).toBeUndefined();
    expect(result.builtRoute).toBeNull();
    expect(result.currentSeed).toBeNull();
  });

  it("saves route with 2+ stops and calls routeService.create", async () => {
    const createMock = jest.fn().mockResolvedValue({ id: "route-123" });
    const routeService = { create: createMock } as unknown as Parameters<typeof makeSaveRouteNode>[0];
    const eventEmitter = createEventEmitter();

    const p1 = createPlace("p1");
    const p2 = createPlace("p2");
    const state: RouteGenerationState = {
      cityId: "city1",
      routeGenerationOptions: {
        ...DEFAULT_ROUTE_GENERATION_OPTIONS,
      },
      places: [],
      weightedPlaces: [],
      clusters: [],
      seeds: [],
      currentSeed: null,
      candidatePlaces: [],
      scoredPlaces: [],
      orderedStops: [],
      trimmedStops: [],
      builtRoute: createBuiltRoute([createStop(p1, 0), createStop(p2, 1)]),
      savedRoutes: [],
      error: null,
    };

    const node = makeSaveRouteNode(routeService, eventEmitter);
    const result = await node(state);

    expect(createMock).toHaveBeenCalledTimes(1);
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        cityId: "city1",
        name: "Test Route",
        theme: RouteTheme.HIGHLIGHTS,
        routeMode: RouteMode.WALKING,
        stops: [
          { placeId: "p1", orderIndex: 0, visitDurationMinutes: 30 },
          { placeId: "p2", orderIndex: 1, visitDurationMinutes: 30 },
        ],
      }),
    );
    expect(eventEmitter.emit).toHaveBeenCalledWith(PLACE_ACCEPTED, { placeIds: ["p1", "p2"] });
    expect(result.savedRoutes).toEqual(["route-123"]);
    expect(result.builtRoute).toBeNull();
    expect(result.currentSeed).toBeNull();
  });

  it("emits PLACE_ACCEPTED with deduplicated place IDs when same place appears multiple times", async () => {
    const createMock = jest.fn().mockResolvedValue({ id: "route-456" });
    const routeService = { create: createMock } as unknown as Parameters<typeof makeSaveRouteNode>[0];
    const eventEmitter = createEventEmitter();

    const p1 = createPlace("p1");
    const p2 = createPlace("p2");
    const state: RouteGenerationState = {
      cityId: "city1",
      routeGenerationOptions: {
        ...DEFAULT_ROUTE_GENERATION_OPTIONS,
        minDistanceKm: {
          [RouteMode.WALKING]: undefined,
          [RouteMode.BICYCLING]: undefined,
          [RouteMode.DRIVING]: undefined,
        },
        maxDistanceKm: {
          [RouteMode.WALKING]: undefined,
          [RouteMode.BICYCLING]: undefined,
          [RouteMode.DRIVING]: undefined,
        },
      },
      places: [],
      weightedPlaces: [],
      clusters: [],
      seeds: [],
      currentSeed: null,
      candidatePlaces: [],
      scoredPlaces: [],
      orderedStops: [],
      trimmedStops: [],
      builtRoute: createBuiltRoute([createStop(p1, 0), createStop(p2, 1), createStop(p1, 2)]),
      savedRoutes: [],
      error: null,
    };

    const node = makeSaveRouteNode(routeService, eventEmitter);
    await node(state);

    expect(eventEmitter.emit).toHaveBeenCalledWith(PLACE_ACCEPTED, { placeIds: ["p1", "p2"] });
  });

  it("drops route when duration or distance is out of range", async () => {
    const createMock = jest.fn();
    const routeService = { create: createMock } as unknown as Parameters<typeof makeSaveRouteNode>[0];
    const eventEmitter = createEventEmitter();

    const p1 = createPlace("p1");
    const p2 = createPlace("p2");
    const state: RouteGenerationState = {
      cityId: "city1",
      routeGenerationOptions: {
        ...DEFAULT_ROUTE_GENERATION_OPTIONS,
        minDurationMinutes: 60,
        maxDurationMinutes: 120,
      },
      places: [],
      weightedPlaces: [],
      clusters: [],
      seeds: [],
      currentSeed: null,
      candidatePlaces: [],
      scoredPlaces: [],
      orderedStops: [],
      trimmedStops: [],
      builtRoute: createBuiltRoute([createStop(p1, 0), createStop(p2, 1)], {
        durationMinutes: 30,
        distanceKm: 0.5,
      }),
      savedRoutes: [],
      error: null,
    };

    const node = makeSaveRouteNode(routeService, eventEmitter);
    const result = await node(state);

    expect(createMock).not.toHaveBeenCalled();
    expect(eventEmitter.emit).not.toHaveBeenCalled();
    expect(result.savedRoutes).toBeUndefined();
  });

  it("returns empty object when builtRoute is null", async () => {
    const createMock = jest.fn();
    const routeService = { create: createMock } as unknown as Parameters<typeof makeSaveRouteNode>[0];
    const eventEmitter = createEventEmitter();

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

    const node = makeSaveRouteNode(routeService, eventEmitter);
    const result = await node(state);

    expect(createMock).not.toHaveBeenCalled();
    expect(eventEmitter.emit).not.toHaveBeenCalled();
    expect(result).toEqual({});
  });
});
