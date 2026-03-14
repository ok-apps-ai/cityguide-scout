import { PlaceCategory } from "@framework/types";
import type { IPlace } from "@framework/types";

import { makeSpatialClusteringNode } from "./spatial-clustering.node";
import { WALKING_ROUTE_GENERATION_OPTIONS } from "../../generator.options";
import type { IWeightedPlace, RouteGenerationState } from "../state";

const createPlace = (id: string): IPlace =>
  ({
    id,
    category: PlaceCategory.PARK,
    name: "Test Place",
  }) as unknown as IPlace;

describe("makeSpatialClusteringNode", () => {
  it("returns empty clusters when places empty", async () => {
    const query = jest.fn();
    const dataSource = { query } as unknown as Parameters<typeof makeSpatialClusteringNode>[0];

    const state: RouteGenerationState = {
      cityId: "city1",
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

    const node = makeSpatialClusteringNode(dataSource);
    const result = await node(state);

    expect(result.clusters).toEqual([]);
    expect(query).not.toHaveBeenCalled();
  });

  it("builds clusters from query results", async () => {
    const p1 = createPlace("p1");
    const p2 = createPlace("p2");
    const p3 = createPlace("p3");
    const weightedPlaces: IWeightedPlace[] = [
      { place: p1, weight: 10 },
      { place: p2, weight: 8 },
      { place: p3, weight: 6 },
    ];

    const query = jest
      .fn()
      .mockResolvedValueOnce([
        { id: "p1", cluster_id: 0 },
        { id: "p2", cluster_id: 0 },
        { id: "p3", cluster_id: 0 },
      ])
      .mockResolvedValueOnce([{ lat: 36.5, lng: -4.9 }]);

    const dataSource = { query } as unknown as Parameters<typeof makeSpatialClusteringNode>[0];

    const state: RouteGenerationState = {
      cityId: "city1",
      routeGenerationOptions: WALKING_ROUTE_GENERATION_OPTIONS,
      places: [p1, p2, p3],
      weightedPlaces,
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

    const node = makeSpatialClusteringNode(dataSource);
    const result = await node(state);

    expect(result.clusters).toBeDefined();
    expect(result.clusters).toHaveLength(1);
    expect(result.clusters![0].places).toHaveLength(3);
    expect(result.clusters![0].centroidLat).toBe(36.5);
    expect(result.clusters![0].centroidLng).toBe(-4.9);
    expect(result.clusters![0].seedPlace.id).toEqual("p1");
    expect(query).toHaveBeenCalledTimes(2);
  });

  it("skips rows with null cluster_id", async () => {
    const p1 = createPlace("p1");
    const weightedPlaces: IWeightedPlace[] = [{ place: p1, weight: 10 }];

    const query = jest
      .fn()
      .mockResolvedValueOnce([{ id: "p1", cluster_id: null }])
      .mockResolvedValueOnce([]);

    const dataSource = { query } as unknown as Parameters<typeof makeSpatialClusteringNode>[0];

    const state: RouteGenerationState = {
      cityId: "city1",
      routeGenerationOptions: WALKING_ROUTE_GENERATION_OPTIONS,
      places: [p1],
      weightedPlaces,
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

    const node = makeSpatialClusteringNode(dataSource);
    const result = await node(state);

    expect(result.clusters).toHaveLength(0);
  });
});
