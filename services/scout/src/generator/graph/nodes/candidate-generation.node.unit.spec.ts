import { PlaceCategory, RouteMode, RouteTheme } from "@framework/types";

import {
  makeCandidateGenerationCyclingNode,
  makeCandidateGenerationDrivingNode,
  makeCandidateGenerationNode,
} from "./candidate-generation.node";
import {
  BICYCLING_ROUTE_GENERATION_OPTIONS,
  DRIVING_ROUTE_GENERATION_OPTIONS,
  WALKING_ROUTE_GENERATION_OPTIONS,
} from "../../route-presets";
import type { ICluster, IRouteSeed, RouteGenerationState } from "../state";

const createPlace = (id: string) => ({ id, category: PlaceCategory.PARK }) as unknown as IRouteSeed["startPlace"];

const createSeed = (routeMode: RouteMode): IRouteSeed => ({
  theme: RouteTheme.HIGHLIGHTS,
  routeMode,
  durationBudgetMinutes: 60,
  startPlace: createPlace("p1"),
  cluster: {} as ICluster,
});

/** WALKING is the main/default route generation mode. */
describe("makeCandidateGenerationNode (WALKING)", () => {
  it("calls query with walking radius", async () => {
    const p1 = createPlace("p1");
    const p2 = createPlace("p2");
    const query = jest.fn().mockResolvedValue([{ id: "p1" }, { id: "p2" }]);
    const dataSource = { query } as unknown as Parameters<typeof makeCandidateGenerationNode>[0];

    const state: RouteGenerationState = {
      cityId: "city1",
      location: "Test City",
      theme: RouteTheme.HIGHLIGHTS,
      routeGenerationOptions: { ...WALKING_ROUTE_GENERATION_OPTIONS, minPoints: 2 },
      places: [p1, p2],
      weightedPlaces: [],
      clusters: [],
      seeds: [],
      currentSeed: createSeed(RouteMode.WALKING),
      candidatePlaces: [],
      scoredPlaces: [],
      orderedStops: [],
      trimmedStops: [],
      builtRoute: null,
      savedRoutes: [],
      error: null,
    };

    const node = makeCandidateGenerationNode(dataSource);
    await node(state);

    expect(query).toHaveBeenCalled();
  });

  it("returns candidate places within radius from query", async () => {
    const p1 = createPlace("p1");
    const p2 = createPlace("p2");
    const query = jest.fn().mockResolvedValue([{ id: "p1" }, { id: "p2" }]);
    const dataSource = { query } as unknown as Parameters<typeof makeCandidateGenerationNode>[0];

    const state: RouteGenerationState = {
      cityId: "city1",
      location: "Test City",
      theme: RouteTheme.HIGHLIGHTS,
      routeGenerationOptions: { ...WALKING_ROUTE_GENERATION_OPTIONS, minPoints: 2 },
      places: [p1, p2],
      weightedPlaces: [],
      clusters: [],
      seeds: [],
      currentSeed: createSeed(RouteMode.WALKING),
      candidatePlaces: [],
      scoredPlaces: [],
      orderedStops: [],
      trimmedStops: [],
      builtRoute: null,
      savedRoutes: [],
      error: null,
    };

    const node = makeCandidateGenerationNode(dataSource);
    const result = await node(state);

    expect(result.candidatePlaces).toHaveLength(2);
    expect(query).toHaveBeenCalled();
  });

  it("returns empty when currentSeed is null", async () => {
    const query = jest.fn();
    const dataSource = { query } as unknown as Parameters<typeof makeCandidateGenerationNode>[0];

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

    const node = makeCandidateGenerationNode(dataSource);
    const result = await node(state);

    expect(result.candidatePlaces).toEqual([]);
    expect(query).not.toHaveBeenCalled();
  });

  it("returns empty when fewer than minPoints from query", async () => {
    const p1 = createPlace("p1");
    const query = jest.fn().mockResolvedValue([{ id: "p1" }]);
    const dataSource = { query } as unknown as Parameters<typeof makeCandidateGenerationNode>[0];

    const state: RouteGenerationState = {
      cityId: "city1",
      location: "Test City",
      theme: RouteTheme.HIGHLIGHTS,
      routeGenerationOptions: { ...WALKING_ROUTE_GENERATION_OPTIONS, minPoints: 3 },
      places: [p1],
      weightedPlaces: [],
      clusters: [],
      seeds: [],
      currentSeed: createSeed(RouteMode.WALKING),
      candidatePlaces: [],
      scoredPlaces: [],
      orderedStops: [],
      trimmedStops: [],
      builtRoute: null,
      savedRoutes: [],
      error: null,
    };

    const node = makeCandidateGenerationNode(dataSource);
    const result = await node(state);

    expect(result.candidatePlaces).toEqual([]);
  });
});

/** BICYCLING is supplementary; WALKING is the default. */
describe("makeCandidateGenerationCyclingNode (BICYCLING)", () => {
  it("calls query with cycling radius", async () => {
    const p1 = createPlace("p1");
    const query = jest.fn().mockResolvedValue([{ id: "p1" }]);
    const dataSource = { query } as unknown as Parameters<typeof makeCandidateGenerationCyclingNode>[0];

    const state: RouteGenerationState = {
      cityId: "city1",
      location: "Test City",
      theme: RouteTheme.HIGHLIGHTS,
      routeGenerationOptions: { ...BICYCLING_ROUTE_GENERATION_OPTIONS, minPoints: 1 },
      places: [p1],
      weightedPlaces: [],
      clusters: [],
      seeds: [],
      currentSeed: createSeed(RouteMode.BICYCLING),
      candidatePlaces: [],
      scoredPlaces: [],
      orderedStops: [],
      trimmedStops: [],
      builtRoute: null,
      savedRoutes: [],
      error: null,
    };

    const node = makeCandidateGenerationCyclingNode(dataSource);
    await node(state);

    expect(query).toHaveBeenCalled();
  });
});

/** DRIVING is supplementary; WALKING is the default. */
describe("makeCandidateGenerationDrivingNode (DRIVING)", () => {
  it("calls query with driving radius", async () => {
    const p1 = createPlace("p1");
    const query = jest.fn().mockResolvedValue([{ id: "p1" }]);
    const dataSource = { query } as unknown as Parameters<typeof makeCandidateGenerationDrivingNode>[0];

    const state: RouteGenerationState = {
      cityId: "city1",
      location: "Test City",
      theme: RouteTheme.HIGHLIGHTS,
      routeGenerationOptions: { ...DRIVING_ROUTE_GENERATION_OPTIONS, minPoints: 1 },
      places: [p1],
      weightedPlaces: [],
      clusters: [],
      seeds: [],
      currentSeed: createSeed(RouteMode.DRIVING),
      candidatePlaces: [],
      scoredPlaces: [],
      orderedStops: [],
      trimmedStops: [],
      builtRoute: null,
      savedRoutes: [],
      error: null,
    };

    const node = makeCandidateGenerationDrivingNode(dataSource);
    await node(state);

    expect(query).toHaveBeenCalled();
  });
});
