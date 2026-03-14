import { PlaceCategory } from "@framework/types";

import { selectTopClusters, selectCentersNode } from "./select-centers.node";
import { DEFAULT_ROUTE_GENERATION_OPTIONS } from "../../generator.options";
import type { ICluster, IWeightedPlace, RouteGenerationState } from "../state";

const createPlace = (id: string, category: PlaceCategory) => ({ id, category }) as unknown as ICluster["places"][0];

const createCluster = (id: number, places: ICluster["places"], seedPlace: ICluster["places"][0]): ICluster => ({
  id,
  places,
  centroidLat: 0,
  centroidLng: 0,
  seedPlace,
});

describe("selectTopClusters", () => {
  it("returns top clusters by total weight", () => {
    const p1 = createPlace("p1", PlaceCategory.PARK);
    const p2 = createPlace("p2", PlaceCategory.PARK);
    const p3 = createPlace("p3", PlaceCategory.STORE);
    const clusterA = createCluster(0, [p1, p2], p1);
    const clusterB = createCluster(1, [p3], p3);

    const weightedPlaces: IWeightedPlace[] = [
      { place: p1, weight: 10 },
      { place: p2, weight: 8 },
      { place: p3, weight: 2 },
    ];

    const result = selectTopClusters([clusterB, clusterA], weightedPlaces, 2);

    expect(result).toHaveLength(2);
    expect(result[0].id).toEqual(0);
    expect(result[0].places).toHaveLength(2);
    expect(result[1].id).toEqual(1);
  });

  it("returns empty when clusters is empty", () => {
    const result = selectTopClusters([], [], 5);
    expect(result).toHaveLength(0);
  });

  it("uses weight 0 for places not in weightedPlaces", () => {
    const p1 = createPlace("p1", PlaceCategory.PARK);
    const p2 = createPlace("p2", PlaceCategory.PARK);
    const cluster = createCluster(0, [p1, p2], p1);
    const weightedPlaces: IWeightedPlace[] = [{ place: p1, weight: 5 }];

    const result = selectTopClusters([cluster], weightedPlaces, 1);
    expect(result).toHaveLength(1);
    expect(result[0].id).toEqual(0);
  });

  it("limits to maxClusters", () => {
    const p1 = createPlace("p1", PlaceCategory.PARK);
    const cluster1 = createCluster(0, [p1], p1);
    const cluster2 = createCluster(1, [p1], p1);
    const cluster3 = createCluster(2, [p1], p1);
    const weightedPlaces: IWeightedPlace[] = [{ place: p1, weight: 5 }];

    const result = selectTopClusters([cluster1, cluster2, cluster3], weightedPlaces, 2);

    expect(result).toHaveLength(2);
  });
});

describe("selectCentersNode", () => {
  it("returns top clusters from state", async () => {
    const p1 = createPlace("p1", PlaceCategory.PARK);
    const cluster = createCluster(0, [p1], p1);
    const weightedPlaces: IWeightedPlace[] = [{ place: p1, weight: 10 }];

    const state: RouteGenerationState = {
      cityId: "city1",
      routeGenerationOptions: { ...DEFAULT_ROUTE_GENERATION_OPTIONS, maxClusters: 2 },
      places: [],
      weightedPlaces,
      clusters: [cluster],
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

    const result = await selectCentersNode(state);

    expect(result.clusters).toBeDefined();
    expect(result.clusters).toHaveLength(1);
    expect(result.clusters![0].id).toEqual(0);
  });

  it("returns empty clusters when state has no clusters", async () => {
    const state: RouteGenerationState = {
      cityId: "city1",
      routeGenerationOptions: { ...DEFAULT_ROUTE_GENERATION_OPTIONS, maxClusters: 5 },
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

    const result = await selectCentersNode(state);
    expect(result.clusters).toEqual([]);
  });
});
